import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', DID = 'd1', AID = 'a1';

beforeEach(() => { jest.resetAllMocks(); });

describe('checkIn', () => {
  it('creates attendance on first check-in', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: AID, tenant_id: TID, driver_id: DID, date: '2025-01-15', check_in_time: '2025-01-15T06:00:00Z', check_out_time: null, status: 'present', late_minutes: 0, notes: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    const { checkIn } = require('../services/driverAttendanceService');
    const r = await checkIn(TID, DID);
    expect(r.status).toMatch(/present|late/);
  });

  it('throws if already checked in today', async () => {
    mockQ1.mockResolvedValue({ id: AID, check_in_time: new Date().toISOString(), status: 'present' });
    const { checkIn } = require('../services/driverAttendanceService');
    await expect(checkIn(TID, DID)).rejects.toThrow('Already checked in');
  });
});

describe('checkOut', () => {
  it('updates check-out time', async () => {
    mockQ1.mockResolvedValueOnce({ id: AID, tenant_id: TID, driver_id: DID, date: '2025-01-15', check_in_time: '2025-01-15T06:00:00Z', check_out_time: null, status: 'present', late_minutes: 0, notes: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null }).mockResolvedValueOnce({ id: AID, tenant_id: TID, driver_id: DID, date: '2025-01-15', check_in_time: '2025-01-15T06:00:00Z', check_out_time: '2025-01-15T14:00:00Z', status: 'present', late_minutes: 0, notes: null, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    const { checkOut } = require('../services/driverAttendanceService');
    const r = await checkOut(TID, DID);
    expect(r.checkOutTime).toBeTruthy();
  });
});

describe('listAttendance', () => {
  it('returns paginated attendance', async () => {
    mockQ1.mockResolvedValue({ count: 2 });
    mockQ.mockResolvedValue([{ id: AID, driver_id: DID, date: '2025-01-15', check_in_time: '06:00', check_out_time: '14:00', status: 'present', late_minutes: 0, driver_employee_code: 'D001', driver_name: 'John', driver_license_number: 'L123', driver_photo_url: null, driver_status: 'active' }]);
    const { listAttendance } = require('../services/driverAttendanceService');
    const r = await listAttendance(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].driver.name).toBe('John');
  });
});

describe('getMonthlySummary', () => {
  it('returns monthly stats', async () => {
    mockQ1.mockResolvedValue({ count: '5' });
    mockQ.mockResolvedValue([{ status: 'present', count: 20 }, { status: 'late', count: 2 }]);
    const { getMonthlySummary } = require('../services/driverAttendanceService');
    const r = await getMonthlySummary(TID, 2025, 1);
    expect(r.present).toBe(20);
    expect(r.totalDrivers).toBe(5);
  });
});

describe('getTodayDashboard', () => {
  it('returns today stats', async () => {
    mockQ.mockResolvedValueOnce([{ status: 'present', count: '3' }]);
    mockQ1.mockResolvedValueOnce({ count: '5' });
    const { getTodayDashboard } = require('../services/driverAttendanceService');
    const r = await getTodayDashboard(TID);
    expect(r.present).toBe(3);
    expect(r.totalDrivers).toBe(5);
  });
});
