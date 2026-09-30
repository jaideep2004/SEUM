import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 2.9: Vehicle count + per-group Nusuk info (client feedback)
-- ============================================================

-- trips: number of vehicles required for the trip
ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_count INTEGER;

-- trips: per-group info (groupNo, leader, nationality, pax, nusukInfo each)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS groups JSONB;

-- recurring_trip_patterns: same manifest parity
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS vehicle_count INTEGER;
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS groups JSONB;

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_count ON trips(vehicle_count);
`;

async function run() {
  console.log('Running Phase 2.9 migration (vehicle_count + groups)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.9 migration completed successfully.');
  } catch (err) {
    console.error('Phase 2.9 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
