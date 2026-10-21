import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 2.10: Trip numbers (TR-YYYY-NNNN) + leg codes (-S1..Sn)
-- ============================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_number VARCHAR(20);
ALTER TABLE trip_legs ADD COLUMN IF NOT EXISTS leg_code VARCHAR(30);

-- Backfill existing trips (per tenant + year sequence by creation order)
WITH numbered AS (
  SELECT id,
    'TR-' || EXTRACT(YEAR FROM created_at)::int || '-' ||
    LPAD((ROW_NUMBER() OVER (
      PARTITION BY tenant_id, EXTRACT(YEAR FROM created_at)
      ORDER BY created_at, id
    ))::text, 4, '0') AS num
  FROM trips WHERE trip_number IS NULL
)
UPDATE trips t SET trip_number = n.num FROM numbered n WHERE t.id = n.id;

-- Backfill leg codes from parent trip number + leg_no
UPDATE trip_legs tl
SET leg_code = t.trip_number || '-S' || tl.leg_no
FROM trips t
WHERE tl.trip_id = t.id AND tl.leg_code IS NULL AND t.trip_number IS NOT NULL;

-- Unique trip numbers per tenant (NULLs allowed, never equal each other in PG)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_trips_tenant_number') THEN
    ALTER TABLE trips ADD CONSTRAINT uq_trips_tenant_number UNIQUE (tenant_id, trip_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_number ON trips(trip_number);
CREATE INDEX IF NOT EXISTS idx_trip_legs_code ON trip_legs(leg_code);
`;

async function run() {
  console.log('Running Phase 2.10 migration (trip numbers + leg codes)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.10 migration completed successfully.');
  } catch (err) {
    console.error('Phase 2.10 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
