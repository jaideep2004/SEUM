import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  part_code VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  manufacturer VARCHAR(255),
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'unit',
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2),
  supplier_id VARCHAR(255),
  storage_location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (tenant_id, part_code)
);

CREATE INDEX IF NOT EXISTS idx_spare_parts_tenant ON spare_parts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_spare_parts_low_stock ON spare_parts(tenant_id, quantity_in_stock, reorder_level);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('in', 'out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reference_type VARCHAR(50),
  reference_id UUID,
  unit_price NUMERIC(12,2),
  total NUMERIC(12,2),
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_part ON inventory_transactions(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_ref ON inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_date ON inventory_transactions(date);
`;

async function run() {
  console.log('Running Phase 6.3 migration...');
  await pool.query(migration);
  console.log('Phase 6.3 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 6.3 migration failed:', err);
  process.exit(1);
});