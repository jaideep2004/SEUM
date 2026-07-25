import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS driver_leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'emergency', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_driver_leaves_tenant ON driver_leaves(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_leaves_driver ON driver_leaves(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_leaves_status ON driver_leaves(status);
CREATE INDEX IF NOT EXISTS idx_driver_leaves_dates ON driver_leaves(start_date, end_date);
`;

async function run() {
  console.log('Running Phase 3.3 migration...');
  await pool.query(migration);
  console.log('Phase 3.3 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 3.3 migration failed:', err);
  process.exit(1);
});
