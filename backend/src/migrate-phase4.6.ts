import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf','csv')),
  recipients TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON report_schedules(tenant_id);
`;

async function run() {
  console.log('Running Phase 4.6 migration...');
  await pool.query(migration);
  console.log('Phase 4.6 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 4.6 migration failed:', err);
  process.exit(1);
});
