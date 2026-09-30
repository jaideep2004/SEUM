const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  transaction: (fn: any) => fn({ query: mockQuery, queryOne: mockQueryOne }),
}));

import { ValidationError, NotFoundError } from "../utils/errors";
import {
  DEFAULT_SPEED_THRESHOLD_KMH,
  _resetGpsMemory,
  checkDeviation,
  checkOverspeed,
  haversineMeters,
  ingestPosition,
  isValidLatitude,
  isValidLongitude,
  minDistanceToCorridorMeters,
  pointInPolygon,
  pointToSegmentDistanceMeters,
  resolveSpeedThreshold,
  validatePositionInput,
} from "../services/gpsService";

const TID = "tenant-1";
const BID = "bus-1";

function makePositionRow(overrides: Record<string, any> = {}) {
  return {
    id: "pos-1", tenant_id: TID, bus_id: BID, trip_id: null,
    device_id: "dev-1", latitude: 21.42, longitude: 39.82,
    speed_kmh: 60, heading: 90, altitude: null,
    recorded_at: "2026-09-16T10:00:00Z", ignition_status: "on",
    odometer_reading: 12345, created_at: "2026-09-16T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { jest.resetAllMocks(); _resetGpsMemory(); });

describe("coordinate validation", () => {
  it("accepts valid lat/lng", () => {
    expect(isValidLatitude(21.42)).toBe(true);
    expect(isValidLongitude(39.82)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it("rejects out-of-range coords", () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(NaN)).toBe(false);
    expect(isValidLatitude("21" as any)).toBe(false);
  });

  it("validatePositionInput throws ValidationError on bad coords", () => {
    expect(() =>
      validatePositionInput({ busId: BID, deviceId: "d", latitude: 120, longitude: 39 })
    ).toThrow(ValidationError);
    expect(() =>
      validatePositionInput({ busId: BID, deviceId: "d", latitude: 21, longitude: 39, speedKmh: -5 })
    ).toThrow(ValidationError);
  });

  it("ingestPosition rejects bad coords before touching the bus lookup", async () => {
    await expect(
      ingestPosition(TID, { busId: BID, deviceId: "d", latitude: 999, longitude: 39 })
    ).rejects.toThrow(ValidationError);
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it("ingestPosition throws NotFoundError for unknown bus", async () => {
    mockQueryOne.mockResolvedValueOnce(null); // bus lookup
    await expect(
      ingestPosition(TID, { busId: BID, deviceId: "d", latitude: 21, longitude: 39 })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("pointInPolygon (ray casting)", () => {
  // Square around [0,0]: lng/lat pairs
  const square: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  it("detects inside points", () => {
    expect(pointInPolygon(0, 0, square)).toBe(true);
    expect(pointInPolygon(0.9, 0.9, square)).toBe(true);
  });
  it("detects outside points", () => {
    expect(pointInPolygon(2, 0, square)).toBe(false);
    expect(pointInPolygon(0, 5, square)).toBe(false);
  });
  it("returns false for degenerate polygons", () => {
    expect(pointInPolygon(0, 0, [[0, 0], [1, 1]] as any)).toBe(false);
    expect(pointInPolygon(0, 0, [] as any)).toBe(false);
  });
});

describe("haversine", () => {
  it("is ~111km per degree of latitude", () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(112000);
  });
  it("is zero for identical points", () => {
    expect(haversineMeters(21.4, 39.8, 21.4, 39.8)).toBe(0);
  });
  it("point-to-segment is ~0 on the line, large off it", () => {
    const onLine = pointToSegmentDistanceMeters(0.5, 0, 0, 0, 1, 0);
    expect(onLine).toBeLessThan(1);
    const offLine = pointToSegmentDistanceMeters(0.5, 1, 0, 0, 1, 0);
    expect(offLine).toBeGreaterThan(100000);
  });
});

describe("resolveSpeedThreshold", () => {
  it("prefers bus override over route setting over default", () => {
    expect(resolveSpeedThreshold(80, 90)).toBe(80);
    expect(resolveSpeedThreshold(null, 90)).toBe(90);
    expect(resolveSpeedThreshold(null, null)).toBe(DEFAULT_SPEED_THRESHOLD_KMH);
    expect(resolveSpeedThreshold(undefined, undefined)).toBe(100);
  });
});

describe("checkDeviation", () => {
  it("skips when the trip has no route/corridor context", async () => {
    const res = await checkDeviation(TID, {
      busId: BID, tripId: null, routeId: null, latitude: 21, longitude: 39,
    });
    expect(res.checked).toBe(false);
    expect(res.reason).toBe("no-trip");
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it("skips when the route has no corridor (honest no-corridor path)", async () => {
    mockQueryOne.mockResolvedValueOnce({ corridor: null }); // routes lookup
    const res = await checkDeviation(TID, {
      busId: BID, tripId: "trip-1", routeId: "route-1", latitude: 21, longitude: 39,
    });
    expect(res.checked).toBe(false);
    expect(res.reason).toBe("no-corridor");
  });

  it("flags deviation beyond tolerance and stays quiet inside it", async () => {
    const corridor: [number, number][] = [[39.0, 21.0], [40.0, 21.0]];
    // Far from corridor (~150km north)
    mockQueryOne
      .mockResolvedValueOnce({ corridor }) // routes lookup
      .mockResolvedValueOnce({ deviation_tolerance_meters: 300, deviation_tolerance_minutes: 10 });
    mockQuery.mockResolvedValueOnce([]); // notifyTenantUsers user lookup
    const far = await checkDeviation(TID, {
      busId: BID, tripId: "trip-1", routeId: "route-1", latitude: 22.5, longitude: 39.5,
    });
    expect(far.checked).toBe(true);
    expect(far.deviated).toBe(true);
    expect(far.distanceMeters).toBeGreaterThan(300);

    // On the corridor
    mockQueryOne
      .mockResolvedValueOnce({ corridor })
      .mockResolvedValueOnce({ deviation_tolerance_meters: 300, deviation_tolerance_minutes: 10 });
    const near = await checkDeviation(TID, {
      busId: BID, tripId: "trip-1", routeId: "route-1", latitude: 21.0, longitude: 39.5,
    });
    expect(near.checked).toBe(true);
    expect(near.deviated).toBe(false);
    expect(near.distanceMeters).toBeLessThan(300);
  });
});

describe("minDistanceToCorridorMeters", () => {
  it("returns null without a usable corridor", () => {
    expect(minDistanceToCorridorMeters(21, 39, null)).toBeNull();
    expect(minDistanceToCorridorMeters(21, 39, [])).toBeNull();
    expect(minDistanceToCorridorMeters(21, 39, [[39, 21]])).toBeNull();
  });
});

describe("checkOverspeed", () => {
  it("returns null when speed is missing or under threshold", async () => {
    expect(await checkOverspeed(TID, {
      busId: BID, tripId: null, routeId: null, driverId: null,
      latitude: 21, longitude: 39, speedKmh: null,
    })).toBeNull();

    mockQueryOne
      .mockResolvedValueOnce(null) // no bus override
      // no routeId → no route lookup
    const under = await checkOverspeed(TID, {
      busId: BID, tripId: null, routeId: null, driverId: null,
      latitude: 21, longitude: 39, speedKmh: 60,
    });
    expect(under).toBeNull();
  });

  it("records an event when speed exceeds the default 100 km/h", async () => {
    mockQueryOne.mockResolvedValueOnce(null); // no bus override
    mockQuery
      .mockResolvedValueOnce([{ id: "ev-1" }]) // INSERT overspeed_events RETURNING
      .mockResolvedValueOnce([]); // notify user lookup
    const event = await checkOverspeed(TID, {
      busId: BID, tripId: null, routeId: null, driverId: null,
      latitude: 21, longitude: 39, speedKmh: 130,
    });
    expect(event).toMatchObject({ id: "ev-1" });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertSql: string = mockQuery.mock.calls[0][0];
    expect(insertSql).toMatch(/overspeed_events/);
  });

  it("uses the bus override threshold when present", async () => {
    mockQueryOne.mockResolvedValueOnce({ threshold_kmh: 140 }); // bus override
    // 130 < 140 → no event, no insert
    const res = await checkOverspeed(TID, {
      busId: BID, tripId: null, routeId: null, driverId: null,
      latitude: 21, longitude: 39, speedKmh: 130,
    });
    expect(res).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("ingestPosition pipeline", () => {
  it("inserts the position and never fails when checks fail", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BID }) // bus exists
      .mockResolvedValueOnce({ id: "trip-1", route_id: null, driver_id: null }); // active trip
    mockQuery.mockResolvedValueOnce([makePositionRow()]); // INSERT position
    // Downstream check queries hit exhausted mocks (undefined/rejected) —
    // ingest must swallow those failures and still return the position.
    mockQueryOne.mockRejectedValueOnce(new Error("db down")); // overspeed threshold lookup
    const pos = await ingestPosition(TID, {
      busId: BID, deviceId: "dev-1", latitude: 21.42, longitude: 39.82, speedKmh: 60,
    });
    expect(pos.busId).toBe(BID);
    expect(pos.latitude).toBe(21.42);
  });
});

describe("gps validators", () => {
  const { ingestPositionSchema, createGeofenceSchema } = require("../validators/gps");

  it("rejects bad ingest coords", () => {
    expect(() =>
      ingestPositionSchema.parse({ busId: BID, deviceId: "d", latitude: 200, longitude: 39 })
    ).toThrow();
  });

  it("requires polygon or circle for geofences", () => {
    expect(() => createGeofenceSchema.parse({ name: "x", type: "depot" })).toThrow();
    const poly = createGeofenceSchema.parse({
      name: "depot", type: "depot",
      coordinates: [[0, 0], [1, 0], [1, 1]],
    });
    expect(poly.coordinates).toHaveLength(3);
    const circle = createGeofenceSchema.parse({
      name: "hub", type: "terminal", centerLat: 21, centerLng: 39, radiusMeters: 500,
    });
    expect(circle.radiusMeters).toBe(500);
  });
});
