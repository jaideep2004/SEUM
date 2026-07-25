import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface PlanRow {
  id: string;
  name: string;
  tier: string;
  price_monthly: string;
  price_yearly: string;
  max_users: number;
  max_vehicles: number;
  max_depots: number;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
  maxStorageGb: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    priceMonthly: Number(row.price_monthly),
    priceYearly: Number(row.price_yearly),
    maxUsers: row.max_users,
    maxVehicles: row.max_vehicles,
    maxStorageGb: row.max_depots,
    features: Object.entries(row.features || {})
      .filter(([, v]) => v)
      .map(([k]) => k),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlans(isActive?: boolean): Promise<Plan[]> {
  let sql = 'SELECT * FROM subscription_plans';
  const params: unknown[] = [];
  if (isActive !== undefined) {
    sql += ' WHERE is_active = $1';
    params.push(isActive);
  }
  sql += ' ORDER BY price_monthly ASC';
  const rows = await query<PlanRow>(sql, params);
  return rows.map(mapRowToPlan);
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const row = await queryOne<PlanRow>('SELECT * FROM subscription_plans WHERE id = $1', [id]);
  return row ? mapRowToPlan(row) : null;
}

export interface CreatePlanInput {
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
  maxStorageGb: number;
  features: string[];
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM subscription_plans WHERE name = $1',
    [input.name]
  );
  if (existing) {
    throw new ConflictError('A plan with this name already exists');
  }

  const id = uuid();
  const featuresObj: Record<string, boolean> = {};
  for (const f of input.features) {
    featuresObj[f] = true;
  }

  const row = await queryOne<PlanRow>(
    `INSERT INTO subscription_plans (id, name, tier, price_monthly, price_yearly, max_users, max_vehicles, max_depots, features)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.name,
      input.tier,
      input.priceMonthly,
      input.priceYearly,
      input.maxUsers,
      input.maxVehicles,
      input.maxStorageGb,
      JSON.stringify(featuresObj),
    ]
  );

  return mapRowToPlan(row!);
}

const planFieldMap: Record<string, string> = {
  name: 'name',
  tier: 'tier',
  priceMonthly: 'price_monthly',
  priceYearly: 'price_yearly',
  maxUsers: 'max_users',
  maxVehicles: 'max_vehicles',
  maxStorageGb: 'max_depots',
  isActive: 'is_active',
};

export async function updatePlan(id: string, updates: Record<string, unknown>): Promise<Plan | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(planFieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${paramIndex++}`);
      values.push((updates as any)[key] ?? null);
    }
  }

  if (updates.features !== undefined) {
    const featuresObj: Record<string, boolean> = {};
    for (const f of updates.features as string[]) {
      featuresObj[f] = true;
    }
    fields.push(`features = $${paramIndex++}`);
    values.push(JSON.stringify(featuresObj));
  }

  if (fields.length === 0) {
    return getPlanById(id);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const row = await queryOne<PlanRow>(
    `UPDATE subscription_plans SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return row ? mapRowToPlan(row) : null;
}

export async function softDeletePlan(id: string): Promise<Plan | null> {
  const row = await queryOne<PlanRow>(
    `UPDATE subscription_plans SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return row ? mapRowToPlan(row) : null;
}

export async function hardDeletePlan(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    'DELETE FROM subscription_plans WHERE id = $1 RETURNING id',
    [id]
  );
  return !!row;
}
