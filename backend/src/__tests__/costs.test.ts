import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', TASKID = 'm1', BUSID = 'b1', COSTID = 'c1', UID = 'u1';

const TASK = { id: TASKID };
const COST = {
  id: COSTID, tenant_id: TID, maintenance_task_id: TASKID,
  parts_cost: '100.00', labor_hours: '4', labor_rate: '50', labor_cost: '200.00',
  total_cost: '300.00', paid_to: null, invoice_number: 'INV-001', status: 'pending',
  created_by: UID, created_at: '2026-08-12', updated_at: '2026-08-12',
  task_type: 'oil_change', task_status: 'completed', scheduled_date: '2026-08-12',
  assigned_workshop: 'Al Wadi', assigned_mechanic: 'Ali',
  bus_id: BUSID, bus_plate: 'BUS-001', bus_make: 'MAN', bus_model: '2024',
  bus_purchase_date: '2022-01-15', bus_created_at: '2022-01-15',
};

const SUMMARY = { parts: '100', labor: '200', total: '300' };

beforeEach(() => { jest.resetAllMocks(); });

describe('createCost', () => {
  it('auto-calculates parts cost from linked stock-outs and labor from hours', async () => {
    mockQ1.mockResolvedValueOnce(TASK).mockResolvedValueOnce(null).mockResolvedValueOnce({ total: '100.00' }).mockResolvedValueOnce({ ...COST }).mockResolvedValueOnce({ ...COST });
    const { createCost } = require('../services/costService');
    const c = await createCost(TID, UID, { maintenance_task_id: TASKID, labor_hours: 4, labor_rate: 50, invoice_number: 'INV-001' });
    expect(c.partsCost).toBe(100);
    expect(c.laborCost).toBe(200);
    expect(c.totalCost).toBe(300);
    const partsQuery = mockQ1.mock.calls[2][0] as string;
    expect(partsQuery).toContain("reference_type = 'maintenance_task'");
    expect(partsQuery).toContain("transaction_type = 'out'");
  });

  it('rejects duplicate cost record for the same task', async () => {
    mockQ1.mockResolvedValueOnce(TASK).mockResolvedValueOnce({ id: COSTID });
    const { createCost } = require('../services/costService');
    await expect(createCost(TID, UID, { maintenance_task_id: TASKID, labor_hours: 1 })).rejects.toThrow('Cost record already exists');
  });

  it('throws when task not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { createCost } = require('../services/costService');
    await expect(createCost(TID, UID, { maintenance_task_id: 'nope', labor_hours: 1 })).rejects.toThrow('Maintenance task not found');
  });
});

describe('listCosts', () => {
  it('returns records with summary and filters', async () => {
    mockQ1.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce(SUMMARY);
    mockQ.mockResolvedValue([{ ...COST }]);
    const { listCosts } = require('../services/costService');
    const r = await listCosts(TID, { page: 1, pageSize: 20, bus_id: BUSID, task_type: 'oil_change', status: 'pending', start_date: '2026-08-01', end_date: '2026-08-31' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].totalCost).toBe(300);
    expect(r.summary.totalCost).toBe(300);
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('b.id');
    expect(sql).toContain('t.task_type');
    expect(sql).toContain('t.scheduled_date');
  });
});

describe('updateCost', () => {
  it('recomputes labor and total when hours change', async () => {
    mockQ1.mockResolvedValueOnce({ ...COST }).mockResolvedValueOnce({ ...COST, labor_hours: '6', labor_cost: '300.00', total_cost: '400.00' }).mockResolvedValueOnce({ ...COST, labor_hours: '6', labor_cost: '300.00', total_cost: '400.00' });
    const { updateCost } = require('../services/costService');
    const c = await updateCost(TID, COSTID, { labor_hours: 6 });
    expect(c.laborCost).toBe(300);
    expect(c.totalCost).toBe(400);
  });

  it('rejects updates on paid records', async () => {
    mockQ1.mockResolvedValueOnce({ ...COST, status: 'paid' });
    const { updateCost } = require('../services/costService');
    await expect(updateCost(TID, COSTID, { invoice_number: 'X' })).rejects.toThrow('cannot be modified');
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { updateCost } = require('../services/costService');
    await expect(updateCost(TID, 'nope', { invoice_number: 'X' })).rejects.toThrow('Cost record not found');
  });
});

describe('getCostsByBus', () => {
  it('aggregates lifetime cost per bus desc', async () => {
    mockQ.mockResolvedValue([
      { id: BUSID, plate_number: 'BUS-001', make: 'MAN', model: '2024', task_count: 3, parts_cost: '150', labor_cost: '250', total_cost: '400', last_cost_date: '2026-08-12' },
      { id: 'b2', plate_number: 'BUS-002', make: 'Yutong', model: '2023', task_count: 1, parts_cost: '50', labor_cost: '50', total_cost: '100', last_cost_date: '2026-07-01' },
    ]);
    const { getCostsByBus } = require('../services/costService');
    const r = await getCostsByBus(TID);
    expect(r.grandTotal).toBe(500);
    expect(r.buses[0].totalCost).toBe(400);
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain('GROUP BY b.id');
    expect(sql).toContain('ORDER BY total_cost DESC');
  });
});

describe('getAgeAnalytics', () => {
  it('maps buses with age years and life-time cost, includes buses with no costs', async () => {
    mockQ.mockResolvedValue([
      { id: BUSID, plate_number: 'BUS-001', make: 'MAN', model: '2024', purchase_date: '2022-01-15', created_at: '2022-01-15', task_count: 3, total_cost: '400' },
      { id: 'b2', plate_number: 'BUS-002', make: 'Yutong', model: '2023', purchase_date: null, created_at: '2024-06-01', task_count: 0, total_cost: '0' },
    ]);
    const { getAgeAnalytics } = require('../services/costService');
    const r = await getAgeAnalytics(TID);
    expect(r.points).toHaveLength(2);
    expect(r.points[0].ageYears).toBeGreaterThan(3);
    expect(r.points[0].totalCost).toBe(400);
    expect(r.points[1].taskCount).toBe(0);
  });
});