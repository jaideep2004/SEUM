import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', AID = 'a1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createAccount', () => {
  it('creates account', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: AID, tenant_id: TID, code: '5600', name: 'Test Expense', type: 'expense', description: 'test', parent_account_id: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', deleted_at: null });
    mockQ.mockResolvedValue([]);
    const { createAccount } = require('../services/accountService');
    const a = await createAccount(TID, { name: 'Test Expense', type: 'expense', code: '5600', description: 'test', isActive: true });
    expect(a.name).toBe('Test Expense');
  });
});

describe('listAccounts', () => {
  it('returns accounts and tree', async () => {
    mockQ.mockResolvedValue([{ id: AID, tenant_id: TID, code: '1000', name: 'Assets', type: 'asset', description: '', parent_account_id: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', deleted_at: null }]);
    const { listAccounts } = require('../services/accountService');
    const r = await listAccounts(TID);
    expect(r.accounts).toHaveLength(1);
    expect(r.tree).toHaveLength(1);
  });
});

describe('updateAccount', () => {
  it('updates account', async () => {
    mockQ1.mockResolvedValueOnce({ id: AID, status: 'active' }).mockResolvedValueOnce({ id: AID, tenant_id: TID, code: '1100', name: 'Cash Updated', type: 'asset', description: '', parent_account_id: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', deleted_at: null });
    mockQ.mockResolvedValue([]);
    const { updateAccount } = require('../services/accountService');
    const a = await updateAccount(TID, AID, { name: 'Cash Updated' });
    expect(a.name).toBe('Cash Updated');
  });
});

describe('getAccountDetail', () => {
  it('returns account with journal entries', async () => {
    mockQ1.mockResolvedValueOnce({ id: AID, tenant_id: TID, code: '5100', name: 'Fuel', type: 'expense', description: '', parent_account_id: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01', deleted_at: null });
    mockQ.mockResolvedValue([{ id: 'jel-1', journal_entry_id: 'je-1', account_id: AID, debit_amount: '500', credit_amount: '0', description: 'Fuel cost', entry_number: 'JE-001', entry_date: '2025-01-15', entry_status: 'posted' }]);
    const { getAccountDetail } = require('../services/accountService');
    const d = await getAccountDetail(TID, AID);
    expect(d.name).toBe('Fuel');
  });
});
