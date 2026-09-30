import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { JwtPayload } from '../middleware/auth';

/**
 * Phase 9.1 — Socket.IO realtime core.
 *
 * Room model:
 *   - `tenant:{tenantId}` — every authenticated socket joins its tenant room.
 *     Tenant-scoped broadcasts (trip/bus/AI/GPS events) go here.
 *   - `user:{userId}` — every authenticated socket joins its own user room.
 *     Personal pushes (`notification:new`) go here.
 *
 * Frontend event contract (keep these names EXACTLY):
 *   `trip:status_changed`, `trip:delayed`, `trip:position_updated`,
 *   `bus:status_changed`, `alert:ai_event`, `notification:new`.
 * Payloads always include `tenantId` (helpers inject it when missing).
 *
 * Horizontal scaling (Redis adapter):
 *   When `REDIS_URL` is set (e.g. `redis://localhost:6379` — production VPS),
 *   `initSocketIO()` attaches `@socket.io/redis-adapter` + `ioredis` pub/sub
 *   so emits fan out across API instances. Without `REDIS_URL` (local dev,
 *   tests) the server runs single-instance — same emit helpers, no behaviour
 *   change. All emit helpers go through `getIO()` / room emits, which is the
 *   "emit bus" seam later phases (GPS/AI) reuse via `emitToTenant`,
 *   `emitToUser`, or the generic `emitToRoom`.
 */

export const REALTIME_EVENTS = {
  TRIP_STATUS_CHANGED: 'trip:status_changed',
  TRIP_DELAYED: 'trip:delayed',
  TRIP_POSITION_UPDATED: 'trip:position_updated',
  BUS_STATUS_CHANGED: 'bus:status_changed',
  AI_EVENT: 'alert:ai_event',
  NOTIFICATION_NEW: 'notification:new',
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export interface SocketAuthData {
  userId: string;
  tenantId: string;
  roles: string[];
}

let io: Server | null = null;

/** Room name helpers (exported so tests/other modules stay consistent). */
export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Verify a JWT access token with the same secret as the Express `authenticate`
 * middleware and normalize it to SocketAuthData. Throws on invalid/expired.
 */
export function verifySocketToken(token: string): SocketAuthData {
  const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  const userId = payload.userId || payload.id;
  const tenantId = payload.tenantId;
  if (!userId || !tenantId) {
    throw new Error('Token missing userId/tenantId');
  }
  return { userId, tenantId, roles: Array.isArray(payload.roles) ? payload.roles : [] };
}

/** Pull the bearer token from handshake auth payload or Authorization header. */
export function extractSocketToken(handshake: {
  auth?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}): string | null {
  const fromAuth = handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;

  const header = handshake.headers?.authorization;
  const headerValue = Array.isArray(header) ? header[0] : header;
  if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
    const token = headerValue.slice('Bearer '.length).trim();
    if (token && token !== 'null' && token !== 'undefined') return token;
  }
  return null;
}

/**
 * Socket.IO handshake middleware. Unit-testable without network:
 * pass a mock `{ handshake, data }` socket and a `next` callback.
 */
export function authenticateSocket(
  socket: { handshake: Parameters<typeof extractSocketToken>[0]; data?: Record<string, unknown> },
  next: (err?: Error) => void,
): void {
  const token = extractSocketToken(socket.handshake);
  if (!token) {
    next(new Error('Authentication error: missing token'));
    return;
  }
  try {
    const auth = verifySocketToken(token);
    if (socket.data) {
      socket.data.auth = auth;
    } else {
      (socket as { data: Record<string, unknown> }).data = { auth };
    }
    next();
  } catch {
    next(new Error('Authentication error: invalid or expired token'));
  }
}

/** Create + configure the Socket.IO server on an existing HTTP server. */
export function initSocketIO(httpServer: HttpServer): Server | null {
  try {
    const server = new Server(httpServer, {
      cors: { origin: config.cors.origin as string | string[], credentials: true },
    });

    // Horizontal scaling: attach the Redis adapter only when REDIS_URL is
    // set (production VPS). Local dev / tests run single-instance.
    if (process.env.REDIS_URL) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createAdapter } = require('@socket.io/redis-adapter');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Redis } = require('ioredis');
        const pubClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
        const subClient = pubClient.duplicate();
        void Promise.all([pubClient.connect(), subClient.connect()])
          .then(() => {
            server.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter attached (multi-instance mode)');
          })
          .catch((redisErr: unknown) => {
            logger.warn({ err: redisErr }, 'Redis adapter failed; continuing single-instance');
          });
      } catch (redisErr) {
        logger.warn({ err: redisErr }, 'Redis packages unavailable; continuing single-instance');
      }
    }

    server.use(authenticateSocket as (socket: Socket, next: (err?: Error) => void) => void);

    server.on('connection', (socket: Socket) => {
      const auth = (socket.data as { auth?: SocketAuthData }).auth;
      if (!auth) {
        logger.warn({ socketId: socket.id }, 'Socket connected without auth data; disconnecting');
        socket.disconnect(true);
        return;
      }
      const rooms = [tenantRoom(auth.tenantId), userRoom(auth.userId)];
      void Promise.all(rooms.map((room) => socket.join(room))).catch((err) => {
        logger.error({ err, socketId: socket.id }, 'Failed to join realtime rooms');
      });
      logger.info({ socketId: socket.id, userId: auth.userId, tenantId: auth.tenantId }, 'Realtime client connected');

      socket.on('disconnect', (reason) => {
        logger.info({ socketId: socket.id, reason }, 'Realtime client disconnected');
      });
    });

    io = server;
    logger.info('Socket.IO realtime server initialized');
    return server;
  } catch (err) {
    // Realtime is optional: never crash the API when Socket.IO fails to init.
    logger.warn({ err }, 'Socket.IO failed to initialize; realtime emits disabled');
    io = null;
    return null;
  }
}

/** Accessor — returns null when Socket.IO is not initialized (safe for services). */
export function getIO(): Server | null {
  return io;
}

export function isRealtimeReady(): boolean {
  return io !== null;
}

/** Test-only reset so unit tests can assert no-op behaviour deterministically. */
export function __resetIOForTests(): void {
  io = null;
}

function withTenant(payload: unknown, tenantId: string): unknown {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (record.tenantId === undefined) return { ...record, tenantId };
  }
  return payload;
}

/**
 * Emit to every socket in a tenant room. No-op (never throws) when
 * Socket.IO is uninitialized so services stay crash-safe.
 */
export function emitToTenant(tenantId: string, event: string, payload: unknown): void {
  try {
    if (!io) return;
    io.to(tenantRoom(tenantId)).emit(event, withTenant(payload, tenantId));
  } catch (err) {
    logger.warn({ err, tenantId, event }, 'emitToTenant failed');
  }
}

/** Emit to a single user's room. No-op (never throws) when uninitialized. */
export function emitToUser(tenantId: string, userId: string, event: string, payload: unknown): void {
  try {
    if (!io) return;
    io.to(userRoom(userId)).emit(event, withTenant(payload, tenantId));
  } catch (err) {
    logger.warn({ err, tenantId, userId, event }, 'emitToUser failed');
  }
}

/**
 * Generic room emit — the seam later GPS (`trip:position_updated`) and AI
 * (`alert:ai_event`) modules use. No-op (never throws) when uninitialized.
 */
export function emitToRoom(room: string, event: string, payload: unknown): void {
  try {
    if (!io) return;
    io.to(room).emit(event, payload);
  } catch (err) {
    logger.warn({ err, room, event }, 'emitToRoom failed');
  }
}
