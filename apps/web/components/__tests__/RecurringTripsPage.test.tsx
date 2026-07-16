import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RecurringTripsPage from "@/app/dashboard/recurring-trips/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/recurring-trips",
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const MOCK_PATTERNS = [
  {
    id: "p1", routeId: "r1", routeName: "Makkah-Madinah", busId: "b1",
    busPlate: "ABC 123", driverId: "d1", driverName: "Ahmed Khan",
    tripType: "regular", frequency: "daily",
    daysOfWeek: [], scheduledStartTime: "08:00:00",
    startDate: "2026-08-01", endDate: "2026-12-31",
    specificDates: [], notes: null, isActive: true,
    lastGeneratedAt: "2026-07-14T10:00:00Z",
  },
  {
    id: "p2", routeId: "r2", routeName: "Jeddah-Airport", busId: null,
    busPlate: null, driverId: null, driverName: null,
    tripType: "shuttle", frequency: "weekdays",
    daysOfWeek: [1, 2, 3, 4, 5], scheduledStartTime: "09:00:00",
    startDate: "2026-09-01", endDate: null,
    specificDates: ["2026-09-15"], notes: "Holiday special", isActive: true,
    lastGeneratedAt: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token", setItem: () => {}, removeItem: () => {},
  });
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: MOCK_PATTERNS, meta: { total: 2, page: 1, pageSize: 20 } }),
  });
});

describe("RecurringTripsPage", () => {
  it("renders the page title", async () => {
    render(<RecurringTripsPage />);
    await waitFor(() => {
      expect(screen.getByText("Recurring Trips")).toBeDefined();
      expect(screen.getByText("Manage recurring trip patterns and auto-generate trips")).toBeDefined();
    });
  });

  it("renders New Pattern button", async () => {
    render(<RecurringTripsPage />);
    await waitFor(() => {
      expect(screen.getByText("New Pattern")).toBeDefined();
    });
  });

  it("renders pattern rows in the table", async () => {
    render(<RecurringTripsPage />);
    await waitFor(() => {
      expect(screen.getByText("Makkah-Madinah")).toBeDefined();
      expect(screen.getByText("ABC 123")).toBeDefined();
      expect(screen.getByText("Jeddah-Airport")).toBeDefined();
    });
  });

  it("renders frequency badges", async () => {
    render(<RecurringTripsPage />);
    await waitFor(() => {
      expect(screen.getByText("Daily")).toBeDefined();
      expect(screen.getByText("Weekdays")).toBeDefined();
    });
  });

  it("shows empty state when no patterns", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [], meta: { total: 0, page: 1, pageSize: 20 } }),
    });
    render(<RecurringTripsPage />);
    await waitFor(() => {
      expect(screen.getByText("No recurring patterns found")).toBeDefined();
    });
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<RecurringTripsPage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
