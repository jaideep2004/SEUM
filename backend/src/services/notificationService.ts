import { v4 as uuid } from 'uuid';
import { query } from '../db';
import { logger } from '../utils/logger';

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message?: string;
  resource?: string;
  resourceId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await query(
      `INSERT INTO notifications (id, tenant_id, user_id, type, title, message, resource, resource_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuid(), input.tenantId, input.userId, input.type,
        input.title, input.message || null,
        input.resource || null, input.resourceId || null,
      ]
    );
  } catch (err) {
    logger.error({ err }, 'Failed to create notification');
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
    const fleetManagers = await query<{ id: string }>(
      `SELECT u.id FROM users u
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
    }
  }

  return expiring.length;
}
