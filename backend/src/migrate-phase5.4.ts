import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS employee_leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL
    CHECK (leave_type IN ('annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_manager'
    CHECK (status IN ('pending_manager', 'pending_hr', 'approved', 'rejected')),
  manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employee_leaves_tenant ON employee_leaves(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_employee ON employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_status ON employee_leaves(status);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_dates ON employee_leaves(start_date, end_date);
`;

async function run() {
  console.log('Running Phase 5.4 migration...');
  await pool.query(migration);
  console.log('Phase 5.4 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 5.4 migration failed:', err);
  process.exit(1);
});
