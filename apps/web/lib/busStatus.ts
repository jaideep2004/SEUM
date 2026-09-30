/**
 * Pure helpers that derive a bus marker status + color for the live map.
 *
 * Heuristic (documented for the control room):
 * - `offline` — no position newer than OFFLINE_AFTER_MS (default 5 min).
 * - `stopped` — fresh position but speed is ~0 km/h (<= STOPPED_SPEED_KMH).
 * - `delayed` — the linked trip reports a delayed / delay-like status.
 * - `on_time` — everything else (fresh position, moving, trip not delayed).
 */

export type BusMarkerStatus = "on_time" | "delayed" | "stopped" | "offline";

export interface BusPositionLike {
  speedKmh?: number | null;
  status?: string | null;
  tripStatus?: string | null;
  recordedAt?: string | null;
}

export const OFFLINE_AFTER_MS = 5 * 60 * 1000;
export const STOPPED_SPEED_KMH = 1;

const DELAYED_TOKENS = ["delay", "late", "behind"];

export function isDelayedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return DELAYED_TOKENS.some((t) => s.includes(t));
}

export function getBusMarkerStatus(
  bus: BusPositionLike,
  now: number = Date.now()
): BusMarkerStatus {
  const recorded = bus.recordedAt ? new Date(bus.recordedAt).getTime() : NaN;
  if (!bus.recordedAt || Number.isNaN(recorded) || now - recorded > OFFLINE_AFTER_MS) {
    return "offline";
  }
  const speed = typeof bus.speedKmh === "number" ? bus.speedKmh : null;
  if (speed !== null && speed <= STOPPED_SPEED_KMH) return "stopped";
  if (isDelayedStatus(bus.status) || isDelayedStatus(bus.tripStatus)) return "delayed";
  return "on_time";
}

export const BUS_MARKER_COLORS: Record<BusMarkerStatus, string> = {
  on_time: "#10b981",
  delayed: "#f59e0b",
  stopped: "#ef4444",
  offline: "#9ca3af",
};

export function getBusMarkerColor(bus: BusPositionLike, now: number = Date.now()): string {
  return BUS_MARKER_COLORS[getBusMarkerStatus(bus, now)];
}
