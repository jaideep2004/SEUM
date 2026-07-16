import { NotFoundError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import {
  createFuelLog,
  listFuelLogs,
  getFuelAnalytics,
  checkFuelEfficiencyDrop,
} from "../services/fleetService";

const TENANT_ID = "tenant-1";
const BUS_ID = "bus-1";

function makeFuelRow(overrides: Record<string, any> = {}) {
  return {
    id: "fuel-1",
    bus_id: BUS_ID,
    tenant_id: TENANT_ID,
    date: "2025-07-15",
    liters: 50,
    cost_per_liter: 2.15,
    total_cost: 107.50,
    odometer_reading: 50000,
    station_name: "Petromin Makkah",
    fuel_type: "diesel",
    receipt_url: null,
    filled_by: "user-1",
    created_at: "2025-07-15T10:00:00Z",
    updated_at: "2025-07-15T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createFuelLog", () => {
  it("creates a fuel log successfully", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BUS_ID })
      .mockResolvedValueOnce(makeFuelRow());

    const result = await createFuelLog(TENANT_ID, {
      busId: BUS_ID,
      liters: 50,
      costPerLiter: 2.15,
      totalCost: 107.50,
      fuelType: "diesel",
      stationName: "Petromin Makkah",
    });

    expect(result.liters).toBe(50);
    expect(result.totalCost).toBe(107.50);
    expect(result.stationName).toBe("Petromin Makkah");
    expect(mockQueryOne).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundError when bus does not exist", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      createFuelLog(TENANT_ID, { busId: BUS_ID, liters: 50, costPerLiter: 2.15, totalCost: 107.50, fuelType: 'diesel' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listFuelLogs", () => {
  it("returns paginated fuel logs with bus info", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "1" });
    mockQuery.mockResolvedValueOnce([
      { ...makeFuelRow(), plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
    ]);

    const result = await listFuelLogs(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].plateNumber).toBe("ABC 123");
  });

  it("filters by busId when provided", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "0" });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listFuelLogs(TENANT_ID, { page: 1, pageSize: 20, busId: BUS_ID });

    expect(result.data).toEqual([]);
    expect(mockQueryOne.mock.calls[0][1]).toContain(BUS_ID);
  });

  it("filters by date range when provided", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "0" });
    mockQuery.mockResolvedValueOnce([]);

    await listFuelLogs(TENANT_ID, { page: 1, pageSize: 20, startDate: "2025-01-01", endDate: "2025-12-31" });

    const params = mockQueryOne.mock.calls[0][1];
    expect(params).toContain("2025-01-01");
    expect(params).toContain("2025-12-31");
  });
});

describe("getFuelAnalytics", () => {
  it("returns summary stats", async () => {
    mockQueryOne.mockResolvedValueOnce({
      total_fills: 5,
      total_liters: 250,
      total_cost: 537.50,
      avg_cost_per_liter: 2.15,
    });
    mockQuery.mockResolvedValueOnce([]); // no efficiency trend data

    const result = await getFuelAnalytics(TENANT_ID);

    expect(result.summary.totalFills).toBe(5);
    expect(result.summary.totalLiters).toBe(250);
    expect(result.avgKmPerLiter).toBeNull();
  });

  it("calculates efficiency trend from consecutive odometer readings", async () => {
    mockQueryOne.mockResolvedValueOnce({
      total_fills: 2,
      total_liters: 100,
      total_cost: 215,
      avg_cost_per_liter: 2.15,
    });
    mockQuery.mockResolvedValueOnce([
      { id: "f1", date: "2025-07-01", liters: 50, total_cost: 107.50, odometer_reading: 49000, fuel_type: "diesel", plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
      { id: "f2", date: "2025-07-15", liters: 50, total_cost: 107.50, odometer_reading: 50000, fuel_type: "diesel", plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
    ]);

    const result = await getFuelAnalytics(TENANT_ID);

    expect(result.efficiencyTrend).toHaveLength(1);
    expect(result.efficiencyTrend[0].kmPerLiter).toBe(20);
    expect(result.efficiencyTrend[0].costPerKm).toBeCloseTo(0.11, 1);
    expect(result.avgKmPerLiter).toBe(20);
  });
});

describe("checkFuelEfficiencyDrop", () => {
  it("returns no drop when insufficient data", async () => {
    mockQuery.mockResolvedValueOnce([]);
    const result = await checkFuelEfficiencyDrop(TENANT_ID);
    expect(result.dropped).toBe(false);
    expect(result.message).toBeNull();
  });

  it("returns no drop when efficiency is stable", async () => {
    // DESC order: most recent first
    mockQuery.mockResolvedValueOnce(
      Array(6).fill(null).map((_, i) => ({
        date: `2025-07-${15 - i}`,
        curr_odo: 55000 - i * 1000,
        liters: 50,
        prev_odo: 54000 - i * 1000,
      }))
    );

    const result = await checkFuelEfficiencyDrop(TENANT_ID);
    expect(result.dropped).toBe(false);
  });

  it("detects a significant efficiency drop", async () => {
    // DESC order: most recent first
    // Recent: 10 km/l, Previous: 20 km/l (50% drop)
    mockQuery.mockResolvedValueOnce([
      { date: "2025-07-20", curr_odo: 53000, liters: 50, prev_odo: 52500 }, // 10 km/l - recent
      { date: "2025-07-15", curr_odo: 52500, liters: 50, prev_odo: 52000 }, // 10 km/l - recent
      { date: "2025-07-10", curr_odo: 52000, liters: 50, prev_odo: 51000 }, // 20 km/l - old
      { date: "2025-07-05", curr_odo: 51000, liters: 50, prev_odo: 50000 }, // 20 km/l - old
      { date: "2025-07-01", curr_odo: 50000, liters: 50, prev_odo: 49000 }, // 20 km/l - old
    ]);

    const result = await checkFuelEfficiencyDrop(TENANT_ID);
    expect(result.dropped).toBe(true);
    expect(result.message).toContain("50%");
  });
});
