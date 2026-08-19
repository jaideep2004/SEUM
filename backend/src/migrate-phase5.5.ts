import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS employee_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type VARCHAR(50) NOT NULL DEFAULT 'full_time'
    CHECK (contract_type IN ('full_time', 'part_time', 'fixed_term', 'probation', 'internship', 'consultant', 'freelance')),
  start_date DATE,
  end_date DATE,
  salary NUMERIC(12,2),
  benefits TEXT,
  file_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_tenant ON employee_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_end_date ON employee_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_status ON employee_contracts(status);

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('id_card', 'passport', 'visa', 'iqama', 'work_permit', 'license', 'insurance', 'academic', 'certificate', 'medical', 'bank', 'other')),
  number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_tenant ON employee_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry ON employee_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);
`;

async function run() {
  console.log('Running Phase 5.5 migration...');
  await pool.query(migration);
  console.log('Phase 5.5 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 5.5 migration failed:', err);
  process.exit(1);
});