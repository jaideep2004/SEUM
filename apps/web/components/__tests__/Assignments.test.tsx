import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AssignmentsPage from "@/app/dashboard/fleet/assignments/page";
import CalendarPage from "@/app/dashboard/fleet/assignments/calendar/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const ASSIGNMENTS_MOCK = {
  success: true,
  data: [
    {
      id: "a1", busId: "b1", tenantId: "t1",
      routeName: "Makkah-Jeddah", depotName: "Main Depot",
      driverName: "Ahmed Khan", driverId: null,
      startDate: "2025-08-01", endDate: "2025-08-15",
      status: "scheduled", notes: null,
      plateNumber: "ABC 123", busMake: "Toyota", busModel: "Coaster",
    },
    {
      id: "a2", busId: "b2", tenantId: "t1",
      routeName: "Jeddah-Madinah", depotName: null,
      driverName: null, driverId: "driver-2",
      startDate: "2025-08-10", endDate: null,
      status: "active", notes: "Daily route",
      plateNumber: "DEF 456", busMake: "MAN", busModel: "TGX",
    },
  ],
  meta: { total: 2, page: 1, pageSize: 20 },
};

const CALENDAR_MOCK = {
  success: true,
  data: [
    {
      id: "a1", busId: "b1", tenantId: "t1",
      routeName: "Makkah-Jeddah", startDate: "2025-08-01", endDate: "2025-08-15",
      status: "scheduled",
      plateNumber: "ABC 123", busMake: "Toyota", busModel: "Coaster",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token", setItem: () => {}, removeItem: () => {},
  });
});

describe("AssignmentsPage", () => {
  it("renders the page title", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(ASSIGNMENTS_MOCK) });
    render(<AssignmentsPage />);
    await waitFor(() => expect(screen.getByText("Assignments")).toBeDefined());
  });

  it("renders assignment rows", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(ASSIGNMENTS_MOCK) });
    render(<AssignmentsPage />);
    await waitFor(() => {
      expect(screen.getByText("ABC 123")).toBeDefined();
      expect(screen.getByText("DEF 456")).toBeDefined();
      expect(screen.getByText("Makkah-Jeddah")).toBeDefined();
    });
  });

  it("shows empty state when no data", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [], meta: { total: 0 } }),
    });
    render(<AssignmentsPage />);
    await waitFor(() => expect(screen.getByText(/No assignments found/i)).toBeDefined());
  });

  it("shows New Assignment button", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(ASSIGNMENTS_MOCK) });
    render(<AssignmentsPage />);
    await waitFor(() => expect(screen.getByText("New Assignment")).toBeDefined());
  });
});

describe("CalendarPage", () => {
  it("renders the page title", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(CALENDAR_MOCK) });
    render(<CalendarPage />);
    await waitFor(() => expect(screen.getByText("Bus Calendar")).toBeDefined());
  });

  it("renders bus plate number in calendar", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(CALENDAR_MOCK) });
    render(<CalendarPage />);
    await waitFor(() => expect(screen.getByText("ABC 123")).toBeDefined());
  });

  it("shows empty state when no assignments", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ success: true, data: [] }) });
    render(<CalendarPage />);
    await waitFor(() => expect(screen.getByText(/No assignments for this month/i)).toBeDefined());
  });

  it("renders month navigation", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(CALENDAR_MOCK) });
    render(<CalendarPage />);
    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "short" });
    await waitFor(() => expect(screen.getByText(new RegExp(monthName))).toBeDefined());
  });
});
