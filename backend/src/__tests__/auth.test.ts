import bcrypt from 'bcrypt';
import { query, queryOne } from '../db';
import jwt from 'jsonwebtoken';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));
jest.mock('bcrypt');

const mockSign = jest.fn(() => 'mock-token');
const mockVerify = jest.fn(() => ({ userId: 'u1', tenantId: 't1', email: 'a@b.com', roles: ['admin'] }));
jest.mock('jsonwebtoken', () => ({ sign: mockSign, verify: mockVerify }));

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

const TID = 'tenant-1';
const UID = 'user-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockSign.mockImplementation(() => 'mock-token');
  mockVerify.mockImplementation(() => ({ userId: 'u1', tenantId: 't1', email: 'a@b.com', roles: ['admin'] }));
});

describe('registerUser', () => {
  it('creates user and assigns roles', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    mockBcryptHash.mockResolvedValue('hashed');
    mockQuery.mockResolvedValue([]);
    const { registerUser } = require('../services/authService');
    const result = await registerUser(TID, 'new@user.com', 'pass123', 'New User', ['admin']);
    expect(result.email).toBe('new@user.com');
    expect(mockQuery).toHaveBeenCalledTimes(2); // INSERT user + INSERT role
  });

  it('throws if email exists', async () => {
    mockQueryOne.mockResolvedValue({ id: 'existing' });
    const { registerUser } = require('../services/authService');
    await expect(registerUser(TID, 'dup@user.com', 'pass', 'Dup', [])).rejects.toThrow('already exists');
  });
});

describe('loginUser', () => {
  it('returns user and tokens on valid credentials', async () => {
    mockQueryOne.mockResolvedValue({ id: UID, tenant_id: TID, email: 'a@b.com', name: 'A', password_hash: 'hash', is_active: true, tenant_active: true, roles: ['admin'], failed_login_attempts: 0, locked_until: null, created_at: '2025-01-01' });
    mockBcryptCompare.mockResolvedValue(true);
    mockQuery.mockResolvedValue([]);
    const { loginUser } = require('../services/authService');
    const result = await loginUser('a@b.com', 'pass');
    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toBe('mock-token');
  });

  it('throws for unknown email', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { loginUser } = require('../services/authService');
    await expect(loginUser('unknown@test.com', 'pass')).rejects.toThrow('Invalid email or password');
  });

  it('throws for inactive tenant', async () => {
    mockQueryOne.mockResolvedValue({ id: UID, password_hash: 'hash', is_active: true, tenant_active: false, roles: [] });
    const { loginUser } = require('../services/authService');
    await expect(loginUser('a@b.com', 'pass')).rejects.toThrow('inactive');
  });

  it('throws for locked account', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    mockQueryOne.mockResolvedValue({ id: UID, password_hash: 'hash', is_active: true, tenant_active: true, roles: [], locked_until: future });
    const { loginUser } = require('../services/authService');
    await expect(loginUser('a@b.com', 'pass')).rejects.toThrow('locked');
  });

  it('locks account after 5 failed attempts', async () => {
    mockQueryOne.mockResolvedValue({ id: UID, password_hash: 'hash', is_active: true, tenant_active: true, roles: [], locked_until: null, failed_login_attempts: 4 });
    mockBcryptCompare.mockResolvedValue(false);
    const { loginUser } = require('../services/authService');
    await expect(loginUser('a@b.com', 'wrong')).rejects.toThrow('locked');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('locked_until'), expect.any(Array));
  });
});

describe('getUserProfile', () => {
  it('returns user profile', async () => {
    mockQueryOne.mockResolvedValue({ id: UID, tenant_id: TID, email: 'a@b.com', name: 'A', roles: ['admin'], is_active: true, created_at: '2025-01-01', tenant_name: 'TestCo' });
    const { getUserProfile } = require('../services/authService');
    const result = await getUserProfile(UID);
    expect(result.name).toBe('A');
    expect(result.tenantName).toBe('TestCo');
  });

  it('throws if not found', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { getUserProfile } = require('../services/authService');
    await expect(getUserProfile('nonexistent')).rejects.toThrow('not found');
  });
});

describe('forgotPassword', () => {
  it('generates reset token for known email', async () => {
    mockQueryOne.mockResolvedValue({ id: UID, email: 'a@b.com', name: 'A' });
    mockQuery.mockResolvedValue([]);
    const { forgotPassword } = require('../services/authService');
    await forgotPassword('a@b.com');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('reset_token_hash'), expect.any(Array));
  });

  it('silently returns for unknown email', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { forgotPassword } = require('../services/authService');
    await expect(forgotPassword('unknown@test.com')).resolves.toBeUndefined();
  });
});

describe('resetPassword', () => {
  it('resets password and invalidates sessions', async () => {
    mockQueryOne.mockResolvedValue({ id: UID });
    mockBcryptHash.mockResolvedValue('newhash');
    mockQuery.mockResolvedValue([]);
    const { resetPassword } = require('../services/authService');
    await resetPassword('valid-token', 'newpass');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('throws for invalid token', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { resetPassword } = require('../services/authService');
    await expect(resetPassword('bad-token', 'newpass')).rejects.toThrow('Invalid or expired reset token');
  });
});

describe('createTenant', () => {
  it('creates a new tenant with starter plan', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null) // no existing
      .mockResolvedValueOnce({ id: 'starter-plan-id' }); // starter plan lookup
    mockQuery.mockResolvedValue([]);
    const { createTenant } = require('../services/authService');
    const result = await createTenant('NewCo', 'admin@newco.com');
    expect(result.name).toBe('NewCo');
  });

  it('throws if tenant name exists', async () => {
    mockQueryOne.mockResolvedValue({ id: 'existing' });
    const { createTenant } = require('../services/authService');
    await expect(createTenant('Dup', 'a@b.com')).rejects.toThrow('already exists');
  });
});

describe('listTenants', () => {
  it('returns all tenants', async () => {
    mockQuery.mockResolvedValue([{ id: 't1', name: 'Co1' }, { id: 't2', name: 'Co2' }]);
    const { listTenants } = require('../services/authService');
    const rows = await listTenants();
    expect(rows).toHaveLength(2);
  });
});

describe('updateTenant', () => {
  it('updates tenant fields', async () => {
    mockQueryOne.mockResolvedValue({ id: 't1', name: 'Updated', contact_email: 'a@b.com' });
    mockQuery.mockResolvedValue([]);
    const { updateTenant } = require('../services/authService');
    const result = await updateTenant('t1', { name: 'Updated' });
    expect(result?.name).toBe('Updated');
  });
});
