import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', BID = 'b1', TASKID = 'm1', UID = 'u1';

const ROW = {
  id: TASKID, tenant_id: TID, bus_id: BID, task_type: 'oil_change',
  description: 'Change oil', priority: 'high', scheduled_date: '2026-09-01',
  scheduled_km: 50000, recurring_interval_days: null, recurring_interval_km: 10000,
  status: 'scheduled', assigned_workshop: 'Al Wadi Garage', assigned_mechanic: 'Ali',
  started_at: null, started_by: null, completed_at: null, completed_by: null,
  completion_notes: null, cost: null, cancelled_at: null, cancelled_by: null,
  cancellation_reason: null, created_at: '2026-08-12', updated_at: '2026-08-12',
  bus_plate: 'BUS-001', bus_make: 'MAN', bus_model: '2024', bus_current_km: 50400,
  bus_next_km_threshold: 60000,
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createTask', () => {
  it('creates a task and joins bus info', async () => {
    mockQ1.mockResolvedValueOnce({ id: BID }).mockResolvedValueOnce({ ...ROW }).mockResolvedValueOnce({ ...ROW });
    const { createTask } = require('../services/maintenanceService');
    const t = await createTask(TID, UID, { bus_id: BID, task_type: 'oil_change', priority: 'high', scheduled_date: '2026-09-01', scheduled_km: 50000 });
    expect(t.status).toBe('scheduled');
    expect(t.bus.plateNumber).toBe('BUS-001');
    expect(t.priority).toBe('high');
  });

  it('throws when bus not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { createTask } = require('../services/maintenanceService');
    await expect(createTask(TID, UID, { bus_id: BID, scheduled_date: '2026-09-01' })).rejects.toThrow('Bus not found');
  });
});

describe('listTasks', () => {
  it('returns paginated tasks, impossible priority order first', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...ROW, priority: 'critical' }]);
    const { listTasks } = require('../services/maintenanceService');
    const r = await listTasks(TID, { page: 1, pageSize: 20, status: 'scheduled', priority: 'critical', bus_id: BID, search: 'BUS' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].bus.plateNumber).toBe('BUS-001');
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('t.status');
    expect(sql).toContain('t.priority');
    expect(sql).toContain('b.plate_number ILIKE');
  });
});

describe('state machine', () => {
  it('start only from scheduled', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'scheduled' }).mockResolvedValueOnce({ ...ROW, status: 'in_progress', started_at: '2026-08-12', started_by: UID }).mockResolvedValueOnce({ ...ROW, status: 'in_progress' });
    const { startTask } = require('../services/maintenanceService');
    const t = await startTask(TID, TASKID, UID);
    expect(t.status).toBe('in_progress');
  });

  it('start rejects wrong state', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'completed' });
    const { startTask } = require('../services/maintenanceService');
    await expect(startTask(TID, TASKID, UID)).rejects.toThrow('Only scheduled tasks can be started');
  });

  it('complete sets notes and cost and advances threshold', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'in_progress' }).mockResolvedValueOnce({ ...ROW, status: 'completed', completion_notes: 'Done', cost: '250.50', recurring_interval_km: 10000 }).mockResolvedValueOnce({ ...ROW, status: 'completed', completion_notes: 'Done', cost: '250.50' });
    mockQ.mockResolvedValue([]);
    const { completeTask } = require('../services/maintenanceService');
    const t = await completeTask(TID, TASKID, UID, 'Done', 250.5);
    expect(t.status).toBe('completed');
    expect(t.cost).toBe(250.5);
    expect(mockQ.mock.calls[0][0]).toContain('next_km_threshold = current_km');
    expect(mockQ.mock.calls[0][1]).toEqual([10000, BID]);
  });

  it('complete rejects if not in progress', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'scheduled' });
    const { completeTask } = require('../services/maintenanceService');
    await expect(completeTask(TID, TASKID, UID)).rejects.toThrow('Only in-progress tasks can be completed');
  });

  it('cancel stores reason', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'scheduled' }).mockResolvedValueOnce({ ...ROW, status: 'cancelled', cancellation_reason: 'Parts unavailable', cancelled_by: UID }).mockResolvedValueOnce({ ...ROW, status: 'cancelled', cancellation_reason: 'Parts unavailable' });
    const { cancelTask } = require('../services/maintenanceService');
    const t = await cancelTask(TID, TASKID, UID, 'Parts unavailable');
    expect(t.status).toBe('cancelled');
    expect(t.cancellationReason).toBe('Parts unavailable');
  });

  it('cancel rejects completed', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID, status: 'completed' });
    const { cancelTask } = require('../services/maintenanceService');
    await expect(cancelTask(TID, TASKID, UID, 'why')).rejects.toThrow('Completed tasks cannot be cancelled');
  });
});

describe('getCalendar', () => {
  it('queries by year and month', async () => {
    mockQ.mockResolvedValue([]);
    const { getCalendar } = require('../services/maintenanceService');
    await getCalendar(TID, 2026, 9, 'scheduled');
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain('EXTRACT(YEAR FROM t.scheduled_date)');
    expect(sql).toContain('EXTRACT(MONTH FROM t.scheduled_date)');
    expect(mockQ.mock.calls[0][1]).toEqual([TID, 2026, 9, 'scheduled']);
  });
});

describe('autoGenerateTasks', () => {
  it('creates tasks for buses at threshold and skips those with open tasks', async () => {
    mockQ.mockResolvedValueOnce([{ id: 'b1', plate_number: 'BUS-1', current_km: 61000, next_km_threshold: 60000 }])
      .mockResolvedValueOnce([]);
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'm-gen', bus_id: 'b1', scheduled_date: '2026-08-12' });
    const { autoGenerateTasks } = require('../services/maintenanceService');
    const r = await autoGenerateTasks(TID, UID);
    expect(r.generated).toBe(1);
  });

  it('skips buses with an open task', async () => {
    mockQ.mockResolvedValueOnce([{ id: 'b1', plate_number: 'BUS-1', current_km: 61000, next_km_threshold: 60000 }]);
    mockQ1.mockResolvedValueOnce({ id: 'open' });
    const { autoGenerateTasks } = require('../services/maintenanceService');
    const r = await autoGenerateTasks(TID, UID);
    expect(r.generated).toBe(0);
  });
});

describe('updateTask / deleteTask', () => {
  it('updates fields', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID }).mockResolvedValueOnce({ ...ROW, priority: 'critical' }).mockResolvedValueOnce({ ...ROW, priority: 'critical' });
    const { updateTask } = require('../services/maintenanceService');
    const t = await updateTask(TID, TASKID, { priority: 'critical' });
    expect(t.priority).toBe('critical');
  });

  it('soft deletes', async () => {
    mockQ1.mockResolvedValueOnce({ id: TASKID });
    const { deleteTask } = require('../services/maintenanceService');
    await expect(deleteTask(TID, TASKID)).resolves.toEqual({ id: TASKID });
  });

  it('getTaskById throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getTaskById } = require('../services/maintenanceService');
    await expect(getTaskById(TID, 'nope')).rejects.toThrow('Task not found');
  });
});