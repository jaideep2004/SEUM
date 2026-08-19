import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS maintenance_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  maintenance_task_id UUID NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  labor_rate NUMERIC(12,2) NOT NULL DEFAULT 50,
  labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_to VARCHAR(255),
  invoice_number VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'paid', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_costs_task ON maintenance_costs(maintenance_task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_costs_tenant ON maintenance_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_costs_status ON maintenance_costs(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_costs_created ON maintenance_costs(created_at);
`;

async function run() {
  console.log('Running Phase 6.4 migration...');
  await pool.query(migration);
  console.log('Phase 6.4 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 6.4 migration failed:', err);
  process.exit(1);
});