import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  id_number VARCHAR(100),
  nationality VARCHAR(100),
  address VARCHAR(500),
  is_company BOOLEAN NOT NULL DEFAULT false,
  company_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
`;

async function run() {
  console.log('Running Phase 7.1 migration...');
  await pool.query(migration);
  console.log('Phase 7.1 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 7.1 migration failed:', err);
  process.exit(1);
});