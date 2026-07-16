import { pool } from './db';

const migration = `
-- ============================================================
-- BUSES / VEHICLES MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS buses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plate_number VARCHAR(50) NOT NULL,
  chassis_number VARCHAR(100),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  capacity_seated INTEGER NOT NULL,
  capacity_standing INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(50),
  vin VARCHAR(100),
  engine_number VARCHAR(100),
  fuel_type VARCHAR(50) NOT NULL DEFAULT 'diesel',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  assigned_depot VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, plate_number)
);

CREATE INDEX IF NOT EXISTS idx_buses_tenant ON buses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_plate ON buses(plate_number);

-- ============================================================
-- VEHICLE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS bus_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bus_docs_bus ON bus_documents(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_docs_tenant ON bus_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bus_docs_expiry ON bus_documents(expiry_date);

-- ============================================================
-- BUS READINESS
-- ============================================================
CREATE TABLE IF NOT EXISTS bus_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'ready',
  checked_by UUID REFERENCES users(id),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  next_scheduled_maintenance_km INTEGER,
  next_scheduled_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(bus_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_bus_readiness_tenant ON bus_readiness(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bus_readiness_status ON bus_readiness(status);

-- ============================================================
-- FUEL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  liters DECIMAL(10,2) NOT NULL CHECK (liters > 0),
  cost_per_liter DECIMAL(10,2) NOT NULL CHECK (cost_per_liter > 0),
  total_cost DECIMAL(12,2) NOT NULL CHECK (total_cost > 0),
  odometer_reading INTEGER,
  station_name VARCHAR(255),
  fuel_type VARCHAR(50) NOT NULL DEFAULT 'diesel',
  receipt_url TEXT,
  filled_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_tenant ON fuel_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_bus ON fuel_logs(bus_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(date);

-- ============================================================
-- BUS ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_name VARCHAR(255),
  depot_name VARCHAR(255),
  driver_id UUID REFERENCES users(id),
  driver_name VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_bus ON assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
`;

async function run() {
  console.log('Running Phase 1 migrations (fleet)...');
  try {
    await pool.query(migration);
    console.log('Phase 1 migrations completed successfully.');
  } catch (err) {
    console.error('Phase 1 migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
