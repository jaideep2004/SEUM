import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewBookingPage from "../../app/dashboard/bookings/new/page";

const mockPush = vi.fn();
const mockFetch = vi.fn();
global.fetch = mockFetch;
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("seum_access_token", "test-token");
});

afterEach(() => localStorage.clear());

const TRIP = {
  id: "tr1",
  tripType: "single",
  scheduledDate: "2026-08-20",
  scheduledStartTime: "08:00:00",
  status: "scheduled",
  routeName: "Jeddah-Makkah",
  origin: "Jeddah",
  destination: "Makkah",
  busPlate: "SEUM-100",
  driverName: "Mohammed Ali",
  tripTitle: null,
  noOfPax: null,
  legCount: 0,
};

const CUSTOMER = {
  id: "c1",
  name: "Ahmed Al-Otaibi",
  phone: "0551234567",
  email: null,
  idNumber: null,
  isCompany: false,
  companyName: null,
};

const AVAILABILITY = {
  tripId: "tr1",
  capacity: 10,
  occupied: [2],
  available: [1, 3, 4, 5, 6, 7, 8, 9, 10],
  bookedCount: 1,
};

const CREATED = {
  id: "bk1",
  bookingReference: "BK-2026-0001",
  status: "pending",
};

const TRIPS_RESPONSE = {
  success: true,
  data: [TRIP, { ...TRIP, id: "tr2", status: "completed" }],
  meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
};

describe("NewBookingPage", () => {
  it("loads bookable trips and filters out non-bookable statuses", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TRIPS_RESPONSE });
    render(<NewBookingPage />);
    expect(screen.getByText("New Booking")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Jeddah → Makkah/ })).toBeTruthy()
    );
  });

  it("creates a booking through the full flow", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => TRIPS_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [CUSTOMER] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: AVAILABILITY }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: CREATED }) });

    render(<NewBookingPage />);

    await waitFor(() => expect(screen.getByRole("option", { name: /Jeddah → Makkah/ })).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Search customers by name, phone or ID...");
    await userEvent.type(searchInput, "Ahmed");
    await waitFor(() => expect(screen.getByText("Ahmed Al-Otaibi")).toBeTruthy());
    await userEvent.click(screen.getByText("Ahmed Al-Otaibi"));

    await userEvent.selectOptions(screen.getByRole("combobox"), "tr1");
    await waitFor(() => expect(screen.getByRole("button", { name: "Seat 5 available" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Seat 2 occupied" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Seat 5 available" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Passenger name")).toBeTruthy()
    );
    await userEvent.type(screen.getByPlaceholderText("Passenger name"), "Ahmed Al-Otaibi");
    await userEvent.type(screen.getAllByPlaceholderText("0.00")[0], "400");
    await userEvent.click(screen.getByText("Create Booking"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings/bk1"));

    const postCall = mockFetch.mock.calls.find((c: any) => c[1]?.method === "POST");
    expect(postCall).toBeTruthy();
    const body = JSON.parse((postCall as any[])[1].body);
    expect(body.customer_id).toBe("c1");
    expect(body.trip_id).toBe("tr1");
    expect(body.seat_numbers).toEqual([5]);
    expect(body.passengers[0].passenger_name).toBe("Ahmed Al-Otaibi");
    expect(body.total_amount).toBe(400);
  });

  it("blocks submission without customer, trip or seats", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TRIPS_RESPONSE });
    render(<NewBookingPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: /Jeddah → Makkah/ })).toBeTruthy());
    await userEvent.click(screen.getByText("Create Booking"));
    expect(screen.getByText("Select a customer first")).toBeTruthy();
  });
});
