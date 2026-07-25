import { pool } from './db';

const migration = `
-- ============================================================
-- DRIVERS MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(50),
  license_number VARCHAR(100),
  license_expiry DATE,
  license_category VARCHAR(20),
  passport_number VARCHAR(50),
  nationality VARCHAR(100),
  date_of_birth DATE,
  hire_date DATE,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  blood_type VARCHAR(5),
  medical_fitness_expiry DATE,
  photo_url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_nationality ON drivers(nationality);
CREATE INDEX IF NOT EXISTS idx_drivers_deleted ON drivers(deleted_at);

-- ============================================================
-- DRIVER DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  file_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_docs_expiry ON driver_documents(expiry_date);
`;

async function run() {
  console.log('Running Phase 3 migration: Driver Management...');
  await pool.query(migration);
  console.log('Phase 3 migration complete.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
