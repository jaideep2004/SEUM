import { cleanupOldAuditLogs } from '../services/auditCleanupService';

const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);

cleanupOldAuditLogs(retentionDays)
  .then((result) => {
    console.log(`Deleted ${result.deletedCount} audit log(s) older than ${result.retentionDays} days.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Audit log cleanup failed:', err);
    process.exit(1);
  });
