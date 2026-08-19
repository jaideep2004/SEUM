import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS breakdown_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  breakdown_type VARCHAR(50) NOT NULL DEFAULT 'mechanical'
    CHECK (breakdown_type IN ('engine_failure', 'transmission', 'electrical', 'tire_blowout', 'brake_failure', 'suspension', 'fuel_system', 'cooling_system', 'clutch', 'body_damage', 'accident', 'mechanical', 'other')),
  description TEXT,
  location VARCHAR(500) NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported', 'dispatched', 'in_progress', 'resolved')),
  dispatched_mechanic VARCHAR(255),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  dispatched_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  cost NUMERIC(12,2),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_breakdown_reports_tenant ON breakdown_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_reports_bus ON breakdown_reports(bus_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_reports_status ON breakdown_reports(status);
CREATE INDEX IF NOT EXISTS idx_breakdown_reports_severity ON breakdown_reports(severity);
CREATE INDEX IF NOT EXISTS idx_breakdown_reports_created ON breakdown_reports(created_at);
`;

async function run() {
  console.log('Running Phase 6.2 migration...');
  await pool.query(migration);
  console.log('Phase 6.2 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 6.2 migration failed:', err);
  process.exit(1);
});