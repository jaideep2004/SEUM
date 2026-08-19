import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  booking_reference VARCHAR(30) NOT NULL,
  number_of_passengers INTEGER NOT NULL DEFAULT 1,
  seat_numbers INTEGER[] NOT NULL DEFAULT '{}',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  cancel_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(100),
  seat_number INTEGER,
  age INTEGER,
  special_requirements TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking ON booking_passengers(booking_id);
`;

async function run() {
  console.log('Running Phase 7.2 migration...');
  await pool.query(migration);
  console.log('Phase 7.2 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 7.2 migration failed:', err);
  process.exit(1);
});