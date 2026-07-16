import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripsPage from "@/app/dashboard/trips/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/trips",
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const MOCK_TRIPS = [
  {
    id: "t1", routeId: "r1", routeName: "Makkah-Madinah", busId: "b1",
    busPlate: "ABC 123", driverId: "d1", driverName: "Ahmed Khan",
    tripType: "regular", status: "scheduled",
    scheduledDate: "2026-07-20", scheduledStartTime: "08:00:00",
  },
  {
    id: "t2", routeId: "r2", routeName: "Jeddah-Airport", busId: "b2",
    busPlate: "DEF 456", driverId: null, driverName: null,
    tripType: "shuttle", status: "en_route",
    scheduledDate: "2026-07-20", scheduledStartTime: "09:30:00",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: () => "mock-token", setItem: () => {}, removeItem: () => {},
  });
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: MOCK_TRIPS, meta: { total: 2, page: 1, pageSize: 20 } }),
  });
});

describe("TripsPage", () => {
  it("renders the page title", async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText("Trips")).toBeDefined();
      expect(screen.getByText("Manage scheduled trips and operations")).toBeDefined();
    });
  });

  it("renders New Trip and Calendar buttons", async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText("New Trip")).toBeDefined();
      expect(screen.getByText("Calendar")).toBeDefined();
    });
  });

  it("renders trip rows in the table", async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText("Makkah-Madinah")).toBeDefined();
      expect(screen.getByText("ABC 123")).toBeDefined();
      expect(screen.getByText("Ahmed Khan")).toBeDefined();
      expect(screen.getByText("Jeddah-Airport")).toBeDefined();
    });
  });

  it("renders status and type indicators", async () => {
    render(<TripsPage />);
    await waitFor(() => {
      const scheduled = screen.getAllByText(/scheduled/);
      expect(scheduled.length).toBeGreaterThanOrEqual(1);
      const enRoute = screen.getAllByText(/en route/);
      expect(enRoute.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when no trips", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [], meta: { total: 0, page: 1, pageSize: 20 } }),
    });
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText("No trips found")).toBeDefined();
    });
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<TripsPage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
