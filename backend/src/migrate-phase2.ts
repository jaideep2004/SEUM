import { pool } from './db';

const migration = `
-- ============================================================
-- ROUTES MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  description TEXT,
  route_type VARCHAR(50) NOT NULL DEFAULT 'regular',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_routes_tenant ON routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_deleted ON routes(deleted_at);

-- ============================================================
-- ROUTE STOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_name VARCHAR(255) NOT NULL,
  stop_order INTEGER NOT NULL,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  estimated_arrival_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, stop_order);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trip_type VARCHAR(50) NOT NULL DEFAULT 'regular',
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  delay_minutes INTEGER,
  delay_reason TEXT,
  notes TEXT,
  rejection_reason TEXT,
  driver_confirmation_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_trips_tenant ON trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_bus ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_deleted ON trips(deleted_at);

-- ============================================================
-- TRIP PASSENGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_name VARCHAR(255) NOT NULL,
  passenger_id_number VARCHAR(100),
  contact_number VARCHAR(50),
  seat_number VARCHAR(20),
  booking_reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip ON trip_passengers(trip_id);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_confirmation_status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- ============================================================
-- RECURRING TRIP PATTERNS
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_trip_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trip_type VARCHAR(50) NOT NULL DEFAULT 'regular',
  frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
  days_of_week INTEGER[] DEFAULT '{}',
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME,
  start_date DATE NOT NULL,
  end_date DATE,
  specific_dates DATE[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_tenant ON recurring_trip_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_route ON recurring_trip_patterns(route_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_active ON recurring_trip_patterns(tenant_id, is_active);
`;

async function run() {
  console.log('Running Phase 2 migrations (operations)...');
  try {
    await pool.query(migration);
    console.log('Phase 2 migrations completed successfully.');
  } catch (err) {
    console.error('Phase 2 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
