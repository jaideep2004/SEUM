import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS booking_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  number_of_passengers INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_by UUID REFERENCES users(id),
  offered_at TIMESTAMP WITH TIME ZONE,
  offer_expires_at TIMESTAMP WITH TIME ZONE,
  converted_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON booking_waitlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_trip ON booking_waitlist(trip_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer ON booking_waitlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON booking_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON booking_waitlist(created_at);
`;

async function run() {
  console.log('Running Phase 7.3 migration...');
  await pool.query(migration);
  console.log('Phase 7.3 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 7.3 migration failed:', err);
  process.exit(1);
});