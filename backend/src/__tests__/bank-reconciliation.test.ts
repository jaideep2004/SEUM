import { query, queryOne } from '../db';

jest.mock('../db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;

const TID = 'test-tenant-bank';
const UID = 'test-user';
const ACCT_ID = 'acct-1';
const TX_ID = 'tx-1';

beforeEach(() => { jest.resetAllMocks(); });

// ─── createAccount ───

describe('createAccount', () => {
  it('creates a bank account with opening balance', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: ACCT_ID, tenant_id: TID, bank_name: 'Riyad Bank', account_number: 'SA001', account_type: 'checking', opening_balance: '10000', current_balance: '10000' });
    const { createAccount } = require('../services/bankReconciliationService');
    const result = await createAccount(TID, { bank_name: 'Riyad Bank', account_number: 'SA001', opening_balance: 10000 }, UID);
    expect(result.bank_name).toBe('Riyad Bank');
    expect(result.current_balance).toBe('10000');
  });
});

// ─── listAccounts ───

describe('listAccounts', () => {
  it('returns all accounts', async () => {
    mockQuery.mockResolvedValue([{ id: ACCT_ID, bank_name: 'Riyad Bank' }]);
    const { listAccounts } = require('../services/bankReconciliationService');
    const rows = await listAccounts(TID);
    expect(rows).toHaveLength(1);
  });
});

// ─── importTransactions ───

describe('importTransactions', () => {
  it('imports transactions and updates balance', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ACCT_ID, tenant_id: TID, bank_name: 'Test' }) // getAccount
      .mockResolvedValueOnce({ id: 'tx-1', bank_account_id: ACCT_ID, transaction_date: '2025-01-15', description: 'Deposit', credit: '5000', debit: '0' })
      .mockResolvedValueOnce({ id: 'tx-2', bank_account_id: ACCT_ID, transaction_date: '2025-01-16', description: 'Withdrawal', credit: '0', debit: '2000' });
    mockQuery.mockResolvedValue([]);

    const { importTransactions } = require('../services/bankReconciliationService');
    const result = await importTransactions(TID, ACCT_ID, [
      { transaction_date: '2025-01-15', description: 'Deposit', credit: 5000 },
      { transaction_date: '2025-01-16', description: 'Withdrawal', debit: 2000 },
    ]);
    expect(result).toHaveLength(2);
  });
});

// ─── matchTransaction ───

describe('matchTransaction', () => {
  it('matches a bank transaction to an invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TX_ID, tenant_id: TID, reconciled: false, credit: '5000', debit: '0' }) // tx check
      .mockResolvedValueOnce({ id: 'inv-1' }) // invoice exists
      .mockResolvedValueOnce({ bankTransactions: [], invoices: [], expenses: [] }); // getUnmatchedSources
    mockQuery.mockResolvedValue([]);

    const { matchTransaction } = require('../services/bankReconciliationService');
    const result = await matchTransaction(TID, TX_ID, 'invoice', 'inv-1');
    expect(result).toBeDefined();
  });

  it('throws for already reconciled transaction', async () => {
    mockQueryOne.mockResolvedValue({ id: TX_ID, reconciled: true });
    mockQuery.mockResolvedValue([]);
    const { matchTransaction } = require('../services/bankReconciliationService');
    await expect(matchTransaction(TID, TX_ID, 'invoice', 'inv-1')).rejects.toThrow('already reconciled');
  });
});

// ─── getUnmatchedSources ───

describe('getUnmatchedSources', () => {
  it('returns unmatched bank txs, invoices, and expenses', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('bank_transactions')) return Promise.resolve([{ id: TX_ID, bank_name: 'Test', account_number: 'SA001', credit: '5000' }]);
      if (sql.includes('invoices')) return Promise.resolve([{ id: 'inv-1', reference: 'INV-001', amount: '5000' }]);
      if (sql.includes('expenses')) return Promise.resolve([{ id: 'exp-1', amount: '1000' }]);
      return Promise.resolve([]);
    });
    const { getUnmatchedSources } = require('../services/bankReconciliationService');
    const result = await getUnmatchedSources(TID);
    expect(result.bankTransactions).toHaveLength(1);
    expect(result.invoices).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
  });
});

// ─── unmatchTransaction ───

describe('unmatchTransaction', () => {
  it('unmatches a reconciled transaction', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TX_ID, tenant_id: TID, reconciled: true, matched_invoice_id: 'inv-1', credit: '5000', debit: '0' })
      .mockResolvedValueOnce({ bankTransactions: [], invoices: [], expenses: [] });
    mockQuery.mockResolvedValue([]);

    const { unmatchTransaction } = require('../services/bankReconciliationService');
    const result = await unmatchTransaction(TID, TX_ID);
    expect(result).toBeDefined();
  });
});
