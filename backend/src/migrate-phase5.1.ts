import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(50),
  department VARCHAR(50) NOT NULL DEFAULT 'operations'
    CHECK (department IN ('operations','finance','hr','fleet','maintenance','customer_service','executive','admin')),
  designation VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  join_date DATE,
  contract_end_date DATE,
  nationality VARCHAR(100),
  id_number VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','terminated','on_leave')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
`;

async function run() {
  console.log('Running Phase 5.1 migration...');
  await pool.query(migration);
  console.log('Phase 5.1 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 5.1 migration failed:', err);
  process.exit(1);
});
