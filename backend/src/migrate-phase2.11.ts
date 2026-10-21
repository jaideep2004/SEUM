import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 2.11: Selling price on trips (client request)
-- ============================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_trips_selling_price ON trips(tenant_id, selling_price)
  WHERE selling_price IS NOT NULL;
`;

async function run() {
  console.log('Running Phase 2.11 migration (trip selling price)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.11 migration completed successfully.');
  } catch (err) {
    console.error('Phase 2.11 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
