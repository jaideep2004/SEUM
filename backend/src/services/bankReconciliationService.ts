import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';

interface BankAccount {
  id: string; tenant_id: string; bank_name: string; account_number: string;
  account_type: string; opening_balance: string; current_balance: string;
  is_active: boolean; created_at: string; updated_at: string;
}

interface BankTransaction {
  id: string; tenant_id: string; bank_account_id: string;
  transaction_date: string; description: string; reference: string;
  debit: string; credit: string; reconciled: boolean;
  matched_invoice_id: string | null; matched_expense_id: string | null;
}

// ─── Bank Accounts CRUD ───

export async function createAccount(tenantId: string, input: {
  bank_name: string; account_number: string; account_type?: string; opening_balance?: number;
}, createdBy?: string) {
  const id = uuid();
  const opening = input.opening_balance || 0;
  const acct = await queryOne<BankAccount>(
    `INSERT INTO bank_accounts (id, tenant_id, bank_name, account_number, account_type, opening_balance, current_balance, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, tenantId, input.bank_name, input.account_number, input.account_type || 'checking', opening, opening, createdBy || null],
  );
  return acct;
}

export async function listAccounts(tenantId: string) {
  return query<BankAccount>(
    `SELECT * FROM bank_accounts WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY bank_name`,
    [tenantId],
  );
}

export async function getAccount(tenantId: string, accountId: string) {
  const acct = await queryOne<BankAccount>(
    `SELECT * FROM bank_accounts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [accountId, tenantId],
  );
  if (!acct) throw new Error('Bank account not found');
  return acct;
}

export async function updateAccount(tenantId: string, accountId: string, input: { bank_name?: string; account_type?: string }) {
  const acct = await getAccount(tenantId, accountId);
  const bankName = input.bank_name || acct.bank_name;
  const acctType = input.account_type || acct.account_type;
  return queryOne<BankAccount>(
    `UPDATE bank_accounts SET bank_name = $1, account_type = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [bankName, acctType, accountId, tenantId],
  );
}

// ─── Import Transactions ───

export async function importTransactions(tenantId: string, accountId: string, transactions: {
  transaction_date: string; description?: string; reference?: string; debit?: number; credit?: number;
}[]) {
  await getAccount(tenantId, accountId); // validate account exists

  const inserted: BankTransaction[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const tx of transactions) {
    const id = uuid();
    const debit = tx.debit || 0;
    const credit = tx.credit || 0;
    const row = await queryOne<BankTransaction>(
      `INSERT INTO bank_transactions (id, tenant_id, bank_account_id, transaction_date, description, reference, debit, credit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, tenantId, accountId, tx.transaction_date, tx.description || '', tx.reference || '', debit, credit],
    );
    if (row) inserted.push(row);
    totalDebit += debit;
    totalCredit += credit;
  }

  // Update current balance
  const net = totalCredit - totalDebit;
  await query(
    `UPDATE bank_accounts SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`,
    [net, accountId],
  );

  return inserted;
}

// ─── List Transactions ───

export async function listTransactions(tenantId: string, accountId: string, reconciled?: boolean) {
  await getAccount(tenantId, accountId);
  let sql = `SELECT * FROM bank_transactions WHERE tenant_id = $1 AND bank_account_id = $2`;
  const params: any[] = [tenantId, accountId];
  if (reconciled !== undefined) {
    sql += ` AND reconciled = $3`;
    params.push(reconciled);
  }
  sql += ` ORDER BY transaction_date DESC, created_at DESC`;
  return query<BankTransaction>(sql, params);
}

// ─── Reconciliation ───

export async function getUnmatchedSources(tenantId: string) {
  const bankTxs = await query<any>(
    `SELECT bt.*, ba.bank_name, ba.account_number
     FROM bank_transactions bt
     JOIN bank_accounts ba ON ba.id = bt.bank_account_id
     WHERE bt.tenant_id = $1 AND bt.reconciled = false AND bt.deleted_at IS NULL
     ORDER BY bt.transaction_date DESC`,
    [tenantId],
  );

  const invoices = await query<any>(
    `SELECT id, invoice_number AS reference, customer_name AS party, total AS amount, due_date AS date, status
     FROM invoices WHERE tenant_id = $1 AND deleted_at IS NULL AND status IN ('issued','overdue') AND (paid_amount IS NULL OR paid_amount < total)
     ORDER BY due_date`,
    [tenantId],
  );

  const expenses = await query<any>(
    `SELECT id, expense_category AS category, description, amount, date, status
     FROM expenses WHERE tenant_id = $1 AND deleted_at IS NULL AND status IN ('pending','approved')
     ORDER BY date`,
    [tenantId],
  );

  return { bankTransactions: bankTxs, invoices, expenses };
}

export async function matchTransaction(tenantId: string, transactionId: string, matchType: 'invoice' | 'expense', matchId: string) {
  const tx = await queryOne<BankTransaction>(
    `SELECT * FROM bank_transactions WHERE id = $1 AND tenant_id = $2`,
    [transactionId, tenantId],
  );
  if (!tx) throw new Error('Transaction not found');
  if (tx.reconciled) throw new Error('Transaction already reconciled');

  if (matchType === 'invoice') {
    const inv = await queryOne<any>(
      `SELECT id FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [matchId, tenantId],
    );
    if (!inv) throw new Error('Invoice not found');

    await query(
      `UPDATE bank_transactions SET reconciled = true, matched_invoice_id = $1 WHERE id = $2`,
      [matchId, transactionId],
    );
    await query(
      `UPDATE invoices SET paid_amount = COALESCE(paid_amount, 0) + $1 WHERE id = $2`,
      [parseFloat(tx.credit) || parseFloat(tx.debit) || 0, matchId],
    );
  } else {
    const exp = await queryOne<any>(
      `SELECT id FROM expenses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [matchId, tenantId],
    );
    if (!exp) throw new Error('Expense not found');

    await query(
      `UPDATE bank_transactions SET reconciled = true, matched_expense_id = $1 WHERE id = $2`,
      [matchId, transactionId],
    );
  }

  return getUnmatchedSources(tenantId);
}

export async function unmatchTransaction(tenantId: string, transactionId: string) {
  const tx = await queryOne<BankTransaction>(
    `SELECT * FROM bank_transactions WHERE id = $1 AND tenant_id = $2`,
    [transactionId, tenantId],
  );
  if (!tx) throw new Error('Transaction not found');
  if (!tx.reconciled) throw new Error('Transaction is not reconciled');

  if (tx.matched_invoice_id) {
    await query(
      `UPDATE invoices SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - $1, 0) WHERE id = $2`,
      [parseFloat(tx.credit) || parseFloat(tx.debit) || 0, tx.matched_invoice_id],
    );
  }

  await query(
    `UPDATE bank_transactions SET reconciled = false, matched_invoice_id = NULL, matched_expense_id = NULL WHERE id = $1`,
    [transactionId],
  );

  return getUnmatchedSources(tenantId);
}
