import { pool } from './db';

const migration = `
-- ============================================================
-- TRIP STATUS LOGS (for manual overrides & SMS/call updates)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_method VARCHAR(50) NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_status_logs_trip ON trip_status_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_logs_trip_created ON trip_status_logs(trip_id, created_at DESC);

-- Add estimated resolution time to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_resolution_time TIMESTAMP WITH TIME ZONE;

-- Add status_override_by column to track who did manual overrides
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status_override_by UUID REFERENCES users(id);
`;

async function run() {
  console.log('Running Phase 2.5 migrations (trip monitoring)...');
  try {
    await pool.query(migration);
    console.log('Phase 2.5 migrations completed successfully.');
  } catch (err) {
    console.error('Phase 2.5 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
