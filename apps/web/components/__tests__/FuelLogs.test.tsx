import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import FuelLogsPage from "@/app/dashboard/fleet/fuel/page";
import FuelAnalyticsPage from "@/app/dashboard/fleet/fuel/analytics/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const FUEL_LOGS_MOCK = {
  success: true,
  data: [
    {
      id: "f1", busId: "bus-1", tenantId: "t1",
      date: "2025-07-15", liters: 50, costPerLiter: 2.15,
      totalCost: 107.50, odometerReading: 50000,
      stationName: "Petromin", fuelType: "diesel",
      receiptUrl: null,
    },
    {
      id: "f2", busId: "bus-2", tenantId: "t1",
      date: "2025-07-14", liters: 60, costPerLiter: 2.10,
      totalCost: 126.00, odometerReading: 30000,
      stationName: null, fuelType: "diesel",
      receiptUrl: "https://example.com/receipt.jpg",
    },
  ],
  meta: { total: 2, page: 1, pageSize: 20 },
};

const ANALYTICS_MOCK = {
  success: true,
  data: {
    summary: { totalFills: 10, totalLiters: 500, totalCost: 1075, avgCostPerLiter: 2.15 },
    avgKmPerLiter: 18.5,
    avgCostPerKm: 0.12,
    efficiencyTrend: [
      { date: "2025-07-01", plateNumber: "ABC 123", kmPerLiter: 20, costPerKm: 0.10, liters: 50 },
      { date: "2025-07-15", plateNumber: "ABC 123", kmPerLiter: 17, costPerKm: 0.13, liters: 50 },
    ],
  },
};

const ALERT_MOCK = { success: true, data: { dropped: true, message: "Fuel efficiency dropped 20%" } };
const ALERT_CLEAR_MOCK = { success: true, data: { dropped: false, message: null } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token",
    setItem: () => {},
    removeItem: () => {},
  });
});

describe("FuelLogsPage", () => {
  it("renders the page title", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(FUEL_LOGS_MOCK) });
    render(<FuelLogsPage />);
    await waitFor(() => {
      expect(screen.getByText("Fuel Logs")).toBeDefined();
    });
  });

  it("renders fuel log rows", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(FUEL_LOGS_MOCK) });
    render(<FuelLogsPage />);
    await waitFor(() => {
      expect(screen.getByText("50 L")).toBeDefined();
      expect(screen.getByText("60 L")).toBeDefined();
    });
  });

  it("shows empty state when no logs", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [], meta: { total: 0 } }),
    });
    render(<FuelLogsPage />);
    await waitFor(() => {
      expect(screen.getByText(/No fuel logs found/i)).toBeDefined();
    });
  });

  it("renders receipt view button when receiptUrl exists", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(FUEL_LOGS_MOCK) });
    render(<FuelLogsPage />);
    await waitFor(() => {
      const viewBtns = screen.getAllByText("View");
      expect(viewBtns.length).toBe(1);
    });
  });

  it("shows Log Fuel Fill button", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(FUEL_LOGS_MOCK) });
    render(<FuelLogsPage />);
    await waitFor(() => {
      expect(screen.getByText("Log Fuel Fill")).toBeDefined();
    });
  });
});

describe("FuelAnalyticsPage", () => {
  function mockAnalyticsCalls(alertData = ALERT_CLEAR_MOCK) {
    // FuelAnalyticsPage does: fetch(/fuel/analytics), fetch(/fuel/efficiency-check)
    // The order in Promise.all is: analytics first, efficiency-check second
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve(ANALYTICS_MOCK) })
      .mockResolvedValueOnce({ json: () => Promise.resolve(alertData) });
  }

  it("renders analytics page title", async () => {
    mockAnalyticsCalls();
    render(<FuelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Fuel Analytics")).toBeDefined();
    });
  });

  it("renders summary KPI cards", async () => {
    mockAnalyticsCalls();
    render(<FuelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("10")).toBeDefined(); // Total Fills
      expect(screen.getByText("500 L")).toBeDefined(); // Total Liters
    });
  });

  it("renders efficiency alert when dropped", async () => {
    mockAnalyticsCalls(ALERT_MOCK);
    render(<FuelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Fuel efficiency dropped 20%/)).toBeDefined();
    });
  });

  it("renders efficiency trend chart area", async () => {
    mockAnalyticsCalls();
    render(<FuelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Efficiency Trend (km/L)")).toBeDefined();
    });
  });
});
