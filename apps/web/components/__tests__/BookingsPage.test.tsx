import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingsPage from "../../app/dashboard/bookings/page";

const mockFetch = vi.fn();
global.fetch = mockFetch;
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("seum_access_token", "test-token");
});

afterEach(() => localStorage.clear());

const BOOKING = {
  id: "bk1",
  tenantId: "t1",
  customerId: "c1",
  tripId: "tr1",
  bookingReference: "BK-2026-0001",
  numberOfPassengers: 2,
  seatNumbers: [5, 6],
  totalAmount: 400,
  paidAmount: 200,
  balance: 200,
  status: "pending",
  bookingDate: "2026-08-12T10:00:00",
  paymentStatus: "partial",
  notes: null,
  cancelReason: null,
  cancelledAt: null,
  refundedAt: null,
  createdAt: "2026-08-12T10:00:00",
  updatedAt: "2026-08-12T10:00:00",
  customer: { id: "c1", name: "Ahmed Al-Otaibi", phone: "0551234567", email: null, isCompany: false, companyName: null },
  trip: {
    id: "tr1",
    scheduledDate: "2026-08-20",
    scheduledStartTime: "08:00:00",
    status: "scheduled",
    busPlate: "SEUM-100",
    busMake: null,
    busModel: null,
    route: { name: "Jeddah-Makkah", origin: "Jeddah", destination: "Makkah" },
  },
};

function mockList(data: unknown, meta = { page: 1, pageSize: 25, total: 1, totalPages: 1 }) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data, meta }) });
}

describe("BookingsPage", () => {
  it("renders bookings with reference, customer and badges", async () => {
    mockList([BOOKING]);
    render(<BookingsPage />);
    expect(screen.getByText("Bookings")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("BK-2026-0001")).toBeTruthy());
    expect(screen.getByText("Ahmed Al-Otaibi")).toBeTruthy();
    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.getByText("partial")).toBeTruthy();
    expect(screen.getByText("Jeddah → Makkah")).toBeTruthy();
  });

  it("shows empty state when no bookings", async () => {
    mockList([], { page: 1, pageSize: 25, total: 0, totalPages: 1 });
    render(<BookingsPage />);
    await waitFor(() =>
      expect(screen.getByText("No bookings found — create one to get started.")).toBeTruthy()
    );
  });

  it("passes status filter to the API and shows pagination", async () => {
    mockList([BOOKING], { page: 2, pageSize: 25, total: 30, totalPages: 2 });
    mockList([BOOKING], { page: 1, pageSize: 25, total: 30, totalPages: 2 });
    render(<BookingsPage />);
    await waitFor(() => expect(screen.getByText("BK-2026-0001")).toBeTruthy());

    await userEvent.selectOptions(screen.getByDisplayValue("All statuses"), "confirmed");

    await waitFor(() => {
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
      expect(url).toContain("status=confirmed");
    });
    expect(screen.getByText("30 bookings — Page 1 of 2")).toBeTruthy();
  });
});
