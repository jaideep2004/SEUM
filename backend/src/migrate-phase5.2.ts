import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_tenant ON employee_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON employee_attendance(date);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_status ON employee_attendance(status);
`;

async function run() {
  console.log('Running Phase 5.2 migration...');
  await pool.query(migration);
  console.log('Phase 5.2 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 5.2 migration failed:', err);
  process.exit(1);
});
