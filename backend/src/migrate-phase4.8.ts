import { pool } from './db';

const migration = `
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking','savings','cash')),
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, account_number)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description VARCHAR(500),
  reference VARCHAR(100),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_reconciled ON bank_transactions(reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON bank_transactions(transaction_date);
`;

async function run() {
  console.log('Running Phase 4.8 migration...');
  await pool.query(migration);
  console.log('Phase 4.8 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 4.8 migration failed:', err);
  process.exit(1);
});
