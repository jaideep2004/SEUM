import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', JE_ID = 'je-1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createJournalEntry', () => {
  it('creates entry with lines', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test entry', reference_type: 'manual', reference_id: null, status: 'draft', created_by: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null, posted_at: null });
    mockQ.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockQ1.mockResolvedValueOnce({ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test entry', status: 'draft', created_by_name: null, created_at: '2025-01-15', updated_at: '2025-01-15', posted_at: null });
    mockQ.mockResolvedValueOnce([{ id: 'l1', journal_entry_id: JE_ID, account_id: 'a1', debit_amount: '1000', credit_amount: '0', description: 'Dr', account_code: '5100', account_name: 'Fuel', account_type: 'expense', created_at: '2025-01-15' }]);
    const { createJournalEntry } = require('../services/journalEntryService');
    const e = await createJournalEntry(TID, {
      date: '2025-01-15', description: 'Test entry',
      lines: [
        { accountId: 'a1', debitAmount: 1000, creditAmount: 0, description: 'Dr' },
        { accountId: 'a2', debitAmount: 0, creditAmount: 1000, description: 'Cr' },
      ],
    });
    expect(e.status).toBe('draft');
  });
});

describe('listJournalEntries', () => {
  it('returns paginated entries', async () => {
    mockQ1.mockResolvedValue({ count: '2' });
    mockQ.mockResolvedValue([{ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test', status: 'draft', created_at: '2025-01-15', line_count: '2', total_debit: '1000', total_credit: '1000' }]);
    const { listJournalEntries } = require('../services/journalEntryService');
    const r = await listJournalEntries(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
  });
});

describe('getJournalEntryDetail', () => {
  it('returns entry with lines', async () => {
    mockQ1.mockResolvedValueOnce({ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test', status: 'draft', created_by_name: null, created_at: '2025-01-15', updated_at: '2025-01-15', posted_at: null });
    mockQ.mockResolvedValueOnce([{ id: 'l1', journal_entry_id: JE_ID, account_id: 'a1', debit_amount: '1000', credit_amount: '0', description: 'Dr', account_code: '5100', account_name: 'Fuel', account_type: 'expense', created_at: '2025-01-15' }]);
    const { getJournalEntryDetail } = require('../services/journalEntryService');
    const d = await getJournalEntryDetail(TID, JE_ID);
    expect(d.lines).toHaveLength(1);
    expect(d.lines[0].accountCode).toBe('5100');
  });
});

describe('postJournalEntry', () => {
  it('posts a draft entry', async () => {
    mockQ1.mockResolvedValueOnce({ id: JE_ID, status: 'draft' });
    mockQ.mockResolvedValueOnce([{ debit_amount: '500', credit_amount: '0' }, { debit_amount: '0', credit_amount: '500' }]);
    mockQ1.mockResolvedValueOnce({ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test', status: 'posted', posted_at: '2025-01-15T10:00:00Z', created_by_name: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    mockQ1.mockResolvedValueOnce({ id: JE_ID, tenant_id: TID, entry_number: 'JE-2025-0001', date: '2025-01-15', description: 'Test', status: 'posted', posted_at: '2025-01-15T10:00:00Z', created_by_name: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    mockQ.mockResolvedValueOnce([]);
    const { postJournalEntry } = require('../services/journalEntryService');
    const e = await postJournalEntry(TID, JE_ID);
    expect(e.status).toBe('posted');
  });

  it('throws if already posted', async () => {
    mockQ1.mockResolvedValue({ id: JE_ID, status: 'posted' });
    const { postJournalEntry } = require('../services/journalEntryService');
    await expect(postJournalEntry(TID, JE_ID)).rejects.toThrow();
  });
});
