import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { logger } from '../utils/logger';
import { config } from '../config';
import { sendEmailAsync } from './emailService';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  resource?: string;
  resourceId?: string;
}

export const NOTIFICATION_EVENTS: { eventType: string; label: string; description: string; sendsEmail: boolean }[] = [
  { eventType: 'trip_assigned', label: 'Trip assignments', description: 'When a trip is assigned to you', sendsEmail: true },
  { eventType: 'trip_delayed', label: 'Trip delays', description: 'When a trip you are on is delayed', sendsEmail: true },
  { eventType: 'document_expiring', label: 'Vehicle document expiry', description: 'Vehicle documents expiring within 30 days', sendsEmail: true },
  { eventType: 'waitlist_offer', label: 'Waitlist seat offers', description: 'When a waitlisted seat becomes available', sendsEmail: true },
  { eventType: 'booking_new', label: 'New bookings', description: 'When a new booking is created', sendsEmail: false },
  { eventType: 'booking_cancelled', label: 'Booking cancellations', description: 'When a booking is cancelled or refunded', sendsEmail: false },
  { eventType: 'maintenance_alert', label: 'Maintenance alerts', description: 'When a vehicle is flagged for maintenance', sendsEmail: false },
];

export async function getNotificationPreferences(tenantId: string, userId: string) {
  const rows = await query<{ event_type: string; in_app: boolean; email: boolean }>(
    `SELECT event_type, in_app, email FROM notification_preferences
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );
  const stored = new Map(rows.map((r) => [r.event_type, r]));
  return NOTIFICATION_EVENTS.map((ev) => {
    const s = stored.get(ev.eventType);
    return {
      eventType: ev.eventType, label: ev.label, description: ev.description, sendsEmail: ev.sendsEmail,
      inApp: s ? s.in_app : true, email: s ? (ev.sendsEmail ? s.email : false) : ev.sendsEmail,
    };
  });
}

export async function updateNotificationPreferences(
  tenantId: string, userId: string,
  updates: { eventType: string; inApp: boolean; email: boolean }[]
) {
  for (const u of updates) {
    const cat = NOTIFICATION_EVENTS.find((e) => e.eventType === u.eventType);
    if (!cat) continue;
    await query(
      `INSERT INTO notification_preferences (tenant_id, user_id, event_type, in_app, email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, user_id, event_type)
       DO UPDATE SET in_app = $4, email = $5, updated_at = NOW()`,
      [tenantId, userId, u.eventType, u.inApp, cat.sendsEmail ? u.email : true]
    );
  }
  return getNotificationPreferences(tenantId, userId);
}

async function prefEnabled(tenantId: string, userId: string, type: string, channel: 'in_app' | 'email') {
  const row = await queryOne<{ in_app: boolean; email: boolean }>(
    `SELECT in_app, email FROM notification_preferences WHERE tenant_id = $1 AND user_id = $2 AND event_type = $3`,
    [tenantId, userId, type]
  );
  if (!row) return true;
  return channel === 'in_app' ? row.in_app : row.email;
}

export async function emailChannelEnabled(tenantId: string, userId: string, type: string) {
  return prefEnabled(tenantId, userId, type, 'email');
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const allowed = await prefEnabled(input.tenantId, input.userId, input.type, 'in_app');
    if (!allowed) return false;
    await query(
      `INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, resource, resource_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuid(), input.tenantId, input.userId, input.type,
        input.title, input.message || null,
        input.data ? JSON.stringify(input.data) : null,
        input.resource || null, input.resourceId || null,
      ]
    );
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to create notification');
    return false;
  }
}

/**
 * Create document expiry notifications for fleet managers.
 * Called periodically or on document creation/update.
 */
export async function createDocumentExpiryNotifications(tenantId: string) {
  const expiring = await query<any>(
    `SELECT d.*, b.plate_number, b.tenant_id
     FROM bus_documents d
     JOIN buses b ON b.id = d.bus_id
     WHERE d.tenant_id = $1 AND d.status = 'active'
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND d.expiry_date >= CURRENT_DATE
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.resource = 'bus_document'
           AND n.resource_id = d.id
           AND n.type = 'document_expiring'
       )`,
    [tenantId]
  );

  for (const doc of expiring) {
    const daysLeft = Math.ceil(
      (new Date(doc.expiry_date).getTime() - Date.now()) / 86400000
    );

    // Notify fleet managers
    const fleetManagers = await query<{ id: string; email: string; name: string }>(
      `SELECT u.id, u.email, u.name FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1 AND r.name IN ('fleet_manager', 'company_admin', 'super_admin')`,
      [tenantId]
    );

    for (const user of fleetManagers) {
      await createNotification({
        tenantId,
        userId: user.id,
        type: 'document_expiring',
        title: `Document Expiring Soon`,
        message: `${doc.document_type} for ${doc.plate_number} expires in ${daysLeft} day(s)`,
        resource: 'bus_document',
        resourceId: doc.id,
      });
      if (user.email && (await emailChannelEnabled(tenantId, user.id, 'document_expiring'))) {
        sendEmailAsync({
          to: user.email,
          subject: `Document expiring: ${doc.document_type} — ${doc.plate_number}`,
          preheader: `${doc.document_type} for ${doc.plate_number} expires in ${daysLeft} day(s).`,
          heading: 'Vehicle document expiring soon',
          bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p>
            <p>The following vehicle document is expiring in <strong>${daysLeft} day(s)</strong>:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:4px 0 6px 0;">
              <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Document type</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(doc.document_type)}</td></tr>
              <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Vehicle</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(doc.plate_number)}</td></tr>
              <tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Expiry date</td><td style="padding:6px 0;font-size:13px;color:#0f172a;">${escapeHtml(doc.expiry_date ? new Date(doc.expiry_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}</td></tr>
            </table>
            <p>Please renew this document before the expiry date to keep the vehicle compliant and on the road.</p>`,
          action: {
            label: 'Open fleet documents',
            url: `${config.appUrl}/dashboard/fleet`,
          },
          note: 'This is a courtesy reminder. Regular document checks are recommended for all active vehicles.',
        });
      }
    }
  }

  return expiring.length;
}
