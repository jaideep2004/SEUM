import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DriversPage from "../../app/dashboard/drivers/page";

const mockFetch = vi.fn();
global.fetch = mockFetch;
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

beforeEach(() => {
  vi.clearAllMocks();
  pushMock.mockReset();
  localStorage.setItem("seum_access_token", "test-token");
});

afterEach(() => localStorage.clear());

const mockDrivers = [
  { id: "d1", name: "Ahmed Khan", email: "ahmed@test.com", employeeCode: "EMP-001", status: "active" },
  { id: "d2", name: "Khalid Hassan", email: "khalid@test.com", employeeCode: "EMP-002", status: "active" },
];

function mockDriversList(data: unknown, total = data instanceof Array ? data.length : 1) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data, meta: { page: 1, pageSize: 20, total, totalPages: 1 } }),
  });
}

function mockEmptyAlerts() {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) });
}

describe("DriversPage", () => {
  it("renders page title and fetches drivers", async () => {
    mockDriversList(mockDrivers);
    mockEmptyAlerts();

    render(<DriversPage />);
    expect(screen.getByText("Drivers")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Ahmed Khan")).toBeTruthy());
    expect(screen.getByText("Khalid Hassan")).toBeTruthy();
    expect(screen.getByText("ahmed@test.com")).toBeTruthy();
  });

  it("shows empty state when no drivers", async () => {
    mockDriversList([]);
    mockEmptyAlerts();

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText("No Drivers Found")).toBeTruthy());
    expect(screen.getByText("Add your first driver to get started")).toBeTruthy();
  });

  it("filters drivers by search on Enter", async () => {
    mockDriversList(mockDrivers);
    mockEmptyAlerts();
    mockDriversList([mockDrivers[1]]);

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText("Ahmed Khan")).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Search name, email, employee code...");
    await userEvent.type(searchInput, "Khalid");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(screen.queryByText("Ahmed Khan")).toBeFalsy());
    expect(screen.getByText("Khalid Hassan")).toBeTruthy();
  });

  it("navigates to driver detail when row is clicked", async () => {
    mockDriversList(mockDrivers);
    mockEmptyAlerts();

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText("Ahmed Khan")).toBeTruthy());

    await userEvent.click(screen.getByText("Ahmed Khan"));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/drivers/d1");
  });

  it("filters by status through the dropdown", async () => {
    mockDriversList(mockDrivers);
    mockEmptyAlerts();
    mockDriversList([mockDrivers[0]]);

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText("Ahmed Khan")).toBeTruthy());

    await userEvent.selectOptions(screen.getByDisplayValue("All Status"), "active");

    await waitFor(() => {
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
      expect(url).toContain("status=active");
    });
    expect(screen.getByText("Ahmed Khan")).toBeTruthy();
  });
});
