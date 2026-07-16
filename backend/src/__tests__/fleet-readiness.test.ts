import { NotFoundError, ConflictError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import {
  updateReadiness,
  getReadiness,
  getReadinessByBusId,
  checkBusReadiness,
} from "../services/fleetService";

const TENANT_ID = "tenant-1";
const BUS_ID = "bus-1";
const USER_ID = "user-1";

function makeReadinessRow(overrides: Record<string, any> = {}) {
  return {
    id: "readiness-1",
    bus_id: BUS_ID,
    tenant_id: TENANT_ID,
    status: "ready",
    checked_by: USER_ID,
    checked_at: "2025-07-15T10:00:00Z",
    notes: null,
    next_scheduled_maintenance_km: null,
    next_scheduled_maintenance_date: null,
    created_at: "2025-07-15T10:00:00Z",
    updated_at: "2025-07-15T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateReadiness", () => {
  it("creates a new readiness record when none exists", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BUS_ID }) // bus exists
      .mockResolvedValueOnce(null) // no existing readiness
      .mockImplementationOnce((sql: string, params: any[]) => {
        // Capture notes from the INSERT params (index 3)
        return Promise.resolve(makeReadinessRow({ notes: params[3] }));
      });

    const result = await updateReadiness(BUS_ID, TENANT_ID, USER_ID, {
      busId: BUS_ID,
      status: "ready",
      notes: "All checks passed",
    });

    expect(result.status).toBe("ready");
    expect(result.notes).toBe("All checks passed");
    expect(mockQueryOne).toHaveBeenCalledTimes(3);
  });

  it("updates an existing readiness record", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BUS_ID }) // bus exists
      .mockResolvedValueOnce({ id: "readiness-1" }) // existing readiness
      .mockImplementationOnce((sql: string, params: any[]) => {
        // Capture status from UPDATE params (index 0)
        return Promise.resolve(makeReadinessRow({ status: params[0] }));
      });

    const result = await updateReadiness(BUS_ID, TENANT_ID, USER_ID, {
      busId: BUS_ID,
      status: "in_maintenance",
    });

    expect(result.status).toBe("in_maintenance");
  });

  it("throws NotFoundError when bus does not exist", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      updateReadiness(BUS_ID, TENANT_ID, USER_ID, {
        busId: BUS_ID,
        status: "ready",
      })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getReadiness", () => {
  it("returns all buses with readiness info via RIGHT JOIN", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "readiness-1", bus_id: BUS_ID, tenant_id: TENANT_ID, status: "ready", checked_by: USER_ID, checked_at: "2025-07-15T10:00:00Z", notes: null, next_scheduled_maintenance_km: null, next_scheduled_maintenance_date: null, created_at: "2025-07-15T10:00:00Z", updated_at: "2025-07-15T10:00:00Z", plate_number: "ABC 123", make: "Toyota", model: "Coaster", year: 2022, bus_status: "active" },
      { id: null, bus_id: "bus-2", tenant_id: TENANT_ID, status: null, checked_by: null, checked_at: null, notes: null, next_scheduled_maintenance_km: null, next_scheduled_maintenance_date: null, created_at: null, updated_at: null, plate_number: "DEF 456", make: "MAN", model: "2024", year: 2024, bus_status: "active" },
    ]);

    const results = await getReadiness(TENANT_ID);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("ready");
    expect(results[1].status).toBeNull();
  });

  it("filters by status when provided", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "readiness-1", bus_id: BUS_ID, tenant_id: TENANT_ID, status: "in_maintenance", checked_by: USER_ID, checked_at: "2025-07-15T10:00:00Z", notes: null, next_scheduled_maintenance_km: null, next_scheduled_maintenance_date: null, created_at: "2025-07-15T10:00:00Z", updated_at: "2025-07-15T10:00:00Z", plate_number: "ABC 123", make: "Toyota", model: "Coaster", year: 2022, bus_status: "active" },
    ]);

    const results = await getReadiness(TENANT_ID, "in_maintenance");

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("in_maintenance");
  });

  it("returns empty array when no buses match filter", async () => {
    mockQuery.mockResolvedValueOnce([]);
    const results = await getReadiness(TENANT_ID, "out_of_service");
    expect(results).toEqual([]);
  });
});

describe("getReadinessByBusId", () => {
  it("returns readiness for a specific bus", async () => {
    mockQueryOne.mockResolvedValueOnce(makeReadinessRow());
    const result = await getReadinessByBusId(BUS_ID, TENANT_ID);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("ready");
  });

  it("returns null when no readiness record", async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    const result = await getReadinessByBusId(BUS_ID, TENANT_ID);
    expect(result).toBeNull();
  });
});

describe("checkBusReadiness", () => {
  it("passes when bus is ready", async () => {
    mockQueryOne.mockResolvedValueOnce({ status: "ready" });
    await expect(checkBusReadiness(BUS_ID, TENANT_ID)).resolves.toBeUndefined();
  });

  it("throws ConflictError when bus is in maintenance", async () => {
    mockQueryOne.mockResolvedValueOnce({ status: "in_maintenance" });
    await expect(checkBusReadiness(BUS_ID, TENANT_ID)).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError when bus is out of service", async () => {
    mockQueryOne.mockResolvedValueOnce({ status: "out_of_service" });
    await expect(checkBusReadiness(BUS_ID, TENANT_ID)).rejects.toThrow(ConflictError);
  });

  it("passes when no readiness record exists", async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(checkBusReadiness(BUS_ID, TENANT_ID)).resolves.toBeUndefined();
  });
});
