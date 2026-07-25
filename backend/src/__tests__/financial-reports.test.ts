import { query, queryOne, pool } from '../db';

jest.mock('../db', () => {
  const mocker = (rows: any) => jest.fn().mockResolvedValue(rows);
  return {
    query: jest.fn(),
    queryOne: jest.fn(),
    pool: { query: jest.fn() },
  };
});

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;

const TENANT_ID = 'test-tenant-reports';
const START = '2025-01-01';
const END = '2025-12-31';

beforeEach(() => { jest.clearAllMocks(); });

// ─── profitLoss ───

describe('profitLoss', () => {
  it('returns P&L with revenue and expense breakdowns', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'a1', code: '4000', name: 'Revenue' }])
      .mockResolvedValueOnce([{ id: 'a2', code: '5100', name: 'Fuel' }]);
    mockQueryOne
      .mockResolvedValueOnce({ bal: '50000' })   // totalRevenue
      .mockResolvedValueOnce({ bal: '20000' })   // totalExpenses
      .mockResolvedValueOnce({ bal: '50000' })   // revenueBreakdown for a1
      .mockResolvedValueOnce({ bal: '20000' });  // expenseBreakdown for a2

    const { profitLoss } = require('../services/financialReportService');
    const result = await profitLoss(TENANT_ID, START, END);

    expect(result.totalRevenue).toBe(50000);
    expect(result.totalExpenses).toBe(20000);
    expect(result.netProfit).toBe(30000);
    expect(result.revenueBreakdown).toHaveLength(1);
    expect(result.expenseBreakdown).toHaveLength(1);
  });

  it('handles zero accounts gracefully', async () => {
    mockQuery.mockResolvedValue([]);
    const { profitLoss } = require('../services/financialReportService');
    const result = await profitLoss(TENANT_ID, START, END);
    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netProfit).toBe(0);
  });
});

// ─── balanceSheet ───

describe('balanceSheet', () => {
  it('returns asset, liability, and equity sections', async () => {
    jest.resetAllMocks();
    mockQuery.mockImplementation((sql: string, params: any[]) => {
      const type = params?.[1];
      if (type === 'asset')  return Promise.resolve([{ id: 'a1', code: '1000', name: 'Cash' }]);
      if (type === 'liability') return Promise.resolve([{ id: 'l1', code: '2000', name: 'AP' }]);
      if (type === 'equity') return Promise.resolve([{ id: 'e1', code: '3000', name: 'Equity' }]);
      if (type === 'revenue' || type === 'expense') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    mockQueryOne.mockResolvedValue({ bal: '10000' });

    const { balanceSheet } = require('../services/financialReportService');
    const result = await balanceSheet(TENANT_ID, END);

    expect(result.sections[0].section).toBe('Assets');
    expect(result.sections[0].total).toBe(10000);
    expect(result.sections).toHaveLength(4);
  });
});

// ─── arAging ───

describe('arAging', () => {
  it('returns aging buckets', async () => {
    mockQuery.mockResolvedValue([
      { invoice_number: 'INV-001', customer_name: 'Alice', invoice_date: '2025-01-01', due_date: '2025-11-16', total: '1000', paid_amount: '0', status: 'issued' },
    ]);

    const { arAging } = require('../services/financialReportService');
    const result = await arAging(TENANT_ID, '2025-12-31');
    expect(result.aging).toHaveLength(1);
    expect(result.aging[0].bucket).toBe('31-60');
    expect(result.totals['31-60']).toBe(1000);
  });
});

// ─── apAging ───

describe('apAging', () => {
  it('returns AP aging buckets from expenses', async () => {
    mockQuery.mockResolvedValue([
      { id: 'e1', vendor: 'Fuel Co', date: '2025-01-01', amount: '500', status: 'pending', created_at: '2025-01-01' },
    ]);

    const { apAging } = require('../services/financialReportService');
    const result = await apAging(TENANT_ID, END);
    expect(result.aging).toHaveLength(1);
    expect(result.aging[0].vendor).toBe('Fuel Co');
  });
});

// ─── cashFlow ───

describe('cashFlow', () => {
  it('returns cash flow with operating section', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('journal_entry_lines')) return Promise.resolve([{ inflow: '30000', outflow: '10000' }]);
      return Promise.resolve([{ expense_category: 'Fuel', total: '5000' }]);
    });

    const { cashFlow } = require('../services/financialReportService');
    const result = await cashFlow(TENANT_ID, START, END);
    expect(result.operating.inflow).toBe(30000);
    expect(result.operating.outflow).toBe(10000);
    expect(result.operating.breakdown).toHaveLength(1);
    expect(result.netCashChange).toBe(20000);
  });
});

// ─── PDF generation ───

describe('generatePdf', () => {
  it('returns a Buffer for profit-loss report', async () => {
    const { profitLoss, generatePdf } = require('../services/financialReportService');
    mockQuery.mockResolvedValue([]);
    const result = await generatePdf(TENANT_ID, 'profit-loss', { start_date: START, end_date: END });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });

  it('returns a Buffer for balance-sheet report', async () => {
    const { generatePdf } = require('../services/financialReportService');
    mockQuery.mockResolvedValue([]);
    const result = await generatePdf(TENANT_ID, 'balance-sheet', { as_of_date: END });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });
});

// ─── CSV generation ───

describe('generateCsv', () => {
  it('returns CSV string for profit-loss', async () => {
    mockQuery.mockResolvedValue([]);
    const { generateCsv } = require('../services/financialReportService');
    const csv = await generateCsv(TENANT_ID, 'profit-loss', { start_date: START, end_date: END });
    expect(csv).toContain('Profit & Loss');
    expect(csv).toContain('Code');
  });

  it('returns CSV string for ar-aging', async () => {
    mockQuery.mockResolvedValue([]);
    const { generateCsv } = require('../services/financialReportService');
    const csv = await generateCsv(TENANT_ID, 'ar-aging', { as_of_date: END });
    expect(csv).toContain('Accounts Receivable Aging');
    expect(csv).toContain('Invoice');
  });
});
