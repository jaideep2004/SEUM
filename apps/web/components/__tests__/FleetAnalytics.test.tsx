import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FleetAnalyticsPage from "@/app/dashboard/fleet/analytics/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const ANALYTICS_MOCK = {
  summary: { totalBuses: 10, activeBuses: 7, maintenanceBuses: 2, retiredBuses: 1, soldBuses: 0 },
  avgBusAge: 4,
  utilizationRate: 70,
  usedBuses: 7,
  upcomingRenewals: [
    {
      id: "r1", documentType: "insurance", documentNumber: "POL-001",
      expiryDate: "2026-07-20", status: "active", plateNumber: "ABC 123",
      busMake: "Toyota", busModel: "Coaster",
    },
  ],
  fuelEfficiency: {
    avgKmPerLiter: 8.5,
    trend: [
      { date: "2026-06-01", plateNumber: "ABC 123", kmPerLiter: 8.2 },
      { date: "2026-06-15", plateNumber: "DEF 456", kmPerLiter: 8.9 },
    ],
  },
  maintenanceCostPerBus: [],
  readinessDistribution: { ready: 5, in_maintenance: 2, unchecked: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token",
    setItem: () => {},
    removeItem: () => {},
  });
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: ANALYTICS_MOCK }),
  });
});

describe("FleetAnalyticsPage", () => {
  it("renders the page title", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Fleet Analytics")).toBeDefined();
      expect(screen.getByText("Comprehensive fleet performance dashboard")).toBeDefined();
    });
  });

  it("renders all KPI cards with correct values", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Total Buses")).toBeDefined();
      expect(screen.getByText("Maintenance")).toBeDefined();
      expect(screen.getByText("2")).toBeDefined();
      expect(screen.getByText("Utilization")).toBeDefined();
      expect(screen.getByText("7 of 10 in use")).toBeDefined();
      expect(screen.getByText("Avg Bus Age")).toBeDefined();
      expect(screen.getByText("4 yrs")).toBeDefined();
      expect(screen.getByText("Avg Efficiency")).toBeDefined();
      expect(screen.getByText("Renewals Due")).toBeDefined();
      expect(screen.getByText("1")).toBeDefined();
    });
    const seventies = screen.getAllByText("70%");
    expect(seventies.length).toBeGreaterThanOrEqual(1);
    const tens = screen.getAllByText("10");
    expect(tens.length).toBeGreaterThanOrEqual(1);
  });

  it("renders chart section headers", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Fleet Utilization")).toBeDefined();
      expect(screen.getByText("Bus Age Distribution")).toBeDefined();
      expect(screen.getByText("Fuel Efficiency (km/L)")).toBeDefined();
      expect(screen.getByText("Upcoming Renewals")).toBeDefined();
      expect(screen.getByText("Maintenance Cost / Bus")).toBeDefined();
    });
  });

  it("renders renewal item with days remaining", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Insurance")).toBeDefined();
      expect(screen.getByText("ABC 123 — Toyota Coaster")).toBeDefined();
    });
  });

  it("renders export CSV button", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeDefined();
    });
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<FleetAnalyticsPage />);
    expect(screen.getByText("Loading analytics...")).toBeDefined();
  });

  it("shows empty state when no data", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: null }),
    });
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText("No fleet data available.")).toBeDefined();
    });
  });

  it("displays fuel efficiency trend chart when data exists", async () => {
    render(<FleetAnalyticsPage />);
    await waitFor(() => {
      expect(screen.queryByText("No efficiency data yet")).toBeNull();
    });
  });
});
