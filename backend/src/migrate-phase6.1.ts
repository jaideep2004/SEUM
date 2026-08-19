import { pool } from './db';

const migration = `
ALTER TABLE buses ADD COLUMN IF NOT EXISTS current_km INTEGER NOT NULL DEFAULT 0;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS next_km_threshold INTEGER;

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL DEFAULT 'general_service'
    CHECK (task_type IN ('oil_change', 'tire_replacement', 'brake_inspection', 'engine_service', 'ac_service', 'electrical', 'body_repair', 'general_service', 'other')),
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_date DATE NOT NULL,
  scheduled_km INTEGER,
  recurring_interval_days INTEGER,
  recurring_interval_km INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  assigned_workshop VARCHAR(255),
  assigned_mechanic VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completion_notes TEXT,
  cost NUMERIC(12,2),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_tenant ON maintenance_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_bus ON maintenance_tasks(bus_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_date ON maintenance_tasks(scheduled_date);
`;

async function run() {
  console.log('Running Phase 6.1 migration...');
  await pool.query(migration);
  console.log('Phase 6.1 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 6.1 migration failed:', err);
  process.exit(1);
});