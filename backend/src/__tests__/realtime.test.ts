import jwt from 'jsonwebtoken';
import { config } from '../config';
import {
  REALTIME_EVENTS,
  __resetIOForTests,
  authenticateSocket,
  emitToRoom,
  emitToTenant,
  emitToUser,
  extractSocketToken,
  getIO,
  isRealtimeReady,
  tenantRoom,
  userRoom,
  verifySocketToken,
} from '../realtime/socket';

beforeEach(() => {
  __resetIOForTests();
});

describe('realtime event contract', () => {
  it('keeps frontend event names exactly', () => {
    expect(REALTIME_EVENTS.TRIP_STATUS_CHANGED).toBe('trip:status_changed');
    expect(REALTIME_EVENTS.TRIP_DELAYED).toBe('trip:delayed');
    expect(REALTIME_EVENTS.TRIP_POSITION_UPDATED).toBe('trip:position_updated');
    expect(REALTIME_EVENTS.BUS_STATUS_CHANGED).toBe('bus:status_changed');
    expect(REALTIME_EVENTS.AI_EVENT).toBe('alert:ai_event');
    expect(REALTIME_EVENTS.NOTIFICATION_NEW).toBe('notification:new');
  });

  it('builds tenant/user room names', () => {
    expect(tenantRoom('t1')).toBe('tenant:t1');
    expect(userRoom('u1')).toBe('user:u1');
  });
});

describe('emit helpers when uninitialized', () => {
  it('getIO() is null and realtime is not ready', () => {
    expect(getIO()).toBeNull();
    expect(isRealtimeReady()).toBe(false);
  });

  it('emitToTenant no-ops safely without throwing', () => {
    expect(() =>
      emitToTenant('t1', REALTIME_EVENTS.TRIP_STATUS_CHANGED, { tenantId: 't1', tripId: 'tr1', status: 'en_route' }),
    ).not.toThrow();
  });

  it('emitToUser no-ops safely without throwing', () => {
    expect(() =>
      emitToUser('t1', 'u1', REALTIME_EVENTS.NOTIFICATION_NEW, { tenantId: 't1', title: 'Hi' }),
    ).not.toThrow();
  });

  it('emitToRoom (GPS/AI seam) no-ops safely without throwing', () => {
    expect(() =>
      emitToRoom('tenant:t1', REALTIME_EVENTS.TRIP_POSITION_UPDATED, { tenantId: 't1' }),
    ).not.toThrow();
    expect(() =>
      emitToRoom('tenant:t1', REALTIME_EVENTS.AI_EVENT, { tenantId: 't1' }),
    ).not.toThrow();
  });
});

describe('socket auth middleware (no network)', () => {
  function mockSocket(handshake: Parameters<typeof extractSocketToken>[0]) {
    return { handshake, data: {} as Record<string, unknown> };
  }

  it('rejects a missing token', () => {
    const socket = mockSocket({ auth: {}, headers: {} });
    const next = jest.fn();
    authenticateSocket(socket, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/missing token/);
  });

  it('rejects an invalid token', () => {
    const socket = mockSocket({ auth: { token: 'not-a-real-token' }, headers: {} });
    const next = jest.fn();
    authenticateSocket(socket, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/invalid or expired/);
  });

  it('accepts a valid JWT from auth.token and attaches {userId, tenantId, roles}', () => {
    const token = jwt.sign(
      { userId: 'u1', tenantId: 't1', roles: ['ops_manager'] },
      config.jwt.accessSecret,
      { expiresIn: '5m' },
    );
    const socket = mockSocket({ auth: { token }, headers: {} });
    const next = jest.fn();
    authenticateSocket(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.auth).toEqual({ userId: 'u1', tenantId: 't1', roles: ['ops_manager'] });
  });

  it('accepts a valid JWT from the Authorization header', () => {
    const token = jwt.sign(
      { userId: 'u9', tenantId: 't9', roles: [] },
      config.jwt.accessSecret,
      { expiresIn: '5m' },
    );
    const socket = mockSocket({ auth: {}, headers: { authorization: `Bearer ${token}` } });
    const next = jest.fn();
    authenticateSocket(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.auth).toMatchObject({ userId: 'u9', tenantId: 't9' });
  });
});

describe('token helpers', () => {
  it('extractSocketToken prefers auth.token then Authorization header', () => {
    expect(extractSocketToken({ auth: { token: 'abc' }, headers: {} })).toBe('abc');
    expect(extractSocketToken({ auth: {}, headers: { authorization: 'Bearer xyz' } })).toBe('xyz');
    expect(extractSocketToken({ auth: {}, headers: {} })).toBeNull();
  });

  it('verifySocketToken throws on garbage and on tokens missing tenant scope', () => {
    expect(() => verifySocketToken('garbage')).toThrow();
    const scopeLess = jwt.sign({ userId: 'u1' }, config.jwt.accessSecret, { expiresIn: '5m' });
    expect(() => verifySocketToken(scopeLess)).toThrow();
  });
});
