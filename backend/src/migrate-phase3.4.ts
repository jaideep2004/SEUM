import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS driver_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id UUID,
  violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('speeding', 'phone_usage', 'fatigue', 'lane_departure', 'seatbelt', 'smoking', 'route_deviation', 'customer_complaint', 'accident')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  action_taken TEXT,
  action_taken_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'disputed')),
  dispute_reason TEXT,
  dispute_evidence JSONB DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_driver_violations_tenant ON driver_violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_violations_driver ON driver_violations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_violations_status ON driver_violations(status);
CREATE INDEX IF NOT EXISTS idx_driver_violations_severity ON driver_violations(severity);
`;

async function run() {
  console.log('Running Phase 3.4 migration...');
  await pool.query(migration);
  console.log('Phase 3.4 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 3.4 migration failed:', err);
  process.exit(1);
});
