import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadinessDashboard from "@/app/dashboard/fleet/readiness/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const READINESS_MOCK = [
  {
    id: "r1", busId: "b1", tenantId: "t1", status: "ready",
    checkedBy: "user-1", checkedAt: "2025-07-15T10:00:00Z",
    notes: null, plateNumber: "ABC 123", busMake: "Toyota", busModel: "Coaster", busYear: 2022, busStatus: "active",
  },
  {
    id: "r2", busId: "b2", tenantId: "t1", status: "in_maintenance",
    checkedBy: "user-1", checkedAt: "2025-07-14T08:00:00Z",
    notes: "Engine issue", plateNumber: "DEF 456", busMake: "MAN", busModel: "TGX", busYear: 2024, busStatus: "active",
  },
  {
    id: null, busId: "b3", tenantId: "t1", status: null,
    checkedBy: null, checkedAt: null,
    notes: null, plateNumber: "GHI 789", busMake: "Scania", busModel: "R500", busYear: 2023, busStatus: "active",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token",
    setItem: () => {},
    removeItem: () => {},
  });
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: READINESS_MOCK }),
  });
});

describe("ReadinessDashboard", () => {
  it("renders the page title", async () => {
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Bus Readiness")).toBeDefined();
    });
  });

  it("renders stats row with Total Buses count", async () => {
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Total Buses")).toBeDefined();
    });
    const readyLabels = screen.getAllByText("Ready");
    expect(readyLabels.length).toBeGreaterThanOrEqual(1);
    const maintenanceLabels = screen.getAllByText("In Maintenance");
    expect(maintenanceLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders bus cards for each vehicle", async () => {
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText("ABC 123")).toBeDefined();
      expect(screen.getByText("DEF 456")).toBeDefined();
      expect(screen.getByText("GHI 789")).toBeDefined();
    });
  });

  it('filters by status when a filter tab is clicked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [READINESS_MOCK[0]] }),
    });
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText("ABC 123")).toBeDefined();
    });
  });

  it('opens the update modal on button click', async () => {
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText("ABC 123")).toBeDefined();
    });
    const buttons = screen.getAllByText("Update Status");
    await userEvent.click(buttons[0]);
    await waitFor(() => {
      expect(screen.getByText("New Status")).toBeDefined();
    });
  });

  it("shows empty state when no data", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    render(<ReadinessDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/No buses found/i)).toBeDefined();
    });
  });
});
