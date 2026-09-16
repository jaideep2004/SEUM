import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 7.7 & 7.8: Excel Bulk Import + Booking Channels
-- ============================================================

-- Channel column on bookings (L783)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'internal';

-- Import-specific request fields (for excel rows where trip not yet assigned)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS destination_location VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type_requested VARCHAR(50);

-- Allow trip_id to be nullable for excel/request bookings that haven't been assigned to a trip yet
ALTER TABLE bookings ALTER COLUMN trip_id DROP NOT NULL;

-- Channel constraint (L783)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_channel_check'
  ) THEN
    BEGIN
      ALTER TABLE bookings ADD CONSTRAINT bookings_channel_check
        CHECK (channel IN ('internal','excel','b2b_portal','b2c_website','cs_employee','whatsapp'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Ensure pending_approval status is not blocked by legacy constraint (already handled in 7.6, but ensure again)
DO $$
BEGIN
  -- Drop any strict status check if still present (legacy pending only)
  BEGIN
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_channel ON bookings(channel);
CREATE INDEX IF NOT EXISTS idx_bookings_requested_date ON bookings(requested_date);
CREATE INDEX IF NOT EXISTS idx_bookings_channel_status ON bookings(channel, status);
`;

async function run() {
  console.log('Running Phase 7.7-7.8 migration (Excel Import + Booking Channels)...');
  try {
    await pool.query(migration);
    console.log('Phase 7.7-7.8 migration completed successfully.');
  } catch (err) {
    console.error('Phase 7.7-7.8 migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
