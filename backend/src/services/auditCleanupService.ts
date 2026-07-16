import { query } from '../db';
import { logger } from '../utils/logger';

const DEFAULT_RETENTION_DAYS = 90;

export async function cleanupOldAuditLogs(retentionDays: number = DEFAULT_RETENTION_DAYS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  logger.info({ retentionDays, cutoff: cutoff.toISOString() }, 'Running audit log cleanup');

  const result = await query(
    `DELETE FROM audit_logs WHERE created_at < $1 RETURNING id`,
    [cutoff.toISOString()]
  );

  const deletedCount = result.length;
  logger.info({ deletedCount }, 'Audit log cleanup completed');

  return { deletedCount, retentionDays, cutoff: cutoff.toISOString() };
}
