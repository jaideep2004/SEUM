import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS employee_salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  penalty_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_from DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_salary_tenant ON employee_salary_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_employee ON employee_salary_structures(employee_id);

CREATE TABLE IF NOT EXISTS employee_payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  penalty_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_emp_payroll_tenant ON employee_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_employee ON employee_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_period ON employee_payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_status ON employee_payroll(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_payroll_unique ON employee_payroll(tenant_id, employee_id, period_start, period_end);
`;

async function run() {
  console.log('Running Phase 5.3 migration...');
  await pool.query(migration);
  console.log('Phase 5.3 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 5.3 migration failed:', err);
  process.exit(1);
});
