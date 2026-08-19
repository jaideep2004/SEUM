import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS booking_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id),
  type VARCHAR(30) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_tenant ON booking_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_booking ON booking_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_comm_trip ON booking_communications(trip_id);
CREATE INDEX IF NOT EXISTS idx_comm_type ON booking_communications(type);
CREATE INDEX IF NOT EXISTS idx_comm_created ON booking_communications(created_at);
`;

async function run() {
  console.log('Running Phase 7.5 migration...');
  await pool.query(migration);
  console.log('Phase 7.5 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 7.5 migration failed:', err);
  process.exit(1);
});