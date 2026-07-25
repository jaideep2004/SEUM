import { query, queryOne } from '../db';
import bcrypt from 'bcrypt';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));
jest.mock('bcrypt');

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;

const TID = 'tenant-1';
const UID = 'user-1';
const DRIVER_ID = 'driver-1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createDriver', () => {
  it('creates driver with user account', async () => {
    mockQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'role-driver' }).mockResolvedValueOnce({ id: DRIVER_ID, tenant_id: TID, user_id: UID, employee_code: 'D001', status: 'active', created_at: '2025-01-01', updated_at: '2025-01-01' });
    mockBcryptHash.mockResolvedValue('hashed');
    mockQuery.mockResolvedValue([]);
    const { createDriver } = require('../services/driverService');
    const result = await createDriver(TID, UID, { email: 'driver@test.com', password: 'pass123', name: 'John', employeeCode: 'D001', status: 'active' });
    expect(result.name).toBe('John');
    expect(result.employeeCode).toBe('D001');
  });

  it('throws if email already exists', async () => {
    mockQueryOne.mockResolvedValue({ id: 'existing-user' });
    const { createDriver } = require('../services/driverService');
    await expect(createDriver(TID, UID, { email: 'dup@test.com', password: 'pass', name: 'Dup' })).rejects.toThrow('already exists');
  });
});

describe('listDrivers', () => {
  it('returns paginated drivers', async () => {
    mockQueryOne.mockResolvedValue({ count: 1 });
    mockQuery.mockResolvedValue([{ id: DRIVER_ID, tenant_id: TID, status: 'active', user_name: 'John', user_email: 'j@t.com', employee_code: 'D001', created_at: '2025-01-01', updated_at: '2025-01-01' }]);
    const { listDrivers } = require('../services/driverService');
    const result = await listDrivers(TID, { page: 1, pageSize: 20 }, false);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

describe('getDriverById', () => {
  it('returns driver with documents', async () => {
    mockQueryOne.mockResolvedValue({ id: DRIVER_ID, tenant_id: TID, user_name: 'John', user_email: 'j@t.com', employee_code: 'D001', status: 'active', created_at: '2025-01-01', updated_at: '2025-01-01' });
    mockQuery.mockResolvedValue([]);
    const { getDriverById } = require('../services/driverService');
    const driver = await getDriverById(TID, DRIVER_ID, false);
    expect(driver.name).toBe('John');
    expect(driver.documents).toEqual([]);
  });

  it('throws if not found', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { getDriverById } = require('../services/driverService');
    await expect(getDriverById(TID, 'bad-id', false)).rejects.toThrow('not found');
  });
});

describe('updateDriver', () => {
  it('updates driver fields', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: DRIVER_ID }).mockResolvedValueOnce({ id: DRIVER_ID, tenant_id: TID, user_name: 'John Updated', user_email: 'j@t.com', employee_code: 'D001', status: 'active', created_at: '2025-01-01', updated_at: '2025-01-01' });
    mockQuery.mockResolvedValue([]);
    const { updateDriver } = require('../services/driverService');
    const driver = await updateDriver(TID, DRIVER_ID, { status: 'on_leave' }, false);
    expect(driver.name).toBe('John Updated');
  });
});

describe('softDeleteDriver', () => {
  it('marks driver as terminated', async () => {
    mockQueryOne.mockResolvedValue({ id: DRIVER_ID });
    mockQuery.mockResolvedValue([]);
    const { softDeleteDriver } = require('../services/driverService');
    const result = await softDeleteDriver(TID, DRIVER_ID, false);
    expect(result.status).toBe('terminated');
  });
});

describe('getExpiringLicenses', () => {
  it('returns drivers with expiring licenses', async () => {
    mockQuery.mockResolvedValue([{ id: DRIVER_ID, user_name: 'John', user_email: 'j@t.com', employee_code: 'D001', license_expiry: '2025-02-01', status: 'active' }]);
    const { getExpiringLicenses } = require('../services/driverService');
    const drivers = await getExpiringLicenses(TID, 30);
    expect(drivers).toHaveLength(1);
  });
});
