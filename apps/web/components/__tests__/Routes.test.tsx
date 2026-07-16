import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoutesPage from "@/app/dashboard/routes/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/routes",
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("confirm", () => true);

const MOCK_ROUTES = [
  {
    id: "r1", name: "Makkah-Madinah Express", code: "MM-001",
    origin: "Makkah", destination: "Madinah",
    distanceKm: 450, estimatedDurationMinutes: 300,
    routeType: "regular", status: "active",
  },
  {
    id: "r2", name: "Jeddah-Airport Shuttle", code: "JA-002",
    origin: "Jeddah", destination: "King Abdulaziz Airport",
    distanceKm: 25, estimatedDurationMinutes: 45,
    routeType: "shuttle", status: "active",
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
    json: () => Promise.resolve({ success: true, data: MOCK_ROUTES, meta: { total: 2, page: 1, pageSize: 20 } }),
  });
});

describe("RoutesPage", () => {
  it("renders the page title", async () => {
    render(<RoutesPage />);
    await waitFor(() => {
      expect(screen.getByText("Routes")).toBeDefined();
      expect(screen.getByText("Manage bus routes and stops")).toBeDefined();
    });
  });

  it("renders New Route button", async () => {
    render(<RoutesPage />);
    await waitFor(() => {
      expect(screen.getByText("New Route")).toBeDefined();
    });
  });

  it("renders route rows in the table", async () => {
    render(<RoutesPage />);
    await waitFor(() => {
      expect(screen.getByText("MM-001")).toBeDefined();
      expect(screen.getByText("Makkah-Madinah Express")).toBeDefined();
      expect(screen.getByText("JA-002")).toBeDefined();
    });
  });

  it("renders route type tags and status badges", async () => {
    render(<RoutesPage />);
    await waitFor(() => {
      const regularTags = screen.getAllByText("Regular");
      expect(regularTags.length).toBeGreaterThanOrEqual(1);
      const shuttleTags = screen.getAllByText("Shuttle");
      expect(shuttleTags.length).toBeGreaterThanOrEqual(1);
      const activeBadges = screen.getAllByText("active");
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when no routes", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [], meta: { total: 0, page: 1, pageSize: 20 } }),
    });
    render(<RoutesPage />);
    await waitFor(() => {
      expect(screen.getByText("No routes found")).toBeDefined();
    });
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<RoutesPage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
