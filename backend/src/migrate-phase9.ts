import { pool } from './db';

const migration = `
-- ============================================================
-- PHASE 9.3 + 9.4 + 9.5 + 9.7: GPS ingestion, geofencing,
-- route deviation framework, speed monitoring
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 9.3: Raw GPS positions (time-series style) ───
CREATE TABLE IF NOT EXISTS gps_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  device_id VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  speed_kmh DOUBLE PRECISION CHECK (speed_kmh IS NULL OR speed_kmh >= 0),
  heading DOUBLE PRECISION CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360)),
  altitude DOUBLE PRECISION,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ignition_status VARCHAR(20),
  odometer_reading DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_positions_tenant ON gps_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gps_positions_bus ON gps_positions(bus_id);
CREATE INDEX IF NOT EXISTS idx_gps_positions_trip ON gps_positions(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_positions_recorded ON gps_positions(recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_positions_bus_recorded ON gps_positions(bus_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_tenant_bus_recorded ON gps_positions(tenant_id, bus_id, recorded_at DESC);

-- ─── 9.4: Geofences (polygon OR circle) ───
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('depot','terminal','checkpoint','restricted','holy_site')),
  coordinates JSONB,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION CHECK (radius_meters IS NULL OR radius_meters > 0),
  rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_tenant ON geofences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON geofences(type);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(tenant_id, is_active);

-- ─── 9.4: Geofence trigger events ───
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('entered','exited','dwell_exceeded','restricted_entry')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_tenant ON geofence_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_bus ON geofence_events(bus_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_fence ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_created ON geofence_events(created_at);
CREATE INDEX IF NOT EXISTS idx_geofence_events_type ON geofence_events(event_type);

-- ─── 9.7: Overspeed events ───
CREATE TABLE IF NOT EXISTS overspeed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  speed_kmh DOUBLE PRECISION NOT NULL CHECK (speed_kmh >= 0),
  threshold_kmh DOUBLE PRECISION NOT NULL CHECK (threshold_kmh > 0),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overspeed_tenant ON overspeed_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overspeed_bus ON overspeed_events(bus_id);
CREATE INDEX IF NOT EXISTS idx_overspeed_trip ON overspeed_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_overspeed_driver ON overspeed_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_overspeed_created ON overspeed_events(created_at);

-- ─── 9.5 + 9.7: Per-route deviation + speed config ───
CREATE TABLE IF NOT EXISTS route_settings (
  route_id UUID PRIMARY KEY REFERENCES routes(id) ON DELETE CASCADE,
  deviation_tolerance_meters INTEGER NOT NULL DEFAULT 300 CHECK (deviation_tolerance_meters > 0),
  deviation_tolerance_minutes INTEGER NOT NULL DEFAULT 10 CHECK (deviation_tolerance_minutes > 0),
  speed_threshold_kmh INTEGER CHECK (speed_threshold_kmh IS NULL OR speed_threshold_kmh > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── 9.7: Per-bus speed threshold override ───
CREATE TABLE IF NOT EXISTS bus_speed_thresholds (
  bus_id UUID PRIMARY KEY REFERENCES buses(id) ON DELETE CASCADE,
  threshold_kmh INTEGER NOT NULL CHECK (threshold_kmh > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── 9.5: Optional route corridor polyline (array of [lng, lat]).
-- Routes only store origin/destination text, so true corridor math is only
-- possible once a corridor is set via POST /api/gps/route-corridor/:routeId.
-- Deviation checks are skipped (logged) while corridor IS NULL.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS corridor JSONB;
CREATE INDEX IF NOT EXISTS idx_routes_corridor ON routes USING gin (corridor) WHERE corridor IS NOT NULL;
`;

async function run() {
  console.log('Running Phase 9 migration (GPS + geofencing + deviation + speed)...');
  try {
    await pool.query(migration);
    console.log('Phase 9 migration completed successfully.');
  } catch (err) {
    console.error('Phase 9 migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
