import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 7.4b: AGENT LINKAGE TO ACCOUNTS (reuse customers is_company=true)
-- Adds trips.agent_id FK -> customers(id), keeps agent VARCHAR as display cache
-- ============================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_agent_id ON trips(agent_id);
CREATE INDEX IF NOT EXISTS idx_trips_agent ON trips(agent);

-- Also add agent_id to recurring patterns for consistency (nullable, no FK constraint drift)
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_patterns_agent_id ON recurring_trip_patterns(agent_id);

-- Note: existing free-text agent values are preserved as display cache; no auto-backfill.
`;

async function run() {
  console.log('Running Phase 7.4b migration (agent linkage)...');
  try {
    await pool.query(migration);
    console.log('Phase 7.4b migration completed successfully.');
  } catch (err) {
    console.error('Phase 7.4b migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
