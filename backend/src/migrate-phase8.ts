import { pool } from './db';

const migration = `
-- Phase 8: Notification Engine additions
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
`;

async function run() {
  console.log('Running Phase 8 migration...');
  await pool.query(migration);
  console.log('Phase 8 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 8 migration failed:', err);
  process.exit(1);
});