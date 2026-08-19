import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "../../app/dashboard/notifications/page";

const mockFetch = vi.fn();
global.fetch = mockFetch;
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("seum_access_token", "test-token");
});

afterEach(() => localStorage.clear());

const NOTIF = {
  id: "n1",
  type: "trip_assigned",
  title: "New Trip Assigned",
  message: "You have been assigned to a new trip.",
  resource: "trip",
  resource_id: "tr1",
  data: null,
  is_read: false,
  created_at: "2026-08-15T10:00:00Z",
  read_at: null,
};

function mockList(data: unknown[], meta = { page: 1, pageSize: 25, total: 1, totalPages: 1 }) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data, meta }) });
}

describe("NotificationsPage", () => {
  it("renders notifications with unread badge", async () => {
    mockList([NOTIF]);
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText("New Trip Assigned")).toBeTruthy());
    expect(screen.getAllByText("Trip assignment").length).toBeGreaterThan(0);
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText("1 notification · 1 unread")).toBeTruthy();
  });

  it("filters by type through the API", async () => {
    mockList([NOTIF]);
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText("New Trip Assigned")).toBeTruthy());

    await userEvent.selectOptions(screen.getByDisplayValue("All types"), "trip_delayed");

    await waitFor(() => {
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
      expect(url).toContain("type=trip_delayed");
    });
  });

  it("marks all read and dismisses an item", async () => {
    mockList([NOTIF]);
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText("New Trip Assigned")).toBeTruthy());

    await userEvent.click(screen.getByTitle("Mark all notifications as read"));
    await waitFor(() => expect(screen.getAllByText(/all read/).length).toBeGreaterThan(0));
    expect(screen.getByText("1 notification · all read")).toBeTruthy();

    mockList([]);
    await userEvent.click(screen.getByTitle("Dismiss notification"));
    await waitFor(() => expect(screen.queryByText("New Trip Assigned")).toBeNull());
    expect(screen.getByText(/you're all caught up/i)).toBeTruthy();
  });
});