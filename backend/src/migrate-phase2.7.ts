import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 2.7: TRIP TYPES (Single vs Round) + MULTI-LEG TRIPS
-- ============================================================

-- ─── trips: enforce trip_type = single | round ───
UPDATE trips SET trip_type = 'single' WHERE trip_type NOT IN ('single', 'round');
ALTER TABLE trips ALTER COLUMN trip_type SET DEFAULT 'single';
ALTER TABLE trips DROP CONSTRAINT IF EXISTS chk_trips_trip_type;
ALTER TABLE trips ADD CONSTRAINT chk_trips_trip_type CHECK (trip_type IN ('single', 'round'));

-- ─── trips: manifest columns (from client trip manifest form) ───
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_title VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS group_leader VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS group_leader_no VARCHAR(50);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS agent VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS group_no VARCHAR(50);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS no_of_pax INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS nusuk_info JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS flights JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS hotels JSONB;

-- ============================================================
-- TRIP LEGS (multi-stop / multi-date legs of a trip)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  leg_no INTEGER NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  leg_date DATE NOT NULL,
  departure_time TIME,
  arrival_time TIME,
  overnight_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, leg_no)
);

CREATE INDEX IF NOT EXISTS idx_trip_legs_trip ON trip_legs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_legs_tenant ON trip_legs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_legs_date ON trip_legs(leg_date);

-- ─── recurring_trip_patterns: same type/constraint/manifest ───
UPDATE recurring_trip_patterns SET trip_type = 'single' WHERE trip_type NOT IN ('single', 'round');
ALTER TABLE recurring_trip_patterns ALTER COLUMN trip_type SET DEFAULT 'single';
ALTER TABLE recurring_trip_patterns DROP CONSTRAINT IF EXISTS chk_patterns_trip_type;
ALTER TABLE recurring_trip_patterns ADD CONSTRAINT chk_patterns_trip_type CHECK (trip_type IN ('single', 'round'));

-- round patterns may not need a route (legs define the journey)
ALTER TABLE recurring_trip_patterns ALTER COLUMN route_id DROP NOT NULL;

ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS trip_title VARCHAR(255);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS group_leader VARCHAR(255);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS group_leader_no VARCHAR(50);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS agent VARCHAR(255);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS group_no VARCHAR(50);
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS no_of_pax INTEGER;
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS nusuk_info JSONB;
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS flights JSONB;
ALTER TABLE recurring_trip_patterns ADD COLUMN IF NOT EXISTS hotels JSONB;

-- ============================================================
-- RECURRING PATTERN LEGS (leg template copied into generated trips)
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_pattern_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES recurring_trip_patterns(id) ON DELETE CASCADE,
  leg_no INTEGER NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  day_offset INTEGER NOT NULL DEFAULT 0,
  departure_time TIME,
  arrival_time TIME,
  overnight_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(pattern_id, leg_no)
);

CREATE INDEX IF NOT EXISTS idx_pattern_legs_pattern ON recurring_pattern_legs(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_legs_tenant ON recurring_pattern_legs(tenant_id);
`;

async function run() {
  console.log('Running Phase 2.7 migration (trip types + multi-leg)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.7 migration completed successfully.');
  } catch (err) {
    console.error('Phase 2.7 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
