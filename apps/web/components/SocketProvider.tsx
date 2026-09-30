"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Backend realtime events (rooms `tenant:{id}` + `user:{id}`, every payload
 * carries `tenantId`). Server authenticates the handshake via JWT passed as
 * `auth.token` (or an Authorization header).
 */
export const REALTIME_EVENTS = [
  "trip:status_changed",
  "trip:delayed",
  "trip:position_updated",
  "bus:status_changed",
  "alert:ai_event",
  "notification:new",
  "geofence:triggered",
] as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[number];

export interface LastEvent {
  payload: unknown;
  at: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  lastEvents: Partial<Record<string, LastEvent>>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  lastEvents: {},
});

/** Strip a trailing `/api/v1` so the socket connects to the server root. */
export function resolveSocketUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  return api.replace(/\/api\/v1\/?$/, "") || "http://localhost:4000";
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvents, setLastEvents] = useState<Partial<Record<string, LastEvent>>>({});

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("seum_access_token")
        : null;

    const s = io(resolveSocketUrl(), {
      path: "/socket.io",
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    const record = (event: string) => (payload: unknown) => {
      setLastEvents((prev) => ({
        ...prev,
        [event]: { payload, at: new Date().toISOString() },
      }));
    };

    const recorders = REALTIME_EVENTS.map((event) => {
      const fn = record(event);
      s.on(event, fn);
      return { event, fn };
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    setSocket(s);
    return () => {
      recorders.forEach(({ event, fn }) => s.off(event, fn));
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const value = useMemo(
    () => ({ socket, connected, lastEvents }),
    [socket, connected, lastEvents]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

/**
 * Subscribe to one realtime event on the shared socket. The handler ref is
 * kept fresh so callers can pass inline closures without resubscribing.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void
): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback((payload: T) => {
    handlerRef.current(payload);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on(event, stableHandler);
    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event, stableHandler]);
}
