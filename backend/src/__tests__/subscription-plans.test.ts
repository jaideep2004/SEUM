import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;

beforeEach(() => { jest.resetAllMocks(); });

describe('listPlans', () => {
  it('returns all plans ordered by price', async () => {
    mockQuery.mockResolvedValue([{ id: 'p1', name: 'Starter', tier: 'basic', price_monthly: '99', price_yearly: '999', max_users: 10, max_vehicles: 5, max_storage_gb: 10, features: {}, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' }]);
    const { listPlans } = require('../services/subscriptionPlanService');
    const plans = await listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Starter');
  });
});

describe('getPlanById', () => {
  it('returns plan when found', async () => {
    mockQueryOne.mockResolvedValue({ id: 'p1', name: 'Pro', tier: 'premium', price_monthly: '299', price_yearly: '2999', max_users: 50, max_vehicles: 20, max_storage_gb: 100, features: { analytics: true }, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' });
    const { getPlanById } = require('../services/subscriptionPlanService');
    const plan = await getPlanById('p1');
    expect(plan?.name).toBe('Pro');
    expect(plan?.features).toContain('analytics');
  });

  it('returns null when not found', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { getPlanById } = require('../services/subscriptionPlanService');
    const plan = await getPlanById('nonexistent');
    expect(plan).toBeNull();
  });
});

describe('createPlan', () => {
  it('creates a new plan', async () => {
    mockQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p-new', name: 'New Plan', tier: 'custom', price_monthly: '199', price_yearly: '1999', max_users: 25, max_vehicles: 10, max_storage_gb: 50, features: { api: true }, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' });
    const { createPlan } = require('../services/subscriptionPlanService');
    const plan = await createPlan({ name: 'New Plan', tier: 'custom', priceMonthly: 199, priceYearly: 1999, maxUsers: 25, maxVehicles: 10, maxStorageGb: 50, features: ['api'] });
    expect(plan.name).toBe('New Plan');
  });

  it('throws on duplicate name', async () => {
    mockQueryOne.mockResolvedValue({ id: 'existing' });
    const { createPlan } = require('../services/subscriptionPlanService');
    await expect(createPlan({ name: 'Dup', tier: 'basic', priceMonthly: 0, priceYearly: 0, maxUsers: 0, maxVehicles: 0, maxStorageGb: 0, features: [] })).rejects.toThrow('already exists');
  });
});

describe('updatePlan', () => {
  it('updates plan fields', async () => {
    mockQueryOne.mockResolvedValue({ id: 'p1', name: 'Updated', tier: 'premium', price_monthly: '399', price_yearly: '3999', max_users: 100, max_vehicles: 50, max_storage_gb: 500, features: { all: true }, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' });
    mockQuery.mockResolvedValue([]);
    const { updatePlan } = require('../services/subscriptionPlanService');
    const plan = await updatePlan('p1', { name: 'Updated', priceMonthly: 399 });
    expect(plan?.name).toBe('Updated');
  });
});

describe('softDeletePlan', () => {
  it('soft deletes a plan', async () => {
    mockQueryOne.mockResolvedValue({ id: 'p1', name: 'Old', tier: 'basic', price_monthly: '0', price_yearly: '0', max_users: 0, max_vehicles: 0, max_storage_gb: 0, features: {}, is_active: false, created_at: '2025-01-01', updated_at: '2025-01-01' });
    const { softDeletePlan } = require('../services/subscriptionPlanService');
    const plan = await softDeletePlan('p1');
    expect(plan?.isActive).toBe(false);
  });
});
