import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', PID = 'p1', UID = 'u1', TASKID = 'm1', BUSID = 'b1';

const PART = {
  id: PID, tenant_id: TID, part_code: 'OIL-F-5W30', part_name: 'Engine Oil 5W-30',
  category: 'Lubricants', manufacturer: 'Valvoline', unit_of_measure: 'liter',
  quantity_in_stock: 20, reorder_level: 10, unit_price: '12.50',
  supplier_id: null, storage_location: 'Shelf A-3',
  created_at: '2026-08-12', updated_at: '2026-08-12',
};

const TX = {
  id: 'tx1', spare_part_id: PID, transaction_type: 'in', quantity: 5,
  reference_type: 'purchase', reference_id: null, unit_price: '12.50',
  total: '62.50', notes: null, date: '2026-08-12', performed_by: UID, created_at: '2026-08-12',
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createPart', () => {
  it('creates a part and logs initial stock transaction', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...PART }).mockResolvedValueOnce({ ...TX });
    const { createPart } = require('../services/partService');
    const p = await createPart(TID, UID, { part_code: 'OIL-F-5W30', part_name: 'Engine Oil 5W-30', quantity_in_stock: 20, reorder_level: 10, unit_price: 12.5 });
    expect(p.partCode).toBe('OIL-F-5W30');
    expect(p.lowStock).toBe(false);
    expect(mockQ1.mock.calls[2][0]).toContain('INSERT INTO inventory_transactions');
  });

  it('rejects duplicate part code', async () => {
    mockQ1.mockResolvedValueOnce({ id: PID });
    const { createPart } = require('../services/partService');
    await expect(createPart(TID, UID, { part_code: 'OIL-F-5W30', part_name: 'X' })).rejects.toThrow('Part code already exists');
  });
});

describe('listParts', () => {
  it('returns paginated parts with low stock flag and filters', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...PART, quantity_in_stock: 5 }]);
    const { listParts } = require('../services/partService');
    const r = await listParts(TID, { page: 1, pageSize: 20, category: 'Lubricants', search: 'OIL', lowStock: 'true' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].lowStock).toBe(true);
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('p.category');
    expect(sql).toContain('quantity_in_stock <= p.reorder_level');
    expect(sql).toContain('p.part_code ILIKE');
  });
});

describe('updatePart', () => {
  it('updates fields', async () => {
    mockQ1.mockResolvedValueOnce({ ...PART }).mockResolvedValueOnce({ ...PART, reorder_level: 25 }).mockResolvedValue(null);
    const { updatePart } = require('../services/partService');
    const p = await updatePart(TID, PID, { reorder_level: 25 });
    expect(p.reorderLevel).toBe(25);
  });

  it('throws when part missing', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { updatePart } = require('../services/partService');
    await expect(updatePart(TID, PID, { part_name: 'X' })).rejects.toThrow('Part not found');
  });
});

describe('stock-in / stock-out', () => {
  it('stock-in adds quantity and records transaction with part price', async () => {
    mockQ1.mockResolvedValueOnce({ ...PART }).mockResolvedValueOnce({ ...PART, quantity_in_stock: 25 }).mockResolvedValueOnce({ ...TX });
    const { stockIn } = require('../services/partService');
    const r = await stockIn(TID, PID, UID, { quantity: 5, unit_price: 12.5, reference_type: 'purchase' });
    expect(r.quantityInStock).toBe(25);
    expect(r.transaction.total).toBe(62.5);
  });

  it('stock-out removes quantity and links to maintenance task', async () => {
    const lowPart = { ...PART, quantity_in_stock: 8 };
    mockQ1.mockResolvedValueOnce(lowPart).mockResolvedValueOnce({ id: TASKID }).mockResolvedValueOnce({ ...lowPart, quantity_in_stock: 3 }).mockResolvedValueOnce({ ...TX, transaction_type: 'out', reference_type: 'maintenance_task', reference_id: TASKID });
    const { stockOut } = require('../services/partService');
    const r = await stockOut(TID, PID, UID, { quantity: 5, maintenance_task_id: TASKID });
    expect(r.quantityInStock).toBe(3);
    const sql = mockQ1.mock.calls[3][0] as string;
    expect(sql).toContain('INSERT INTO inventory_transactions');
    const vals = mockQ1.mock.calls[3][1] as any[];
    expect(vals[4]).toBe('maintenance_task');
    expect(vals[5]).toBe(TASKID);
  });

  it('stock-out rejects insufficient stock', async () => {
    mockQ1.mockResolvedValueOnce({ ...PART, quantity_in_stock: 2 });
    const { stockOut } = require('../services/partService');
    await expect(stockOut(TID, PID, UID, { quantity: 5 })).rejects.toThrow('Insufficient stock');
  });

  it('stock-out rejects unknown maintenance task', async () => {
    mockQ1.mockResolvedValueOnce({ ...PART }).mockResolvedValueOnce(null);
    const { stockOut } = require('../services/partService');
    await expect(stockOut(TID, PID, UID, { quantity: 1, maintenance_task_id: 'nope' })).rejects.toThrow('Maintenance task not found');
  });

  it('getPartById throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getPartById } = require('../services/partService');
    await expect(getPartById(TID, 'nope')).rejects.toThrow('Part not found');
  });
});

describe('listTransactions', () => {
  it('filters and joins part info', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...TX, part_code: 'OIL-F-5W30', part_name: 'Engine Oil 5W-30' }]);
    const { listTransactions } = require('../services/partService');
    const r = await listTransactions(TID, { page: 1, pageSize: 20, part_id: PID, transaction_type: 'in' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].partCode).toBe('OIL-F-5W30');
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain('JOIN spare_parts p');
  });
});

describe('getUsageByBus', () => {
  it('rejects unknown bus', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getUsageByBus } = require('../services/partService');
    await expect(getUsageByBus(TID, 'nope')).rejects.toThrow('Bus not found');
  });

  it('returns usage history with task info and totals', async () => {
    mockQ1.mockResolvedValueOnce({ id: BUSID });
    mockQ.mockResolvedValue([
      { id: 'tx1', reference_id: TASKID, quantity: 4, unit_price: '12.50', total: '50.00', date: '2026-08-12',
        part_code: 'OIL-F-5W30', part_name: 'Engine Oil 5W-30', unit_of_measure: 'liter', part_unit_price: '12.50',
        task_type: 'oil_change', task_status: 'completed', scheduled_date: '2026-08-12',
        assigned_workshop: 'Al Wadi', assigned_mechanic: 'Ali' },
    ]);
    const { getUsageByBus } = require('../services/partService');
    const r = await getUsageByBus(TID, BUSID);
    expect(r.totalParts).toBe(4);
    expect(r.totalCost).toBe(50);
    expect(r.items[0].task.taskType).toBe('oil_change');
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain("it.reference_type = 'maintenance_task'");
    expect(sql).toContain('mt.bus_id');
  });
});