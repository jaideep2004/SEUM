import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', WID = 'w1';

const WORKSHOP = {
  id: WID, tenant_id: TID, name: 'Al Wadi Garage', location: 'Jeddah Industrial Area',
  contact: '0501234567', supervisor: 'Ali Hassan', is_internal: false,
  services: ['engine_service', 'oil_change', 'electrical'],
  created_at: '2026-08-12', updated_at: '2026-08-12',
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createWorkshop', () => {
  it('creates a workshop with services array', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...WORKSHOP });
    const { createWorkshop } = require('../services/workshopService');
    const w = await createWorkshop(TID, { name: 'Al Wadi Garage', is_internal: false, services: ['engine_service', 'oil_change'] });
    expect(w.name).toBe('Al Wadi Garage');
    expect(w.isInternal).toBe(false);
    expect(w.services).toHaveLength(3);
    const vals = mockQ1.mock.calls[1][1] as any[];
    expect(vals[7]).toEqual(['engine_service', 'oil_change']);
  });

  it('rejects duplicate name', async () => {
    mockQ1.mockResolvedValueOnce({ id: WID });
    const { createWorkshop } = require('../services/workshopService');
    await expect(createWorkshop(TID, { name: 'Al Wadi Garage' })).rejects.toThrow('Workshop name already exists');
  });
});

describe('listWorkshops', () => {
  it('filters internal/external and search', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...WORKSHOP }]);
    const { listWorkshops } = require('../services/workshopService');
    const r = await listWorkshops(TID, { page: 1, pageSize: 50, is_internal: 'false', search: 'Wadi' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].isInternal).toBe(false);
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('w.is_internal = false');
    expect(sql).toContain('w.name ILIKE');
  });
});

describe('updateWorkshop / delete', () => {
  it('updates fields', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...WORKSHOP })
      .mockResolvedValueOnce({ ...WORKSHOP, supervisor: 'Khalid' });
    const { updateWorkshop } = require('../services/workshopService');
    const w = await updateWorkshop(TID, WID, { supervisor: 'Khalid', services: ['engine_service'] });
    expect(w.supervisor).toBe('Khalid');
    const vals = mockQ1.mock.calls[1][1] as any[];
    expect(vals[1]).toEqual(['engine_service']);
  });

  it('soft deletes', async () => {
    mockQ1.mockResolvedValueOnce({ id: WID });
    const { deleteWorkshop } = require('../services/workshopService');
    await expect(deleteWorkshop(TID, WID)).resolves.toEqual({ id: WID });
  });

  it('getWorkshopById throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getWorkshopById } = require('../services/workshopService');
    await expect(getWorkshopById(TID, 'nope')).rejects.toThrow('Workshop not found');
  });
});

describe('getWorkshopTasks', () => {
  it('returns workshop with assigned tasks matching workshop name', async () => {
    mockQ1.mockResolvedValueOnce({ ...WORKSHOP });
    mockQ.mockResolvedValue([
      { id: 'm1', task_type: 'engine_service', priority: 'high', status: 'in_progress',
        scheduled_date: '2026-08-15', assigned_mechanic: 'Ali', description: 'Check engine', cost: '150.50',
        bus_plate: 'BUS-001', bus_make: 'MAN', bus_model: '2024' },
    ]);
    const { getWorkshopTasks } = require('../services/workshopService');
    const r = await getWorkshopTasks(TID, WID);
    expect(r.tasks).toHaveLength(1);
    expect(r.tasks[0].bus.plateNumber).toBe('BUS-001');
    expect(r.tasks[0].cost).toBe(150.5);
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain('t.assigned_workshop = $2');
    expect(mockQ.mock.calls[0][1]).toEqual([TID, 'Al Wadi Garage']);
  });
});

describe('generateWorkOrderPdf', () => {
  it('returns a PDF buffer', async () => {
    mockQ1.mockResolvedValueOnce({ ...WORKSHOP });
    mockQ.mockResolvedValue([
      { id: 'm1', task_type: 'oil_change', priority: 'medium', status: 'scheduled',
        scheduled_date: '2026-08-15', assigned_mechanic: null, description: null, cost: null,
        bus_plate: 'BUS-001', bus_make: 'MAN', bus_model: '2024' },
    ]);
    const { generateWorkOrderPdf } = require('../services/workshopService');
    const pdf = await generateWorkOrderPdf(TID, WID);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(100);
  });
});