import { query, queryOne } from '../db';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { offerWaitlistedCustomers } from './waitlistService';
import { sendBookingConfirmationEmail, sendPaymentReceipt, sendCancellationNotification } from './customerCommunicationService';
import type {
  CreateBookingInput, UpdateBookingInput, ListBookingsQuery,
} from '../validators/bookings';

interface BookingRow {
  id: string; tenant_id: string; customer_id: string; trip_id: string;
  booking_reference: string; number_of_passengers: number; seat_numbers: number[];
  total_amount: string; paid_amount: string; balance: string;
  status: string; booking_date: string; payment_status: string;
  notes: string | null; cancel_reason: string | null;
  cancelled_at: string | null; refunded_at: string | null;
  created_at: string; updated_at: string;
}

interface BookingDetailRow extends BookingRow {
  customer_name: string; customer_phone: string | null; customer_email: string | null;
  customer_is_company: boolean; customer_company_name: string | null;
  scheduled_date: string | null; scheduled_start_time: string | null;
  route_name: string | null; origin: string | null; destination: string | null;
  trip_status: string | null; bus_plate: string | null;
  bus_make: string | null; bus_model: string | null;
}

interface PassengerRow {
  id: string; booking_id: string; passenger_name: string; id_number: string | null;
  seat_number: number | null; age: number | null; special_requirements: string | null;
}

const ACTIVE_STATUSES = ['pending', 'confirmed'];
const CANCELABLE_STATUSES = ['pending', 'confirmed'];
const BOOKABLE_TRIP_STATUSES = ['scheduled', 'en_route', 'delayed'];

function computePaymentStatus(paid: number, total: number) {
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

function mapBooking(r: BookingDetailRow) {
  return {
    id: r.id, tenantId: r.tenant_id, customerId: r.customer_id, tripId: r.trip_id,
    bookingReference: r.booking_reference, numberOfPassengers: r.number_of_passengers,
    seatNumbers: r.seat_numbers || [],
    totalAmount: parseFloat(r.total_amount), paidAmount: parseFloat(r.paid_amount),
    balance: parseFloat(r.balance), status: r.status, bookingDate: r.booking_date,
    paymentStatus: r.payment_status, notes: r.notes, cancelReason: r.cancel_reason,
    cancelledAt: r.cancelled_at, refundedAt: r.refunded_at,
    createdAt: r.created_at, updatedAt: r.updated_at,
    customer: {
      id: r.customer_id, name: r.customer_name, phone: r.customer_phone,
      email: r.customer_email, isCompany: r.customer_is_company, companyName: r.customer_company_name,
    },
    trip: {
      id: r.trip_id, scheduledDate: r.scheduled_date, scheduledStartTime: r.scheduled_start_time,
      status: r.trip_status, busPlate: r.bus_plate, busMake: r.bus_make, busModel: r.bus_model,
      route: { name: r.route_name, origin: r.origin, destination: r.destination },
    },
  };
}

const SELECT_BOOKING = `
  SELECT bk.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
         c.is_company AS customer_is_company, c.company_name AS customer_company_name,
         t.scheduled_date, t.scheduled_start_time, t.status AS trip_status,
         r.name AS route_name, r.origin, r.destination,
         bus.plate_number AS bus_plate, bus.make AS bus_make, bus.model AS bus_model
  FROM bookings bk
  JOIN customers c ON c.id = bk.customer_id
  JOIN trips t ON t.id = bk.trip_id
  LEFT JOIN routes r ON r.id = t.route_id
  LEFT JOIN buses bus ON bus.id = t.bus_id
`;

async function getPassengers(bookingId: string) {
  const rows = await query<PassengerRow>(
    'SELECT * FROM booking_passengers WHERE booking_id = $1 ORDER BY seat_number ASC NULLS LAST, passenger_name ASC',
    [bookingId]
  );
  return rows.map((p) => ({
    id: p.id, bookingId: p.booking_id, passengerName: p.passenger_name,
    idNumber: p.id_number, seatNumber: p.seat_number, age: p.age,
    specialRequirements: p.special_requirements,
  }));
}

async function requireBooking(tenantId: string, bookingId: string) {
  const row = await queryOne<BookingDetailRow>(
    `${SELECT_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  if (!row) throw new NotFoundError('Booking not found');
  return row;
}

async function nextBookingReference(tenantId: string): Promise<string> {
  const prefix = 'BK';
  const year = new Date().getFullYear();
  const last = await queryOne<{ booking_reference: string }>(
    `SELECT booking_reference FROM bookings WHERE tenant_id = $1 AND booking_reference LIKE $2 ORDER BY booking_reference DESC LIMIT 1`,
    [tenantId, `${prefix}-${year}-%`]
  );
  let seq = 1;
  if (last) {
    const parts = last.booking_reference.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

async function getTripSeatContext(tenantId: string, tripId: string, excludeBookingId?: string) {
  const trip = await queryOne<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            bus.capacity_seated, bus.capacity_standing, bus.plate_number
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses bus ON bus.id = t.bus_id
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
  if (!BOOKABLE_TRIP_STATUSES.includes(trip.status)) {
    throw new ConflictError(`Trip is ${trip.status} and not available for booking`);
  }
  const params: any[] = [tenantId, tripId];
  let excludeSql = '';
  if (excludeBookingId) { params.push(excludeBookingId); excludeSql = `AND bk.id <> $${params.length}`; }
  const occupiedRows = await query<any>(
    `SELECT UNNEST(bk.seat_numbers) AS seat FROM bookings bk
     WHERE bk.tenant_id = $1 AND bk.trip_id = $2 AND bk.status IN ('pending','confirmed') AND bk.deleted_at IS NULL ${excludeSql}`,
    params
  );
  const occupied = new Set<number>(occupiedRows.map((r: any) => Number(r.seat)));
  return { trip, occupied, capacity: Number(trip.capacity_seated || 0) };
}

function validateSeats(seatNumbers: number[], capacity: number, occupied: Set<number>, isUpdate: boolean) {
  const seen = new Set<number>();
  for (const seat of seatNumbers) {
    if (seat < 1 || seat > capacity) {
      throw new ValidationError([{ field: 'seat_numbers', message: `Seat ${seat} is out of range (bus has ${capacity} seats)` }]);
    }
    if (seen.has(seat)) {
      throw new ValidationError([{ field: 'seat_numbers', message: `Seat ${seat} selected more than once` }]);
    }
    seen.add(seat);
    if (occupied.has(seat)) {
      throw new ConflictError(`Seat ${seat} is already taken`);
    }
  }
}

function validatePassengers(passengers: { passenger_name: string; seat_number?: number }[] | undefined, seatNumbers: number[]) {
  if (!passengers) return;
  if (passengers.length !== seatNumbers.length) {
    throw new ValidationError([{ field: 'passengers', message: `Passenger count (${passengers.length}) must match seats (${seatNumbers.length})` }]);
  }
  for (const p of passengers) {
    if (p.seat_number !== undefined && !seatNumbers.includes(p.seat_number)) {
      throw new ValidationError([{ field: 'passengers', message: `Passenger seat ${p.seat_number} is not in the selected seats` }]);
    }
  }
}

export async function getTripAvailability(tenantId: string, tripId: string) {
  const ctx = await getTripSeatContext(tenantId, tripId);
  const available: number[] = [];
  for (let i = 1; i <= ctx.capacity; i++) {
    if (!ctx.occupied.has(i)) available.push(i);
  }
  return {
    tripId,
    capacity: ctx.capacity,
    occupied: [...ctx.occupied].sort((a, b) => a - b),
    available,
    bookedCount: ctx.occupied.size,
  };
}

export async function createBooking(tenantId: string, input: CreateBookingInput) {
  const customer = await queryOne<{ id: string }>(
    'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.customer_id, tenantId]
  );
  if (!customer) throw new NotFoundError('Customer not found');

  const ctx = await getTripSeatContext(tenantId, input.trip_id);
  validateSeats(input.seat_numbers, ctx.capacity, ctx.occupied, false);
  validatePassengers(input.passengers, input.seat_numbers);

  const total = input.total_amount;
  const paid = input.paid_amount || 0;
  if (paid > total) {
    throw new ValidationError([{ field: 'paid_amount', message: 'Paid amount cannot exceed total amount' }]);
  }

  const reference = await nextBookingReference(tenantId);
  const booking = await queryOne<BookingRow>(
    `INSERT INTO bookings (tenant_id, customer_id, trip_id, booking_reference, number_of_passengers, seat_numbers, total_amount, paid_amount, balance, status, booking_date, payment_status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NOW(),$10,$11) RETURNING *`,
    [tenantId, input.customer_id, input.trip_id, reference,
     input.seat_numbers.length, input.seat_numbers, total, paid, total - paid,
     computePaymentStatus(paid, total), input.notes || null]
  );

  if (input.passengers) {
    for (const p of input.passengers) {
      await query(
        `INSERT INTO booking_passengers (booking_id, passenger_name, id_number, seat_number, age, special_requirements)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [booking!.id, p.passenger_name, p.id_number || null, p.seat_number ?? null, p.age ?? null, p.special_requirements || null]
      );
    }
  }

  await query(
    `UPDATE booking_waitlist SET status = 'converted', converted_booking_id = $1, updated_at = NOW()
     WHERE tenant_id = $2 AND trip_id = $3 AND customer_id = $4
     AND status = 'offered' AND deleted_at IS NULL`,
    [booking!.id, tenantId, input.trip_id, input.customer_id]
  );

  sendBookingConfirmationEmail(tenantId, booking!.id).catch(() => {});
  if (paid > 0) sendPaymentReceipt(tenantId, booking!.id).catch(() => {});

  return getBookingById(tenantId, booking!.id);
}

export async function listBookings(tenantId: string, params: ListBookingsQuery) {
  const conditions: string[] = ['bk.tenant_id = $1', 'bk.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.status) { conditions.push(`bk.status = $${idx++}`); values.push(params.status); }
  if (params.payment_status) { conditions.push(`bk.payment_status = $${idx++}`); values.push(params.payment_status); }
  if (params.customer_id) { conditions.push(`bk.customer_id = $${idx++}`); values.push(params.customer_id); }
  if (params.trip_id) { conditions.push(`bk.trip_id = $${idx++}`); values.push(params.trip_id); }
  if (params.start_date) { conditions.push(`bk.booking_date >= $${idx++}`); values.push(params.start_date); }
  if (params.end_date) { conditions.push(`bk.booking_date <= $${idx++}`); values.push(`${params.end_date} 23:59:59`); }
  if (params.search) {
    conditions.push(`(bk.booking_reference ILIKE $${idx} OR c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx} OR c.id_number ILIKE $${idx} OR r.name ILIKE $${idx} OR r.origin ILIKE $${idx} OR r.destination ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM bookings bk JOIN customers c ON c.id = bk.customer_id LEFT JOIN routes r ON r.id = (SELECT route_id FROM trips t WHERE t.id = bk.trip_id) WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<BookingDetailRow>(
    `${SELECT_BOOKING} WHERE ${where}
     ORDER BY bk.booking_date DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapBooking), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getBookingById(tenantId: string, bookingId: string) {
  const booking = await requireBooking(tenantId, bookingId);
  const passengers = await getPassengers(bookingId);
  return { ...mapBooking(booking), passengers };
}

export async function updateBooking(tenantId: string, bookingId: string, input: UpdateBookingInput) {
  const booking = await requireBooking(tenantId, bookingId);
  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw new ConflictError(`Only pending or confirmed bookings can be updated (current: ${booking.status})`);
  }

  let seatNumbers = booking.seat_numbers || [];
  if (input.seat_numbers) {
    const ctx = await getTripSeatContext(tenantId, booking.trip_id, bookingId);
    validateSeats(input.seat_numbers, ctx.capacity, ctx.occupied, true);
    seatNumbers = input.seat_numbers;
  }
  if (input.passengers) {
    validatePassengers(input.passengers, seatNumbers);
  }

  const total = input.total_amount !== undefined ? input.total_amount : parseFloat(booking.total_amount);
  const paid = input.paid_amount !== undefined ? input.paid_amount : parseFloat(booking.paid_amount);
  if (paid > total) {
    throw new ValidationError([{ field: 'paid_amount', message: 'Paid amount cannot exceed total amount' }]);
  }
  const balance = Math.max(0, total - paid);

  const sets: string[] = ['updated_at = NOW()'];
  const values: any[] = [];
  let idx = 1;
  if (input.seat_numbers) {
    sets.push(`seat_numbers = $${idx}::int[]`); values.push(input.seat_numbers); idx++;
    sets.push(`number_of_passengers = $${idx}`); values.push(input.seat_numbers.length); idx++;
  }
  if (input.total_amount !== undefined) { sets.push(`total_amount = $${idx}`); values.push(total); idx++; }
  if (input.paid_amount !== undefined) { sets.push(`paid_amount = $${idx}`); values.push(paid); idx++; }
  if (input.paid_amount !== undefined || input.total_amount !== undefined) {
    sets.push(`balance = $${idx}`); values.push(balance); idx++;
    sets.push(`payment_status = $${idx}`); values.push(computePaymentStatus(paid, total)); idx++;
  }
  if (input.notes !== undefined) { sets.push(`notes = $${idx}`); values.push(input.notes || null); idx++; }

  values.push(bookingId, tenantId);
  await query(
    `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL`,
    values
  );

  if (input.passengers !== undefined) {
    await query('DELETE FROM booking_passengers WHERE booking_id = $1', [bookingId]);
    for (const p of input.passengers) {
      await query(
        `INSERT INTO booking_passengers (booking_id, passenger_name, id_number, seat_number, age, special_requirements)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [bookingId, p.passenger_name, p.id_number || null, p.seat_number ?? null, p.age ?? null, p.special_requirements || null]
      );
    }
  }
  if (input.paid_amount !== undefined && paid > parseFloat(booking.paid_amount)) {
    sendPaymentReceipt(tenantId, bookingId).catch(() => {});
  }
  return getBookingById(tenantId, bookingId);
}

export async function confirmBooking(tenantId: string, bookingId: string) {
  const booking = await requireBooking(tenantId, bookingId);
  if (booking.status !== 'pending') {
    throw new ConflictError(`Only pending bookings can be confirmed (current: ${booking.status})`);
  }
  await query(
    `UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  return getBookingById(tenantId, bookingId);
}

export async function cancelBooking(tenantId: string, bookingId: string, reason: string) {
  const booking = await requireBooking(tenantId, bookingId);
  if (!CANCELABLE_STATUSES.includes(booking.status)) {
    throw new ConflictError(`Bookings in status ${booking.status} cannot be cancelled`);
  }
  if (!reason.trim()) {
    throw new ValidationError([{ field: 'reason', message: 'Cancellation reason is required' }]);
  }
  await query(
    `UPDATE bookings SET status = 'cancelled', cancel_reason = $1, cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
    [reason.trim(), bookingId, tenantId]
  );
  try {
    await offerWaitlistedCustomers(tenantId, booking.trip_id);
  } catch (err) {
    console.error('Failed to process waitlist after cancellation:', err);
  }
  sendCancellationNotification(tenantId, bookingId, reason.trim()).catch(() => {});
  return getBookingById(tenantId, bookingId);
}

export async function refundBooking(tenantId: string, bookingId: string) {
  const booking = await requireBooking(tenantId, bookingId);
  if (booking.status === 'refunded') {
    throw new ConflictError('Booking is already refunded');
  }
  if (!['confirmed', 'cancelled'].includes(booking.status)) {
    throw new ConflictError(`Only confirmed or cancelled bookings can be refunded (current: ${booking.status})`);
  }
  const paid = parseFloat(booking.paid_amount);
  if (paid <= 0) {
    throw new ValidationError([{ field: 'paid_amount', message: 'Nothing to refund — no payment recorded on this booking' }]);
  }
  const total = parseFloat(booking.total_amount);
  await query(
    `UPDATE bookings SET status = 'refunded', payment_status = 'refunded', paid_amount = 0, balance = $1, refunded_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
    [total, bookingId, tenantId]
  );
  try {
    await offerWaitlistedCustomers(tenantId, booking.trip_id);
  } catch (err) {
    console.error('Failed to process waitlist after refund:', err);
  }
  sendPaymentReceipt(tenantId, bookingId, 'refund').catch(() => {});
  return getBookingById(tenantId, bookingId);
}

export async function getBookingDashboard(tenantId: string) {
  const [todayRows, rateToday, rateAll, revenueRows, trendRows, trips] = await Promise.all([
    query<any>(
      `SELECT status, COUNT(*)::int AS count FROM bookings
       WHERE tenant_id = $1 AND deleted_at IS NULL AND booking_date::date = CURRENT_DATE
       GROUP BY status`,
      [tenantId]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM bookings
       WHERE tenant_id = $1 AND deleted_at IS NULL AND booking_date::date = CURRENT_DATE`,
      [tenantId]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    ),
    query<any>(
      `SELECT
        SUM(CASE WHEN booking_date::date = CURRENT_DATE THEN total_amount ELSE 0 END)::numeric AS today_total,
        SUM(CASE WHEN booking_date::date = CURRENT_DATE THEN paid_amount ELSE 0 END)::numeric AS today_paid,
        SUM(CASE WHEN booking_date >= date_trunc('week', CURRENT_DATE) THEN total_amount ELSE 0 END)::numeric AS week_total,
        SUM(CASE WHEN booking_date >= date_trunc('month', CURRENT_DATE) THEN total_amount ELSE 0 END)::numeric AS month_total
       FROM bookings
       WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'`,
      [tenantId]
    ),
    query<any>(
      `SELECT booking_date::date AS day, COALESCE(SUM(total_amount), 0)::numeric AS revenue
       FROM bookings
       WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'
         AND booking_date >= CURRENT_DATE - 13
       GROUP BY booking_date::date
       ORDER BY booking_date::date ASC`,
      [tenantId]
    ),
    query<any>(
      `SELECT t.id, t.scheduled_date, t.scheduled_start_time, t.scheduled_end_time, t.status,
              r.name AS route_name, r.origin, r.destination,
              bus.plate_number, bus.capacity_seated,
              COUNT(bk.id) FILTER (WHERE bk.status IN ('pending','confirmed'))::int AS booked_seats,
              COUNT(bk.id)::int AS total_bookings
       FROM trips t
       LEFT JOIN routes r ON r.id = t.route_id
       LEFT JOIN buses bus ON bus.id = t.bus_id
       LEFT JOIN bookings bk ON bk.trip_id = t.id AND bk.deleted_at IS NULL
       WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
         AND t.scheduled_date >= CURRENT_DATE
         AND t.status NOT IN ('completed','cancelled')
       GROUP BY t.id, r.name, r.origin, r.destination, bus.plate_number, bus.capacity_seated
       ORDER BY t.scheduled_date ASC, t.scheduled_start_time ASC
       LIMIT 10`,
      [tenantId]
    ),
  ]);

  const todayTotal = parseInt(rateToday?.count || '0', 10);
  const allTotal = parseInt(rateAll?.count || '0', 10);
  const cancelledToday = todayRows.find((r: any) => r.status === 'cancelled')?.count || 0;
  const cancelledAll = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'cancelled'`,
    [tenantId]
  );

  const byStatus: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, refunded: 0, completed: 0 };
  for (const r of todayRows) byStatus[r.status] = r.count || 0;

  const todaySeats = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM bookings
     WHERE tenant_id = $1 AND deleted_at IS NULL AND booking_date::date = CURRENT_DATE`,
    [tenantId]
  );

  const revenue = revenueRows[0] || {};
  const countsByDay = new Map(trendRows.map((r: any) => [String(r.day).slice(0, 10), parseFloat(r.revenue)]));
  const trend: { day: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ day: key, revenue: countsByDay.get(key) || 0 });
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    today: {
      total: todayTotal,
      passengers: parseInt(todaySeats?.count || '0', 10),
      pending: byStatus.pending,
      confirmed: byStatus.confirmed,
      cancelled: cancelledToday,
      refunded: byStatus.refunded,
    },
    cancellationRate: {
      today: todayTotal > 0 ? Math.round((cancelledToday / todayTotal) * 1000) / 10 : 0,
      overall: allTotal > 0 ? Math.round((parseInt(cancelledAll?.count || '0', 10) / allTotal) * 1000) / 10 : 0,
    },
    revenue: {
      today: parseFloat(revenue.today_total || '0'),
      todayPaid: parseFloat(revenue.today_paid || '0'),
      thisWeek: parseFloat(revenue.week_total || '0'),
      thisMonth: parseFloat(revenue.month_total || '0'),
    },
    revenueTrend: trend,
    upcomingTrips: trips.map((t: any) => ({
      id: t.id,
      scheduledDate: t.scheduled_date,
      scheduledStartTime: t.scheduled_start_time,
      scheduledEndTime: t.scheduled_end_time,
      status: t.status,
      routeName: t.route_name,
      origin: t.origin,
      destination: t.destination,
      busPlate: t.plate_number,
      capacity: Number(t.capacity_seated || 0),
      bookedSeats: t.booked_seats,
      totalBookings: t.total_bookings,
    })),
  };
}

export async function generateTicketPdf(tenantId: string, bookingId: string): Promise<Buffer> {
  const booking = await requireBooking(tenantId, bookingId);
  const passengers = await getPassengers(bookingId);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  doc.fontSize(20).text('BOOKING TICKET', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(24).text(booking.booking_reference, { align: 'center' });
  doc.moveDown(0.6);
  doc.fontSize(9).text(`Issued: ${new Date().toLocaleDateString()}  ·  Status: ${booking.status}  ·  Payment: ${booking.payment_status}`, { align: 'center' });
  doc.moveDown(1.2);

  doc.fontSize(13).text('Passenger / Customer', { underline: true });
  doc.fontSize(11).text(`Name: ${booking.customer_name}`);
  if (booking.customer_phone) doc.text(`Phone: ${booking.customer_phone}`);
  if (booking.customer_email) doc.text(`Email: ${booking.customer_email}`);
  doc.moveDown(0.8);

  doc.fontSize(13).text('Trip', { underline: true });
  doc.fontSize(11).text(`Route: ${booking.origin || ''} → ${booking.destination || ''}${booking.route_name ? ` (${booking.route_name})` : ''}`);
  doc.text(`Date: ${booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : '—'}  ·  Time: ${booking.scheduled_start_time || '—'}`);
  if (booking.bus_plate) doc.text(`Bus: ${booking.bus_plate}${booking.bus_make ? ` (${booking.bus_make} ${booking.bus_model})` : ''}`);
  doc.text(`Seats: ${(booking.seat_numbers || []).join(', ')}`);
  doc.moveDown(0.8);

  doc.fontSize(13).text(`Passengers (${passengers.length})`, { underline: true });
  if (passengers.length > 0) {
    passengers.forEach((p: any) => {
      doc.fontSize(10).text(`- ${p.passengerName}${p.seatNumber ? ` — Seat ${p.seatNumber}` : ''}${p.age ? ` (${p.age})` : ''}${p.idNumber ? ` · ID ${p.idNumber}` : ''}`);
    });
  } else {
    doc.fontSize(10).text('No passenger details recorded.');
  }
  doc.moveDown(1);

  doc.fontSize(13).text('Payment', { underline: true });
  doc.fontSize(11).text(`Total: ${parseFloat(booking.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR`);
  doc.text(`Paid: ${parseFloat(booking.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR`);
  doc.text(`Balance: ${parseFloat(booking.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR`);
  if (booking.notes) {
    doc.moveDown(0.6);
    doc.fontSize(10).text(`Notes: ${booking.notes}`);
  }

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}