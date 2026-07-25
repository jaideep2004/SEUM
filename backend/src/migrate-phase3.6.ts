import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS driver_payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  trip_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_driver_payroll_tenant ON driver_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_payroll_driver ON driver_payroll(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payroll_period ON driver_payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_driver_payroll_status ON driver_payroll(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_payroll_unique ON driver_payroll(tenant_id, driver_id, period_start, period_end);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12,2) NOT NULL DEFAULT 3000;
`;

async function run() {
  console.log('Running Phase 3.6 migration...');
  await pool.query(migration);
  console.log('Phase 3.6 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 3.6 migration failed:', err);
  process.exit(1);
});
