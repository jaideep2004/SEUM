import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 7.6: Booking Approval & Status Workflow
-- ============================================================

-- Booking status history (audit every status transition)
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bsh_tenant ON booking_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bsh_booking ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_bsh_changed_at ON booking_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_bsh_to_status ON booking_status_history(to_status);

-- Extend bookings with approval/invoice tracking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_reference VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quotation_amount NUMERIC(12,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Ensure bookings status can store new pipeline values (no strict CHECK, but guard with update)
-- If a legacy CHECK exists, drop it and recreate permissive one
DO $$
BEGIN
  -- Drop any existing status CHECK constraint on bookings if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_type = 'CHECK'
  ) THEN
    -- Attempt to drop generic constraint name patterns (safe to ignore failure)
    BEGIN
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_invoice_ref ON bookings(invoice_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_submitted ON bookings(submitted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_approved ON bookings(approved_at);
`;

async function run() {
  console.log('Running Phase 7.6 migration (Booking Approval & Status Workflow)...');
  try {
    await pool.query(migration);
    console.log('Phase 7.6 migration completed successfully.');
  } catch (err) {
    console.error('Phase 7.6 migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
