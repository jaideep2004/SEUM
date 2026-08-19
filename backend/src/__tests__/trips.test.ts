import { NotFoundError, ConflictError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  transaction: (fn: any) => fn({ query: mockQuery, queryOne: mockQueryOne }),
}));

jest.mock("../services/customerCommunicationService", () => ({
  sendTripDelayAlerts: () => Promise.resolve(undefined),
}));

import {
  createTrip, listTrips, getTripById, updateTrip, cancelTrip,
  startTrip, completeTrip, delayTrip,
  addPassenger, removePassenger, getTripCalendar,
} from "../services/tripService";

const TID = "tenant-1";
const UID = "user-1";
const RID = "route-1";
const BID = "bus-1";
const TRIP_ID = "trip-1";
const PASS_ID = "pass-1";

function makeTripRow(overrides: Record<string, any> = {}) {
  return {
    id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, driver_id: null,
    trip_type: "regular", scheduled_date: "2026-07-20",
    scheduled_start_time: "08:00:00", scheduled_end_time: "12:00:00",
    actual_start_time: null, actual_end_time: null,
    status: "scheduled", delay_minutes: null, delay_reason: null,
    notes: null, rejection_reason: null,
    created_by: UID, approved_by: null,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function makePassRow(overrides: Record<string, any> = {}) {
  return {
    id: PASS_ID, trip_id: TRIP_ID, passenger_name: "Ahmed",
    passenger_id_number: "ID-001", contact_number: "+966500000000",
    seat_number: "1A", booking_reference: "BK-001",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { jest.resetAllMocks(); });

describe("createTrip", () => {
  it("creates a trip successfully", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: RID })      // route exists
      .mockResolvedValueOnce({ id: BID })      // bus exists
      .mockResolvedValueOnce(makeTripRow());   // getTripById row
    mockQuery
      .mockResolvedValueOnce([makeTripRow()])  // INSERT RETURNING (inside transaction)
      .mockResolvedValueOnce([])               // stops
      .mockResolvedValueOnce([])               // passengers
      .mockResolvedValueOnce([]);              // legs

    const result = await createTrip(TID, UID, {
      routeId: RID, busId: BID, tripType: "single",
      scheduledDate: "2026-07-20", scheduledStartTime: "08:00",
    });
    expect(result.status).toBe("scheduled");
    expect(mockQueryOne).toHaveBeenCalledTimes(3);
  });

  it("creates a round trip with legs", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: RID })
      .mockResolvedValueOnce({ id: BID })
      .mockResolvedValueOnce(makeTripRow({ trip_type: "round", trip_title: "Hajj Group 12" }));
    mockQuery
      .mockResolvedValueOnce([makeTripRow({ trip_type: "round" })]) // INSERT trip
      .mockResolvedValueOnce(undefined)                             // INSERT leg 1
      .mockResolvedValueOnce(undefined)                             // INSERT leg 2
      .mockResolvedValueOnce([])                                    // stops
      .mockResolvedValueOnce([])                                    // passengers
      .mockResolvedValueOnce([
        { id: "leg-1", trip_id: TRIP_ID, leg_no: 1, origin: "Jeddah", destination: "Madinah", leg_date: "2026-08-01", departure_time: "08:00", arrival_time: null, overnight_flag: false, notes: null },
        { id: "leg-2", trip_id: TRIP_ID, leg_no: 2, origin: "Madinah", destination: "Makkah", leg_date: "2026-08-03", departure_time: "09:00", arrival_time: null, overnight_flag: true, notes: null },
      ]);

    const result = await createTrip(TID, UID, {
      routeId: RID, busId: BID, tripType: "round",
      scheduledDate: "2026-08-01", scheduledStartTime: "08:00",
      tripTitle: "Hajj Group 12",
      legs: [
        { origin: "Jeddah", destination: "Madinah", legDate: "2026-08-01", departureTime: "08:00" },
        { origin: "Madinah", destination: "Makkah", legDate: "2026-08-03", departureTime: "09:00", overnightFlag: true },
      ],
    });
    expect(result.tripType).toBe("round");
    expect(result.tripTitle).toBe("Hajj Group 12");
    expect(result.legCount).toBe(2);
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(createTrip(TID, UID, { routeId: RID, busId: BID, tripType: "single", scheduledDate: "2026-07-20", scheduledStartTime: "08:00" }))
      .rejects.toThrow(NotFoundError);
  });
});

describe("listTrips", () => {
  it("returns paginated trips with joins", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([{
      id: TRIP_ID, route_id: RID, bus_id: BID, driver_id: null,
      trip_type: "regular", scheduled_date: "2026-07-20",
      scheduled_start_time: "08:00:00", scheduled_end_time: null,
      actual_start_time: null, actual_end_time: null,
      status: "scheduled", delay_minutes: null, delay_reason: null,
      notes: null, rejection_reason: null,
      created_at: "", updated_at: "",
      route_name: "Makkah-Madinah", origin: "Makkah", destination: "Madinah",
      plate_number: "ABC 123", driver_name: null,
    }]);

    const result = await listTrips(TID, { page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].routeName).toBe("Makkah-Madinah");
  });
});

describe("getTripById", () => {
  it("returns trip with stops and passengers", async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID,
      trip_type: "regular", scheduled_date: "2026-07-20",
      scheduled_start_time: "08:00:00", status: "scheduled",
      route_name: "Test Route", origin: "A", destination: "B",
      plate_number: "ABC", driver_name: "John",
    });
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([makePassRow()]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await getTripById(TID, TRIP_ID);
    expect(result.routeName).toBe("Test Route");
    expect(result.passengers).toHaveLength(1);
  });

  it("returns round trip with legs and manifest", async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID,
      trip_type: "round", scheduled_date: "2026-08-01",
      scheduled_start_time: "08:00:00", status: "scheduled",
      route_name: "Test Route", origin: "A", destination: "B",
      plate_number: "ABC", driver_name: "John",
      trip_title: "Hajj Group 12", vehicle_type: "Bus 50-seater",
      group_leader: "Ahmed Ali", group_leader_no: "GL-001",
      nationality: "Pakistani", agent: "Al-Rihla", group_no: "G-12",
      no_of_pax: 45, nusuk_info: null, flights: [{ flightNo: "SV101", airline: "Saudia" }],
      hotels: [{ city: "Madinah", hotel: "Anwar Madinah" }],
    });
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([
      { id: "leg-1", trip_id: TRIP_ID, leg_no: 1, origin: "Jeddah", destination: "Madinah", leg_date: "2026-08-01", departure_time: "08:00", arrival_time: null, overnight_flag: false, notes: null },
      { id: "leg-2", trip_id: TRIP_ID, leg_no: 2, origin: "Madinah", destination: "Makkah", leg_date: "2026-08-03", departure_time: "09:00", arrival_time: null, overnight_flag: true, notes: null },
    ]);

    const result = await getTripById(TID, TRIP_ID);
    expect(result.tripType).toBe("round");
    expect(result.legs).toHaveLength(2);
    expect(result.legs[0].origin).toBe("Jeddah");
    expect(result.legs[1].overnightFlag).toBe(true);
    expect(result.groupLeader).toBe("Ahmed Ali");
    expect(result.noOfPax).toBe(45);
    expect(result.flights).toHaveLength(1);
  });

  it("throws NotFoundError when missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(getTripById(TID, TRIP_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("updateTrip", () => {
  it("updates trip fields", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID })
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, trip_type: "regular", scheduled_date: "2026-07-20", scheduled_start_time: "08:00:00", status: "scheduled", route_name: "Test", origin: "A", destination: "B", plate_number: "ABC", driver_name: null });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await updateTrip(TID, TRIP_ID, { notes: "Updated" });
    expect(result.status).toBe("scheduled");
  });
});

describe("cancelTrip", () => {
  it("cancels a non-completed trip", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: "scheduled" })
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, trip_type: "regular", scheduled_date: "2026-07-20", scheduled_start_time: "08:00:00", status: "cancelled", rejection_reason: "No driver", route_name: "Test", origin: "A", destination: "B", plate_number: "ABC", driver_name: null });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await cancelTrip(TID, TRIP_ID, { rejectionReason: "No driver" });
    expect(result.rejectionReason).toBe("No driver");
  });

  it("rejects cancelling completed trip", async () => {
    mockQueryOne.mockResolvedValueOnce({ id: TRIP_ID, status: "completed" });
    await expect(cancelTrip(TID, TRIP_ID, { rejectionReason: "X" })).rejects.toThrow(ConflictError);
  });
});

describe("startTrip", () => {
  it("starts a scheduled trip", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: "scheduled" })
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, trip_type: "regular", scheduled_date: "2026-07-20", scheduled_start_time: "08:00:00", status: "en_route", route_name: "Test", origin: "A", destination: "B", plate_number: "ABC", driver_name: null });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await startTrip(TID, TRIP_ID);
    expect(result.status).toBe("en_route");
  });
});

describe("completeTrip", () => {
  it("completes an en_route trip", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: "en_route" })
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, estimated_revenue: '0' }) // createProfitJournalEntry
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, trip_type: "regular", scheduled_date: "2026-07-20", scheduled_start_time: "08:00:00", status: "completed", route_name: "Test", origin: "A", destination: "B", plate_number: "ABC", driver_name: null });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await completeTrip(TID, TRIP_ID);
    expect(result.status).toBe("completed");
  });

  it("rejects completing non-en_route trip", async () => {
    mockQueryOne.mockResolvedValueOnce({ id: TRIP_ID, status: "scheduled" });
    await expect(completeTrip(TID, TRIP_ID)).rejects.toThrow(ConflictError);
  });
});

describe("delayTrip", () => {
  it("delays a scheduled trip", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: "scheduled" })
      .mockResolvedValueOnce({ id: TRIP_ID, tenant_id: TID, route_id: RID, bus_id: BID, trip_type: "regular", scheduled_date: "2026-07-20", scheduled_start_time: "08:00:00", status: "delayed", delay_minutes: 30, delay_reason: "Traffic", route_name: "Test", origin: "A", destination: "B", plate_number: "ABC", driver_name: null });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([]);

    const result = await delayTrip(TID, TRIP_ID, { delayMinutes: 30, delayReason: "Traffic" });
    expect(result.delayMinutes).toBe(30);
  });
});

describe("addPassenger", () => {
  it("adds a passenger to a trip", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID })
      .mockResolvedValueOnce(makePassRow());

    const result = await addPassenger(TID, TRIP_ID, { passengerName: "Ahmed" });
    expect(result.passengerName).toBe("Ahmed");
  });
});

describe("removePassenger", () => {
  it("removes a passenger", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID })
      .mockResolvedValueOnce({ id: PASS_ID });
    mockQuery.mockResolvedValueOnce(undefined);

    const result = await removePassenger(TID, TRIP_ID, PASS_ID);
    expect(result.deleted).toBe(true);
  });
});

describe("getTripCalendar", () => {
  it("returns trips within date range", async () => {
    mockQuery.mockResolvedValueOnce([{ id: TRIP_ID, scheduled_date: "2026-07-20", scheduled_start_time: "08:00", status: "scheduled" }]);

    const result = await getTripCalendar(TID, "2026-07-01", "2026-07-31");
    expect(result).toHaveLength(1);
  });
});

describe("trip validators (2.7 trip types)", () => {
  const { createTripSchema, updateTripSchema, tripQuerySchema } = require("../validators/operations");

  it("accepts a round trip with 2+ legs", () => {
    const parsed = createTripSchema.parse({
      tripType: "round",
      scheduledDate: "2026-08-01", scheduledStartTime: "08:00",
      routeId: RID, busId: BID,
      legs: [
        { origin: "Jeddah", destination: "Madinah", legDate: "2026-08-01" },
        { origin: "Madinah", destination: "Makkah", legDate: "2026-08-03" },
      ],
    });
    expect(parsed.tripType).toBe("round");
    expect(parsed.legs).toHaveLength(2);
  });

  it("rejects a round trip without legs", () => {
    expect(() => createTripSchema.parse({ tripType: "round", scheduledDate: "2026-08-01", scheduledStartTime: "08:00", routeId: RID, busId: BID }))
      .toThrow("Round trips require at least 2 legs");
  });

  it("rejects a round trip with a single leg", () => {
    expect(() => createTripSchema.parse({
      tripType: "round", scheduledDate: "2026-08-01", scheduledStartTime: "08:00",
      legs: [{ origin: "A", destination: "B", legDate: "2026-08-01" }],
    })).toThrow("Round trips require at least 2 legs");
  });

  it("defaults tripType to single", () => {
    const parsed = createTripSchema.parse({ routeId: RID, busId: BID, scheduledDate: "2026-08-01", scheduledStartTime: "08:00" });
    expect(parsed.tripType).toBe("single");
  });

  it("rejects unknown trip types", () => {
    expect(() => createTripSchema.parse({ tripType: "hajj", scheduledDate: "2026-08-01", scheduledStartTime: "08:00" }))
      .toThrow();
  });

  it("allows updating legs on a round trip", () => {
    const parsed = updateTripSchema.parse({
      tripType: "round",
      legs: [
        { origin: "Jeddah", destination: "Madinah", legDate: "2026-08-01" },
        { origin: "Makkah", destination: "Jeddah", legDate: "2026-08-10" },
      ],
    });
    expect(parsed.legs).toHaveLength(2);
  });

  it("filters trips by single/round type", () => {
    expect(tripQuerySchema.parse({ tripType: "round" }).tripType).toBe("round");
    expect(() => tripQuerySchema.parse({ tripType: "charter" })).toThrow();
  });
});
