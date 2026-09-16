import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 2.8: TRIP LEGS ROUTE TYPE + FLIGHT TYPE (client feedback)
-- ============================================================

-- trip_legs: route type per leg (Arrival / Departure / Intercity / Intracity)
ALTER TABLE trip_legs ADD COLUMN IF NOT EXISTS route_type VARCHAR(20);
ALTER TABLE trip_legs DROP CONSTRAINT IF EXISTS chk_trip_legs_route_type;
ALTER TABLE trip_legs ADD CONSTRAINT chk_trip_legs_route_type CHECK (route_type IS NULL OR route_type IN ('arrival', 'departure', 'intercity', 'intracity'));

-- recurring_pattern_legs: same
ALTER TABLE recurring_pattern_legs ADD COLUMN IF NOT EXISTS route_type VARCHAR(20);
ALTER TABLE recurring_pattern_legs DROP CONSTRAINT IF EXISTS chk_pattern_legs_route_type;
ALTER TABLE recurring_pattern_legs ADD CONSTRAINT chk_pattern_legs_route_type CHECK (route_type IS NULL OR route_type IN ('arrival', 'departure', 'intercity', 'intracity'));

CREATE INDEX IF NOT EXISTS idx_trip_legs_route_type ON trip_legs(route_type);
CREATE INDEX IF NOT EXISTS idx_pattern_legs_route_type ON recurring_pattern_legs(route_type);
`;

async function run() {
  console.log('Running Phase 2.8 migration (leg route_type + flightType JSONB note)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.8 migration completed successfully.');
  } catch (err) {
    console.error('Phase 2.8 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
