import { pool } from './db';

const migration = `
ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC(15,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trips_profitability ON trips(tenant_id, status)
  WHERE status IN ('completed', 'en_route');
`;

async function run() {
  console.log('Running Phase 4.5 migration...');
  await pool.query(migration);
  console.log('Phase 4.5 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 4.5 migration failed:', err);
  process.exit(1);
});
