const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import { getFleetAnalytics, exportFleetReportCSV } from "../services/analyticsService";

const TENANT_ID = "tenant-1";

beforeEach(() => {
  jest.resetAllMocks();
});

describe("getFleetAnalytics", () => {
  it("returns aggregated fleet analytics", async () => {
    mockQuery
      .mockResolvedValueOnce([{ status: "active", count: 3 }, { status: "maintenance", count: 1 }])
      .mockResolvedValueOnce([]) // readiness dist
      .mockResolvedValueOnce([]); // assignments for calendar (used by util)

    mockQueryOne
      .mockResolvedValueOnce({ avg_age: 4 })
      .mockResolvedValueOnce({ used_buses: 2 });

    mockQuery
      .mockResolvedValueOnce([]) // upcoming renewals
      .mockResolvedValueOnce([]); // fuel efficiency

    const result = await getFleetAnalytics(TENANT_ID);

    expect(result.summary.totalBuses).toBe(4);
    expect(result.summary.activeBuses).toBe(3);
    expect(result.summary.maintenanceBuses).toBe(1);
    expect(result.avgBusAge).toBe(4);
    expect(result.utilizationRate).toBe(50);
    expect(result.upcomingRenewals).toEqual([]);
    expect(result.fuelEfficiency.avgKmPerLiter).toBeNull();
  });

  it("handles zero buses gracefully", async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockQueryOne
      .mockResolvedValueOnce({ avg_age: 0 })
      .mockResolvedValueOnce({ used_buses: 0 });

    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getFleetAnalytics(TENANT_ID);

    expect(result.summary.totalBuses).toBe(0);
    expect(result.utilizationRate).toBe(0);
    expect(result.avgBusAge).toBe(0);
  });
});

describe("exportFleetReportCSV", () => {
  it("generates CSV string with header and rows", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "b1", plate_number: "ABC 123", make: "Toyota", model: "Coaster", year: 2022, status: "active", assigned_depot: "Main Depot" },
      { id: "b2", plate_number: "DEF 456", make: "MAN", model: "TGX", year: 2024, status: "maintenance", assigned_depot: null },
    ]);

    const csv = await exportFleetReportCSV(TENANT_ID);

    expect(csv).toContain("ID,Plate Number,Make,Model,Year,Status,Depot");
    expect(csv).toContain("ABC 123");
    expect(csv).toContain("DEF 456");
    expect(csv).toContain("Main Depot");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it("returns only header when no buses exist", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const csv = await exportFleetReportCSV(TENANT_ID);

    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
  });
});
