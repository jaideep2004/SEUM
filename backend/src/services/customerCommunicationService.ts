import { query, queryOne } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sendEmail } from './emailService';

export type CommunicationType =
  | 'confirmation'
  | 'receipt'
  | 'cancellation'
  | 'reminder'
  | 'delay_alert'
  | 'refund';

interface BookingCtx {
  id: string; tenant_id: string; booking_reference: string;
  total_amount: string; paid_amount: string; balance: string;
  status: string; payment_status: string;
  customer_name: string; customer_email: string | null; customer_phone: string | null;
  scheduled_date: string | null; scheduled_start_time: string | null;
  route_name: string | null; origin: string | null; destination: string | null;
  trip_id: string; bus_plate: string | null;
}

interface CommunicationRow {
  id: string; tenant_id: string; booking_id: string | null; trip_id: string | null;
  type: string; channel: string; recipient_email: string; subject: string;
  status: string; error_message: string | null; created_at: string;
}

const FETCH_BOOKING = `
  SELECT bk.id, bk.tenant_id, bk.booking_reference, bk.total_amount, bk.paid_amount, bk.balance,
         bk.status, bk.payment_status,
         c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
         t.scheduled_date, t.scheduled_start_time, t.id AS trip_id,
         r.name AS route_name, r.origin, r.destination, bus.plate_number AS bus_plate
  FROM bookings bk
  JOIN customers c ON c.id = bk.customer_id
  JOIN trips t ON t.id = bk.trip_id
  LEFT JOIN routes r ON r.id = t.route_id
  LEFT JOIN buses bus ON bus.id = t.bus_id
`;

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n: string | null): string {
  return `${parseFloat(n || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}

function tripRowHtml(b: BookingCtx): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:4px 0 6px 0;">
    <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Route</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(b.origin || '—')} → ${escapeHtml(b.destination || '—')}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Date</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${fmtDate(b.scheduled_date)}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Time</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(b.scheduled_start_time || '—')}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Bus</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(b.bus_plate || '—')}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Reference</td><td style="padding:6px 0;font-size:13px;color:#0f172a;"><strong>${escapeHtml(b.booking_reference)}</strong></td></tr>
  </table>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function logCommunication(input: {
  tenantId: string; bookingId?: string; tripId?: string; type: CommunicationType;
  recipientEmail: string; subject: string; status: 'sent' | 'failed'; errorMessage?: string;
  createdBy?: string;
}) {
  try {
    await query(
      `INSERT INTO booking_communications (tenant_id, booking_id, trip_id, type, channel, recipient_email, subject, status, error_message, created_by)
       VALUES ($1,$2,$3,$4,'email',$5,$6,$7,$8,$9)`,
      [input.tenantId, input.bookingId || null, input.tripId || null, input.type,
       input.recipientEmail, input.subject, input.status, input.errorMessage || null, input.createdBy || null]
    );
  } catch (err) {
    logger.error({ err }, 'Failed to log communication');
  }
}

export async function sendBookingConfirmationEmail(tenantId: string, bookingId: string) {
  const booking = await queryOne<BookingCtx>(
    `${FETCH_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  if (!booking || !booking.customer_email) return { sent: false, reason: booking ? 'no_email' : 'not_found' };

  const ok = await sendEmail({
    to: booking.customer_email,
    subject: `Booking confirmed — ${booking.booking_reference}`,
    preheader: `Your seat on ${booking.origin || ''} → ${booking.destination || ''} is confirmed.`,
    heading: 'Your booking is confirmed',
    bodyHtml: `<p>Hi ${escapeHtml(booking.customer_name)}, thank you for booking with SEUM. Your trip is confirmed:</p>${tripRowHtml(booking)}
      <p>Status: <strong>Confirmed</strong> · Payment: <strong>${escapeHtml(booking.payment_status)}</strong></p>`,
    action: {
      label: 'View booking',
      url: `${config.appUrl}/dashboard/bookings/${booking.id}`,
    },
    note: 'Please arrive at the departure point 30 minutes before the scheduled time.',
  });

  await logCommunication({
    tenantId, bookingId: booking.id, tripId: booking.trip_id, type: 'confirmation',
    recipientEmail: booking.customer_email, subject: `Booking confirmed — ${booking.booking_reference}`,
    status: ok ? 'sent' : 'failed',
  });
  return { sent: ok, bookingId: booking.id, email: booking.customer_email };
}

export async function sendCancellationNotification(tenantId: string, bookingId: string, reason?: string) {
  const booking = await queryOne<BookingCtx>(
    `${FETCH_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  if (!booking || !booking.customer_email) return { sent: false, reason: booking ? 'no_email' : 'not_found' };

  const ok = await sendEmail({
    to: booking.customer_email,
    subject: `Booking cancelled — ${booking.booking_reference}`,
    preheader: `Your booking ${booking.booking_reference} has been cancelled.`,
    heading: 'Booking cancelled',
    bodyHtml: `<p>Hi ${escapeHtml(booking.customer_name)}, your booking has been cancelled.</p>${tripRowHtml(booking)}
      ${reason ? `<p>Cancellation reason: <strong>${escapeHtml(reason)}</strong></p>` : ''}`,
    note: 'If you already paid, the refund will be processed through your original payment method or by our finance team.',
  });

  await logCommunication({
    tenantId, bookingId: booking.id, tripId: booking.trip_id, type: 'cancellation',
    recipientEmail: booking.customer_email, subject: `Booking cancelled — ${booking.booking_reference}`,
    status: ok ? 'sent' : 'failed',
  });
  return { sent: ok, bookingId: booking.id, email: booking.customer_email };
}

export async function sendPaymentReceipt(tenantId: string, bookingId: string, kind: 'receipt' | 'refund' = 'receipt') {
  const booking = await queryOne<BookingCtx>(
    `${FETCH_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  if (!booking || !booking.customer_email) return { sent: false, reason: booking ? 'no_email' : 'not_found' };

  const isRefund = kind === 'refund' || booking.status === 'refunded';
  const ok = await sendEmail({
    to: booking.customer_email,
    subject: isRefund ? `Refund receipt — ${booking.booking_reference}` : `Payment receipt — ${booking.booking_reference}`,
    preheader: isRefund ? 'Your refund has been processed.' : 'Payment received for your booking.',
    heading: isRefund ? 'Refund processed' : 'Payment received',
    bodyHtml: `<p>Hi ${escapeHtml(booking.customer_name)},</p>${tripRowHtml(booking)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:4px 0 6px 0;">
        <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Total</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${fmtMoney(booking.total_amount)}</td></tr>
        <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">${isRefund ? 'Refunded' : 'Paid'}</td><td style="padding:6px 0;font-size:13px;color:#0f172a;"><strong>${isRefund ? fmtMoney(booking.total_amount) : fmtMoney(booking.paid_amount)}</strong></td></tr>
        <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;">Balance</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${fmtMoney(booking.balance)}</td></tr>
      </table>`,
    note: isRefund ? 'If you have questions about this refund, contact our finance team.' : 'Thank you for travelling with SEUM.',
  });

  await logCommunication({
    tenantId, bookingId: booking.id, tripId: booking.trip_id, type: isRefund ? 'refund' : 'receipt',
    recipientEmail: booking.customer_email, subject: isRefund ? `Refund receipt — ${booking.booking_reference}` : `Payment receipt — ${booking.booking_reference}`,
    status: ok ? 'sent' : 'failed',
  });
  return { sent: ok, bookingId: booking.id, email: booking.customer_email };
}

export async function sendTripReminderEmail(tenantId: string, bookingId: string) {
  const booking = await queryOne<BookingCtx>(
    `${FETCH_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
    [bookingId, tenantId]
  );
  if (!booking || !booking.customer_email) return { sent: false, reason: booking ? 'no_email' : 'not_found' };
  if (!['pending', 'confirmed'].includes(booking.status)) return { sent: false, reason: 'inactive_booking' };

  const ok = await sendEmail({
    to: booking.customer_email,
    subject: `Trip reminder — departing tomorrow · ${booking.booking_reference}`,
    preheader: `Reminder: your trip ${booking.origin || ''} → ${booking.destination || ''} departs tomorrow.`,
    heading: 'Your trip is tomorrow',
    bodyHtml: `<p>Hi ${escapeHtml(booking.customer_name)}, this is a friendly reminder about your upcoming trip:</p>${tripRowHtml(booking)}`,
    action: {
      label: 'View booking',
      url: `${config.appUrl}/dashboard/bookings/${booking.id}`,
    },
    note: 'Please arrive 30 minutes before departure. Carry your booking reference and a valid ID.',
  });

  await logCommunication({
    tenantId, bookingId: booking.id, tripId: booking.trip_id, type: 'reminder',
    recipientEmail: booking.customer_email, subject: `Trip reminder — departing tomorrow · ${booking.booking_reference}`,
    status: ok ? 'sent' : 'failed',
  });
  return { sent: ok, bookingId: booking.id, email: booking.customer_email };
}

export async function sendTripDelayAlerts(tenantId: string, tripId: string, delayMinutes: number, reason?: string) {
  const bookings = await query<BookingCtx>(
    `${FETCH_BOOKING} WHERE bk.tenant_id = $1 AND bk.trip_id = $2 AND bk.deleted_at IS NULL AND bk.status IN ('pending','confirmed')`,
    [tenantId, tripId]
  );
  let sentCount = 0;
  for (const b of bookings) {
    if (!b.customer_email) continue;
    const ok = await sendEmail({
      to: b.customer_email,
      subject: `Trip delayed — ${b.origin || ''} → ${b.destination || ''}`,
      preheader: `Your trip has been delayed by ${delayMinutes} minutes.`,
      heading: 'Trip delayed',
      bodyHtml: `<p>Hi ${escapeHtml(b.customer_name)},</p><p>Your trip has been <strong>delayed by ${delayMinutes} minute(s)</strong>.</p>${tripRowHtml(b)}
        ${reason ? `<p>Reason: <strong>${escapeHtml(reason)}</strong></p>` : ''}
        <p>New departure time will be communicated as soon as confirmed.</p>`,
      note: 'We apologise for the inconvenience. Thank you for your patience.',
    });
    await logCommunication({
      tenantId, bookingId: b.id, tripId: b.trip_id, type: 'delay_alert',
      recipientEmail: b.customer_email, subject: `Trip delayed — ${b.origin || ''} → ${b.destination || ''}`,
      status: ok ? 'sent' : 'failed',
    });
    if (ok) sentCount++;
  }
  return { sent: sentCount, total: bookings.length };
}

export async function listCommunications(tenantId: string, bookingId: string) {
  const rows = await query<CommunicationRow>(
    `SELECT * FROM booking_communications
     WHERE tenant_id = $1 AND booking_id = $2
     ORDER BY created_at DESC`,
    [tenantId, bookingId]
  );
  return rows.map((r) => ({
    id: r.id, tenantId: r.tenant_id, bookingId: r.booking_id, tripId: r.trip_id,
    type: r.type, channel: r.channel, recipientEmail: r.recipient_email,
    subject: r.subject, status: r.status, errorMessage: r.error_message, createdAt: r.created_at,
  }));
}

export async function resendCommunication(tenantId: string, bookingId: string, type: CommunicationType) {
  switch (type) {
    case 'confirmation': return sendBookingConfirmationEmail(tenantId, bookingId);
    case 'receipt': return sendPaymentReceipt(tenantId, bookingId, 'receipt');
    case 'reminder': return sendTripReminderEmail(tenantId, bookingId);
    case 'cancellation': return sendCancellationNotification(tenantId, bookingId);
    case 'delay_alert': {
      const booking = await queryOne<BookingCtx>(
        `${FETCH_BOOKING} WHERE bk.id = $1 AND bk.tenant_id = $2 AND bk.deleted_at IS NULL`,
        [bookingId, tenantId]
      );
      if (!booking) return { sent: false, reason: 'not_found' };
      return sendTripDelayAlerts(tenantId, booking.trip_id, 0);
    }
    default: return { sent: false, reason: 'unsupported' };
  }
}

/**
 * Hourly job: send trip reminders to customers whose trip departs in ~24h.
 * Deduplicated via the communication log (type = reminder).
 */
export async function runReminderJob(): Promise<number> {
  const tenants = await query<{ id: string }>(
    `SELECT DISTINCT tenant_id AS id FROM trips WHERE deleted_at IS NULL`
  );
  let sent = 0;
  for (const t of tenants) {
    const due = await query<{ id: string }>(
      `SELECT id FROM trips
       WHERE tenant_id = $1 AND deleted_at IS NULL
         AND status IN ('scheduled','delayed')
         AND scheduled_date = (CURRENT_DATE + 1)
         AND scheduled_start_time BETWEEN (TO_CHAR(NOW() + INTERVAL '20 hours', 'HH24:MI'))::time AND (TO_CHAR(NOW() + INTERVAL '28 hours', 'HH24:MI'))::time`,
      [t.id]
    );
    for (const trip of due) {
      const bookings = await query<{ id: string }>(
        `SELECT bk.id FROM bookings bk
         WHERE bk.tenant_id = $1 AND bk.trip_id = $2 AND bk.deleted_at IS NULL
           AND bk.status IN ('pending','confirmed')
           AND NOT EXISTS (
             SELECT 1 FROM booking_communications c
             WHERE c.booking_id = bk.id AND c.type = 'reminder'
           )`,
        [t.id, trip.id]
      );
      for (const b of bookings) {
        const r = await sendTripReminderEmail(t.id, b.id);
        if (r.sent) sent++;
      }
    }
  }
  if (sent > 0) logger.info({ sent }, 'Trip reminders sent');
  return sent;
}