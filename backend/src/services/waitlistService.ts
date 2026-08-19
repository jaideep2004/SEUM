import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import { config } from '../config';
import { createNotification, emailChannelEnabled } from './notificationService';
import { sendEmailAsync } from './emailService';
import type { JoinWaitlistInput, ListWaitlistQuery } from '../validators/bookings';

const WAITLIST_STATUSES = ['waiting', 'offered', 'converted', 'expired'];
const OFFER_WINDOW_HOURS = 24;

interface WaitlistRow {
  id: string; tenant_id: string; trip_id: string; customer_id: string;
  number_of_passengers: number; status: string; created_by: string | null;
  offered_at: string | null; offer_expires_at: string | null;
  converted_booking_id: string | null; created_at: string; updated_at: string;
  customer_name: string; customer_phone: string | null;
  scheduled_date: string | null; scheduled_start_time: string | null;
  route_name: string | null; origin: string | null; destination: string | null;
  trip_status: string | null; bus_plate: string | null;
}

function mapWaitlist(r: WaitlistRow) {
  return {
    id: r.id, tenantId: r.tenant_id, tripId: r.trip_id, customerId: r.customer_id,
    numberOfPassengers: r.number_of_passengers, status: r.status,
    createdBy: r.created_by, offeredAt: r.offered_at, offerExpiresAt: r.offer_expires_at,
    convertedBookingId: r.converted_booking_id, createdAt: r.created_at, updatedAt: r.updated_at,
    customer: {
      id: r.customer_id, name: r.customer_name, phone: r.customer_phone,
    },
    trip: {
      id: r.trip_id, scheduledDate: r.scheduled_date, scheduledStartTime: r.scheduled_start_time,
      routeName: r.route_name, origin: r.origin, destination: r.destination,
      status: r.trip_status, busPlate: r.bus_plate,
    },
  };
}

const SELECT_WAITLIST = `
  SELECT wl.*, c.name AS customer_name, c.phone AS customer_phone,
         t.scheduled_date, t.scheduled_start_time, t.status AS trip_status,
         r.name AS route_name, r.origin, r.destination,
         bus.plate_number AS bus_plate
  FROM booking_waitlist wl
  JOIN customers c ON c.id = wl.customer_id
  JOIN trips t ON t.id = wl.trip_id
  LEFT JOIN routes r ON r.id = t.route_id
  LEFT JOIN buses bus ON bus.id = t.bus_id
`;

async function requireWaitlistEntry(tenantId: string, id: string) {
  const row = await queryOne<WaitlistRow>(
    `${SELECT_WAITLIST} WHERE wl.id = $1 AND wl.tenant_id = $2 AND wl.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Waitlist entry not found');
  return row;
}

async function getTripContext(tenantId: string, tripId: string) {
  const trip = await queryOne<any>(
    `SELECT t.*, bus.capacity_seated
     FROM trips t
     LEFT JOIN buses bus ON bus.id = t.bus_id
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
  return trip;
}

async function getFreeSeats(tenantId: string, tripId: string): Promise<number> {
  const trip = await getTripContext(tenantId, tripId);
  const occupied = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM bookings
     WHERE tenant_id = $1 AND trip_id = $2 AND status IN ('pending','confirmed') AND deleted_at IS NULL`,
    [tenantId, tripId]
  );
  return Math.max(0, Number(trip.capacity_seated || 0) - Number(occupied?.count || 0));
}

async function notifyOfferCreated(tenantId: string, entry: WaitlistRow) {
  const title = 'Waitlist seat offer';
  const message = `${entry.customer_name} (${entry.number_of_passengers} seat${entry.number_of_passengers > 1 ? 's' : ''}) on ${entry.origin || ''} → ${entry.destination || ''}`;
  const staff = await query<{ id: string; email: string; name: string }>(
    `SELECT DISTINCT u.id, u.email, u.name FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE u.tenant_id = $1 AND u.is_active = true AND r.name IN ('customer_service','operations_manager','company_admin')`,
    [tenantId]
  );
  for (const s of staff) {
    await createNotification({
      tenantId, userId: s.id, type: 'waitlist_offer', title,
      message, resource: 'booking_waitlist', resourceId: entry.id,
    });
    if (s.email && (await emailChannelEnabled(tenantId, s.id, 'waitlist_offer'))) {
      const date = entry.scheduled_date
        ? new Date(entry.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
      sendEmailAsync({
        to: s.email,
        subject: `Seat offer for waitlisted customer — ${entry.customer_name}`,
        preheader: `${entry.customer_name} has been offered ${entry.number_of_passengers} seat(s) on ${entry.origin || ''} → ${entry.destination || ''}.`,
        heading: 'Waitlist seat is available',
        bodyHtml: `<p>A seat${entry.number_of_passengers > 1 ? 's just opened up' : ''} for a waitlisted customer. You have <strong>24 hours</strong> to confirm the booking before the offer expires.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:4px 0 6px 0;">
            <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Customer</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(entry.customer_name)}</td></tr>
            <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Route</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(entry.origin || '—')} → ${escapeHtml(entry.destination || '—')}</td></tr>
            <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Trip date</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${date}</td></tr>
            <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Seats</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${entry.number_of_passengers}</td></tr>
          </table>`,
        action: {
          label: 'Open waitlist',
          url: `${config.appUrl}/dashboard/bookings/waitlist`,
        },
        note: 'Contact the customer to confirm. The offer expires automatically 24 hours after it was made.',
      });
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Auto-offer waitlisted customers in FIFO order when seats free up.
 * Called after a booking is cancelled or refunded.
 */
export async function offerWaitlistedCustomers(tenantId: string, tripId: string) {
  await query(
    `UPDATE booking_waitlist SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND trip_id = $2 AND status = 'offered' AND offer_expires_at < NOW() AND deleted_at IS NULL`,
    [tenantId, tripId]
  );

  const waiting = await query<WaitlistRow>(
    `${SELECT_WAITLIST} WHERE wl.tenant_id = $1 AND wl.trip_id = $2
     AND wl.status = 'waiting' AND wl.deleted_at IS NULL
     ORDER BY wl.created_at ASC`,
    [tenantId, tripId]
  );
  if (waiting.length === 0) return { offered: 0 };

  let freeSeats = await getFreeSeats(tenantId, tripId);
  let offered = 0;
  for (const entry of waiting) {
    if (entry.number_of_passengers > freeSeats) continue;
    await query(
      `UPDATE booking_waitlist SET status = 'offered', offered_at = NOW(),
       offer_expires_at = NOW() + ($1 * INTERVAL '1 hour'), updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [OFFER_WINDOW_HOURS, entry.id, tenantId]
    );
    freeSeats -= entry.number_of_passengers;
    offered++;
    entry.status = 'offered';
    await notifyOfferCreated(tenantId, entry);
  }
  return { offered };
}

export async function joinWaitlist(tenantId: string, input: JoinWaitlistInput, userId?: string) {
  const customer = await queryOne<{ id: string }>(
    'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.customer_id, tenantId]
  );
  if (!customer) throw new NotFoundError('Customer not found');

  const trip = await getTripContext(tenantId, input.trip_id);
  if (!['scheduled', 'en_route', 'delayed'].includes(trip.status)) {
    throw new ConflictError(`Trip is ${trip.status} and cannot be joined on the waitlist`);
  }

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM booking_waitlist
     WHERE tenant_id = $1 AND trip_id = $2 AND customer_id = $3
     AND status IN ('waiting','offered') AND deleted_at IS NULL`,
    [tenantId, input.trip_id, input.customer_id]
  );
  if (existing) {
    throw new ConflictError('Customer is already on the waitlist for this trip');
  }

  const entry = await queryOne<WaitlistRow>(
    `INSERT INTO booking_waitlist (tenant_id, trip_id, customer_id, number_of_passengers, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tenantId, input.trip_id, input.customer_id, input.number_of_passengers, userId || null]
  );
  return getWaitlistEntryById(tenantId, entry!.id);
}

export async function getWaitlistEntryById(tenantId: string, id: string) {
  const row = await requireWaitlistEntry(tenantId, id);
  return mapWaitlist(row);
}

export async function listWaitlist(tenantId: string, params: ListWaitlistQuery) {
  await query(
    `UPDATE booking_waitlist SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'offered' AND offer_expires_at < NOW() AND deleted_at IS NULL`,
    [tenantId]
  );

  const conditions: string[] = ['wl.tenant_id = $1', 'wl.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.trip_id) { conditions.push(`wl.trip_id = $${idx++}`); values.push(params.trip_id); }
  if (params.status) { conditions.push(`wl.status = $${idx++}`); values.push(params.status); }
  if (params.customer_id) { conditions.push(`wl.customer_id = $${idx++}`); values.push(params.customer_id); }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM booking_waitlist wl WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<WaitlistRow>(
    `${SELECT_WAITLIST} WHERE ${where}
     ORDER BY wl.created_at ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapWaitlist), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function expireOffers(tenantId: string) {
  await query(
    `UPDATE booking_waitlist SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'offered' AND offer_expires_at < NOW() AND deleted_at IS NULL`,
    [tenantId]
  );
  return { expired: true };
}

export async function removeWaitlistEntry(tenantId: string, id: string) {
  const entry = await requireWaitlistEntry(tenantId, id);
  if (entry.status === 'converted') {
    throw new ConflictError('Converted waitlist entries cannot be removed');
  }
  await query(
    `UPDATE booking_waitlist SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return { removed: true };
}

export function isWaitlistStatus(status: string): boolean {
  return WAITLIST_STATUSES.includes(status);
}
