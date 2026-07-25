import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS driver_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'on_trip')),
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_driver_attendance_tenant ON driver_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_driver ON driver_attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_date ON driver_attendance(date);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_status ON driver_attendance(status);
`;

async function run() {
  console.log('Running Phase 3.2 migration...');
  await pool.query(migration);
  console.log('Phase 3.2 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 3.2 migration failed:', err);
  process.exit(1);
});
