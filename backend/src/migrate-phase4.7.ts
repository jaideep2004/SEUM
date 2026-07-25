import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS payroll_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_salaries NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  employee_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_batch_id UUID NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  employee_code VARCHAR(50),
  employee_name VARCHAR(255),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  trip_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_batches_tenant ON payroll_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_status ON payroll_batches(status);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_period ON payroll_batches(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_items_batch ON payroll_items(payroll_batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_driver ON payroll_items(driver_id);
`;

async function run() {
  console.log('Running Phase 4.7 migration...');
  await pool.query(migration);
  console.log('Phase 4.7 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 4.7 migration failed:', err);
  process.exit(1);
});
