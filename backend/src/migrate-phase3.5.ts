import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS driver_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  safety_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  punctuality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  customer_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  fuel_efficiency_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  computed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_driver_scores_tenant ON driver_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_scores_driver ON driver_scores(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_scores_period ON driver_scores(period_start, period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_scores_unique ON driver_scores(tenant_id, driver_id, period_start, period_end);
`;

async function run() {
  console.log('Running Phase 3.5 migration...');
  await pool.query(migration);
  console.log('Phase 3.5 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 3.5 migration failed:', err);
  process.exit(1);
});
