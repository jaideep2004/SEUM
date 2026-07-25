import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expense_category VARCHAR(50) NOT NULL CHECK (expense_category IN (
    'fuel','maintenance','salary','tolls','parking','permits','insurance','utilities','office','other'
  )),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  trip_id UUID,
  receipt_url TEXT,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','reimbursed')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_bus ON expenses(bus_id);
`;

async function run() {
  console.log('Running Phase 4.4 migration...');
  await pool.query(migration);
  console.log('Phase 4.4 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 4.4 migration failed:', err);
  process.exit(1);
});
