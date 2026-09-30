import { describe, it, expect } from "vitest";
import {
  getBusMarkerStatus,
  getBusMarkerColor,
  BUS_MARKER_COLORS,
  isDelayedStatus,
} from "@/lib/busStatus";

const NOW = new Date("2026-09-16T12:00:00Z").getTime();
const fresh = new Date(NOW - 60 * 1000).toISOString();
const stale = new Date(NOW - 10 * 60 * 1000).toISOString();

describe("isDelayedStatus", () => {
  it("detects delay-like statuses", () => {
    expect(isDelayedStatus("delayed")).toBe(true);
    expect(isDelayedStatus("Delayed")).toBe(true);
    expect(isDelayedStatus(null)).toBe(false);
    expect(isDelayedStatus("en_route")).toBe(false);
  });
});

describe("getBusMarkerStatus", () => {
  it("marks stale positions offline", () => {
    expect(getBusMarkerStatus({ recordedAt: stale, speedKmh: 60 }, NOW)).toBe("offline");
    expect(getBusMarkerStatus({ speedKmh: 60 }, NOW)).toBe("offline");
  });

  it("marks fresh zero-speed buses stopped", () => {
    expect(getBusMarkerStatus({ recordedAt: fresh, speedKmh: 0 }, NOW)).toBe("stopped");
  });

  it("marks delayed trips delayed", () => {
    expect(
      getBusMarkerStatus({ recordedAt: fresh, speedKmh: 55, tripStatus: "delayed" }, NOW)
    ).toBe("delayed");
  });

  it("marks moving on-time buses on_time", () => {
    expect(
      getBusMarkerStatus({ recordedAt: fresh, speedKmh: 55, tripStatus: "en_route" }, NOW)
    ).toBe("on_time");
  });
});

describe("getBusMarkerColor", () => {
  it("returns the documented palette color per status", () => {
    expect(getBusMarkerColor({ recordedAt: fresh, speedKmh: 50 }, NOW)).toBe(
      BUS_MARKER_COLORS.on_time
    );
    expect(getBusMarkerColor({ recordedAt: stale }, NOW)).toBe(BUS_MARKER_COLORS.offline);
  });
});
