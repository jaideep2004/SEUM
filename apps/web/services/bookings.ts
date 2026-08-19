const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BookingPassenger {
  id: string;
  bookingId: string;
  passengerName: string;
  idNumber: string | null;
  seatNumber: number | null;
  age: number | null;
  specialRequirements: string | null;
}

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  tripId: string;
  bookingReference: string;
  numberOfPassengers: number;
  seatNumbers: number[];
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  bookingDate: string;
  paymentStatus: string;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    isCompany: boolean;
    companyName: string | null;
  };
  trip: {
    id: string;
    scheduledDate: string | null;
    scheduledStartTime: string | null;
    status: string | null;
    busPlate: string | null;
    busMake: string | null;
    busModel: string | null;
    route: {
      name: string | null;
      origin: string | null;
      destination: string | null;
    };
  };
  passengers?: BookingPassenger[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  isCompany: boolean;
  companyName: string | null;
}

export interface TripSummary {
  id: string;
  tripType: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
  routeName: string | null;
  origin: string | null;
  destination: string | null;
  busPlate: string | null;
  driverName: string | null;
  tripTitle: string | null;
  noOfPax: number | null;
  legCount: number;
}

export interface TripAvailability {
  tripId: string;
  capacity: number;
  occupied: number[];
  available: number[];
  bookedCount: number;
}

export type WaitlistStatus = "waiting" | "offered" | "converted" | "expired";

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  tripId: string;
  customerId: string;
  numberOfPassengers: number;
  status: WaitlistStatus;
  createdBy: string | null;
  offeredAt: string | null;
  offerExpiresAt: string | null;
  convertedBookingId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  trip: {
    id: string;
    scheduledDate: string | null;
    scheduledStartTime: string | null;
    routeName: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    busPlate: string | null;
  };
}

async function request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!data || !data.success) {
    const msg =
      data?.error?.details?.[0]?.message ||
      data?.error?.message ||
      data?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data.data as T;
}

function paginated<T>(endpoint: string) {
  return async (params: Record<string, string> = {}): Promise<{ data: T[]; meta: PaginationMeta }> => {
    const qs = new URLSearchParams({ page: "1", pageSize: "50", ...params });
    const json = await requestEnvelope<T[]>(`${endpoint}?${qs}`);
    return {
      data: json.data,
      meta: json.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
    };
  };
}

async function requestEnvelope<T>(endpoint: string): Promise<{ data: T; meta?: PaginationMeta }> {
  const token = getToken();
  const res = await fetch(`${API}${endpoint}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json().catch(() => null);
  if (!json || !json.success) {
    const msg =
      json?.error?.details?.[0]?.message ||
      json?.error?.message ||
      json?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return { data: json.data as T, meta: json.meta as PaginationMeta | undefined };
}

export interface BookingDashboard {
  date: string;
  today: {
    total: number;
    passengers: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    refunded: number;
  };
  cancellationRate: { today: number; overall: number };
  revenue: {
    today: number;
    todayPaid: number;
    thisWeek: number;
    thisMonth: number;
  };
  revenueTrend: { day: string; revenue: number }[];
  upcomingTrips: {
    id: string;
    scheduledDate: string;
    scheduledStartTime: string | null;
    scheduledEndTime: string | null;
    status: string;
    routeName: string | null;
    origin: string | null;
    destination: string | null;
    busPlate: string | null;
    capacity: number;
    bookedSeats: number;
    totalBookings: number;
  }[];
}

export type CommunicationType =
  | "confirmation"
  | "receipt"
  | "cancellation"
  | "reminder"
  | "delay_alert"
  | "refund";

export interface CommunicationLogEntry {
  id: string;
  tenantId: string;
  bookingId: string | null;
  tripId: string | null;
  type: CommunicationType;
  channel: string;
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  createdAt: string;
}

export const bookingService = {
  list: paginated<Booking>("/bookings"),
  get: (id: string) => request<Booking>(`/bookings/${id}`),
  create: (body: {
    customer_id: string;
    trip_id: string;
    seat_numbers: number[];
    passengers?: {
      passenger_name: string;
      id_number?: string;
      seat_number?: number;
      age?: number;
      special_requirements?: string;
    }[];
    total_amount: number;
    paid_amount?: number;
    notes?: string;
  }) => request<Booking>("/bookings", { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    request<Booking>(`/bookings/${id}`, { method: "PATCH", body }),
  confirm: (id: string) => request<Booking>(`/bookings/${id}/confirm`, { method: "POST" }),
  cancel: (id: string, reason: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: "POST", body: { reason } }),
  refund: (id: string) => request<Booking>(`/bookings/${id}/refund`, { method: "POST" }),
  availability: (tripId: string) => request<TripAvailability>(`/bookings/trips/${tripId}/availability`),
  dashboard: () => request<BookingDashboard>("/bookings/dashboard"),
  communications: (id: string) =>
    request<CommunicationLogEntry[]>(`/bookings/${id}/communications`),
  resendCommunication: (id: string, type: CommunicationType) =>
    request<{ sent: boolean; reason?: string }>(`/bookings/${id}/communications/resend`, {
      method: "POST",
      body: { type },
    }),
  sendTripDelayAlert: (tripId: string, body: { delay_minutes: number; delay_reason?: string }) =>
    request<{ sent: number; total: number }>(`/bookings/trips/${tripId}/delay-alert`, {
      method: "POST",
      body,
    }),
};

export const waitlistService = {
  list: paginated<WaitlistEntry>("/bookings/waitlist"),
  join: (body: { trip_id: string; customer_id: string; number_of_passengers: number }) =>
    request<WaitlistEntry>("/bookings/waitlist", { method: "POST", body }),
  expireOffers: () =>
    request<{ expired: boolean }>("/bookings/waitlist/expire-offers", { method: "POST" }),
  remove: (id: string) =>
    request<{ removed: boolean }>(`/bookings/waitlist/${id}`, { method: "DELETE" }),
};

export const customerService = {
  search: (search: string) =>
    request<Customer[]>(`/bookings/customers?search=${encodeURIComponent(search)}&pageSize=20`),
};

export const tripService = {
  bookable: paginated<TripSummary>("/operations/trips"),
};

export async function downloadBookingTicket(id: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API}/bookings/${id}/ticket`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || "Failed to download ticket");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
