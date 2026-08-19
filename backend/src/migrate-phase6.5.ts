import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500),
  contact VARCHAR(255),
  supervisor VARCHAR(255),
  is_internal BOOLEAN NOT NULL DEFAULT true,
  services TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workshops_tenant ON workshops(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workshops_internal ON workshops(is_internal);
`;

async function run() {
  console.log('Running Phase 6.5 migration...');
  await pool.query(migration);
  console.log('Phase 6.5 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 6.5 migration failed:', err);
  process.exit(1);
});