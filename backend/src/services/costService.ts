import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type {
  CreateCostInput, UpdateCostInput, ListCostsQuery,
} from '../validators/costs';

interface CostRow {
  id: string; tenant_id: string; maintenance_task_id: string;
  parts_cost: string; labor_hours: string; labor_rate: string; labor_cost: string;
  total_cost: string; paid_to: string | null; invoice_number: string | null;
  status: string; created_by: string | null; created_at: string; updated_at: string;
}

const COST_TASK_JOIN = `
  SELECT c.*, t.task_type, t.status AS task_status, t.scheduled_date,
         t.assigned_workshop, t.assigned_mechanic,
         b.id AS bus_id, b.plate_number AS bus_plate, b.make AS bus_make, b.model AS bus_model,
         b.purchase_date AS bus_purchase_date, b.created_at AS bus_created_at
  FROM maintenance_costs c
  JOIN maintenance_tasks t ON t.id = c.maintenance_task_id
  JOIN buses b ON b.id = t.bus_id
`;

function mapCost(row: CostRow & Record<string, any>) {
  return {
    id: row.id, tenantId: row.tenant_id, maintenanceTaskId: row.maintenance_task_id,
    partsCost: parseFloat(row.parts_cost),
    laborHours: parseFloat(row.labor_hours),
    laborRate: parseFloat(row.labor_rate),
    laborCost: parseFloat(row.labor_cost),
    totalCost: parseFloat(row.total_cost),
    paidTo: row.paid_to, invoiceNumber: row.invoice_number, status: row.status,
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
    task: {
      taskType: row.task_type, status: row.task_status, scheduledDate: row.scheduled_date,
      assignedWorkshop: row.assigned_workshop, assignedMechanic: row.assigned_mechanic,
    },
    bus: {
      id: row.bus_id, plateNumber: row.bus_plate, make: row.bus_make, model: row.bus_model,
      purchaseDate: row.bus_purchase_date,
    },
  };
}

async function requireTask(tenantId: string, taskId: string) {
  const task = await queryOne<{ id: string }>(
    'SELECT id FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!task) throw new NotFoundError('Maintenance task not found');
}

async function calcPartsCost(taskId: string) {
  const row = await queryOne<{ total: string | null }>(
    `SELECT SUM(total) AS total
     FROM inventory_transactions
     WHERE reference_type = 'maintenance_task'
       AND reference_id = $1
       AND transaction_type = 'out'`,
    [taskId]
  );
  return row?.total ? parseFloat(row.total) : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createCost(tenantId: string, userId: string, input: CreateCostInput) {
  await requireTask(tenantId, input.maintenance_task_id);
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM maintenance_costs WHERE maintenance_task_id = $1',
    [input.maintenance_task_id]
  );
  if (existing) throw new ConflictError('Cost record already exists for this task');

  const partsCost = await calcPartsCost(input.maintenance_task_id);
  const laborCost = round2(input.labor_hours * input.labor_rate);
  const totalCost = round2(partsCost + laborCost);

  const id = uuid();
  const row = await queryOne<CostRow>(
    `INSERT INTO maintenance_costs
       (id, tenant_id, maintenance_task_id, parts_cost, labor_hours, labor_rate,
        labor_cost, total_cost, paid_to, invoice_number, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [id, tenantId, input.maintenance_task_id, partsCost, input.labor_hours,
     input.labor_rate, laborCost, totalCost, input.paid_to || null,
     input.invoice_number || null, input.status, userId]
  );
  const withJoin = await queryOne<any>(`${COST_TASK_JOIN} WHERE c.id = $1`, [id]);
  return mapCost(withJoin || row as any);
}

export async function listCosts(tenantId: string, params: ListCostsQuery) {
  const conditions: string[] = ['c.tenant_id = $1'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.bus_id) { conditions.push(`b.id = $${idx}`); values.push(params.bus_id); idx++; }
  if (params.task_type) { conditions.push(`t.task_type = $${idx}`); values.push(params.task_type); idx++; }
  if (params.status) { conditions.push(`c.status = $${idx}`); values.push(params.status); idx++; }
  if (params.start_date) { conditions.push(`t.scheduled_date >= $${idx}`); values.push(params.start_date); idx++; }
  if (params.end_date) { conditions.push(`t.scheduled_date <= $${idx}`); values.push(params.end_date); idx++; }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM maintenance_costs c
     JOIN maintenance_tasks t ON t.id = c.maintenance_task_id
     JOIN buses b ON b.id = t.bus_id
     WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `${COST_TASK_JOIN} WHERE ${where}
     ORDER BY t.scheduled_date DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  const summary = await queryOne<any>(
    `SELECT COALESCE(SUM(c.parts_cost), 0)::numeric AS parts,
            COALESCE(SUM(c.labor_cost), 0)::numeric AS labor,
            COALESCE(SUM(c.total_cost), 0)::numeric AS total
     FROM maintenance_costs c
     JOIN maintenance_tasks t ON t.id = c.maintenance_task_id
     JOIN buses b ON b.id = t.bus_id
     WHERE ${where}`, values
  );
  return {
    data: rows.map(mapCost),
    meta: { total, page: params.page, pageSize: params.pageSize },
    summary: {
      partsCost: parseFloat(summary?.parts || '0'),
      laborCost: parseFloat(summary?.labor || '0'),
      totalCost: parseFloat(summary?.total || '0'),
    },
  };
}

export async function getCostById(tenantId: string, costId: string) {
  const row = await queryOne<any>(
    `${COST_TASK_JOIN} WHERE c.id = $1 AND c.tenant_id = $2`,
    [costId, tenantId]
  );
  if (!row) throw new NotFoundError('Cost record not found');
  return mapCost(row);
}

export async function updateCost(tenantId: string, costId: string, input: UpdateCostInput) {
  const existing = await queryOne<CostRow>(
    'SELECT * FROM maintenance_costs WHERE id = $1 AND tenant_id = $2',
    [costId, tenantId]
  );
  if (!existing) throw new NotFoundError('Cost record not found');
  if (existing.status === 'paid' || existing.status === 'cancelled') {
    throw new ConflictError(`Cost record is ${existing.status} and cannot be modified`);
  }

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    paid_to: input.paid_to, invoice_number: input.invoice_number,
    status: input.status,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const cast = col === 'status' ? 'varchar' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val); idx++;
    }
  }

  const laborHours = input.labor_hours !== undefined ? input.labor_hours : parseFloat(existing.labor_hours);
  const laborRate = input.labor_rate !== undefined ? input.labor_rate : parseFloat(existing.labor_rate);
  const partsCost = parseFloat(existing.parts_cost);
  const laborCost = round2(laborHours * laborRate);
  const totalCost = round2(partsCost + laborCost);
  if (input.labor_hours !== undefined || input.labor_rate !== undefined) {
    sets.push(`labor_hours = $${idx}::numeric`); values.push(laborHours); idx++;
    sets.push(`labor_rate = $${idx}::numeric`); values.push(laborRate); idx++;
    sets.push(`labor_cost = $${idx}::numeric`); values.push(laborCost); idx++;
    sets.push(`total_cost = $${idx}::numeric`); values.push(totalCost); idx++;
  }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(costId, tenantId);

  const row = await queryOne<CostRow>(
    `UPDATE maintenance_costs SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  const withJoin = await queryOne<any>(`${COST_TASK_JOIN} WHERE c.id = $1`, [costId]);
  return mapCost(withJoin || row as any);
}

export async function getCostsByBus(tenantId: string) {
  const rows = await query<any>(
    `SELECT b.id, b.plate_number, b.make, b.model,
            COUNT(c.id)::int AS task_count,
            COALESCE(SUM(c.parts_cost), 0)::numeric AS parts_cost,
            COALESCE(SUM(c.labor_cost), 0)::numeric AS labor_cost,
            COALESCE(SUM(c.total_cost), 0)::numeric AS total_cost,
            MAX(c.created_at) AS last_cost_date
     FROM maintenance_costs c
     JOIN maintenance_tasks t ON t.id = c.maintenance_task_id
     JOIN buses b ON b.id = t.bus_id
     WHERE c.tenant_id = $1
     GROUP BY b.id, b.plate_number, b.make, b.model
     ORDER BY total_cost DESC`,
    [tenantId]
  );
  const grandTotal = rows.reduce((acc: number, r: any) => acc + parseFloat(r.total_cost || '0'), 0);
  return {
    grandTotal,
    buses: rows.map((r: any) => ({
      busId: r.id, plateNumber: r.plate_number, make: r.make, model: r.model,
      taskCount: Number(r.task_count),
      partsCost: parseFloat(r.parts_cost || '0'),
      laborCost: parseFloat(r.labor_cost || '0'),
      totalCost: parseFloat(r.total_cost || '0'),
      lastCostDate: r.last_cost_date,
    })),
  };
}

export async function getAgeAnalytics(tenantId: string) {
  const rows = await query<any>(
    `SELECT b.id, b.plate_number, b.make, b.model,
            b.purchase_date, b.created_at,
            COUNT(c.id)::int AS task_count,
            COALESCE(SUM(c.total_cost), 0)::numeric AS total_cost
     FROM buses b
     LEFT JOIN maintenance_tasks t ON t.bus_id = b.id
     LEFT JOIN maintenance_costs c ON c.maintenance_task_id = t.id AND c.tenant_id = $1
     WHERE b.tenant_id = $1
     GROUP BY b.id, b.plate_number, b.make, b.model, b.purchase_date, b.created_at
     ORDER BY b.plate_number ASC`,
    [tenantId]
  );
  const now = Date.now();
  return {
    points: rows.map((r: any) => {
      const refDate = r.purchase_date || r.created_at;
      const ageYears = refDate
        ? Math.max(0, (now - new Date(refDate).getTime()) / (365.25 * 24 * 3600 * 1000))
        : 0;
      return {
        busId: r.id, plateNumber: r.plate_number, make: r.make, model: r.model,
        ageYears: Math.round(ageYears * 10) / 10,
        purchaseDate: r.purchase_date,
        taskCount: Number(r.task_count),
        totalCost: parseFloat(r.total_cost || '0'),
      };
    }),
  };
}