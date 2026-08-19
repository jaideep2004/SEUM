import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type {
  CreateTaskInput, UpdateTaskInput, ListTasksQuery,
} from '../validators/maintenance';

interface TaskRow {
  id: string; tenant_id: string; bus_id: string; task_type: string;
  description: string | null; priority: string; scheduled_date: string;
  scheduled_km: number | null; recurring_interval_days: number | null;
  recurring_interval_km: number | null; status: string;
  assigned_workshop: string | null; assigned_mechanic: string | null;
  started_at: string | null; started_by: string | null;
  completed_at: string | null; completed_by: string | null;
  completion_notes: string | null; cost: string | null;
  cancelled_at: string | null; cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string; updated_at: string;
}

const TASK_BUS_JOIN = `
  SELECT t.*, b.plate_number AS bus_plate, b.make AS bus_make, b.model AS bus_model,
         b.current_km AS bus_current_km, b.next_km_threshold AS bus_next_km_threshold
  FROM maintenance_tasks t
  JOIN buses b ON b.id = t.bus_id
`;

function mapTask(row: TaskRow & Record<string, any>) {
  return {
    id: row.id, tenantId: row.tenant_id, busId: row.bus_id,
    taskType: row.task_type, description: row.description, priority: row.priority,
    scheduledDate: row.scheduled_date, scheduledKm: row.scheduled_km,
    recurringIntervalDays: row.recurring_interval_days,
    recurringIntervalKm: row.recurring_interval_km, status: row.status,
    assignedWorkshop: row.assigned_workshop, assignedMechanic: row.assigned_mechanic,
    startedAt: row.started_at, startedBy: row.started_by,
    completedAt: row.completed_at, completedBy: row.completed_by,
    completionNotes: row.completion_notes,
    cost: row.cost === null ? null : parseFloat(row.cost),
    cancelledAt: row.cancelled_at, cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at, updatedAt: row.updated_at,
    bus: {
      plateNumber: row.bus_plate, make: row.bus_make, model: row.bus_model,
      currentKm: row.bus_current_km, nextKmThreshold: row.bus_next_km_threshold,
    },
  };
}

async function requireBus(tenantId: string, busId: string) {
  const bus = await queryOne<{ id: string }>(
    'SELECT id FROM buses WHERE id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );
  if (!bus) throw new NotFoundError('Bus not found');
}

export async function createTask(tenantId: string, userId: string, input: CreateTaskInput) {
  await requireBus(tenantId, input.bus_id);
  const id = uuid();
  const row = await queryOne<TaskRow>(
    `INSERT INTO maintenance_tasks
       (id, tenant_id, bus_id, task_type, description, priority, scheduled_date, scheduled_km,
        recurring_interval_days, recurring_interval_km, assigned_workshop, assigned_mechanic, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [id, tenantId, input.bus_id, input.task_type, input.description || null,
     input.priority, input.scheduled_date, input.scheduled_km ?? null,
     input.recurring_interval_days ?? null, input.recurring_interval_km ?? null,
     input.assigned_workshop || null, input.assigned_mechanic || null, userId]
  );
  const withBus = await queryOne<any>(
    `${TASK_BUS_JOIN} WHERE t.id = $1`, [id]
  );
  return mapTask(withBus || row as any);
}

export async function listTasks(tenantId: string, params: ListTasksQuery) {
  const conditions: string[] = ['t.tenant_id = $1', 't.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.bus_id) { conditions.push(`t.bus_id = $${idx}`); values.push(params.bus_id); idx++; }
  if (params.status) { conditions.push(`t.status = $${idx}`); values.push(params.status); idx++; }
  if (params.priority) { conditions.push(`t.priority = $${idx}`); values.push(params.priority); idx++; }
  if (params.task_type) { conditions.push(`t.task_type = $${idx}`); values.push(params.task_type); idx++; }
  if (params.search) {
    conditions.push(`(b.plate_number ILIKE $${idx} OR t.assigned_workshop ILIKE $${idx} OR t.assigned_mechanic ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM maintenance_tasks t JOIN buses b ON b.id = t.bus_id WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `${TASK_BUS_JOIN} WHERE ${where}
     ORDER BY
       CASE t.status WHEN 'in_progress' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
       CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       t.scheduled_date ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapTask), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getTaskById(tenantId: string, taskId: string) {
  const row = await queryOne<any>(
    `${TASK_BUS_JOIN} WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [taskId, tenantId]
  );
  if (!row) throw new NotFoundError('Task not found');
  return mapTask(row);
}

export async function updateTask(tenantId: string, taskId: string, input: UpdateTaskInput) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!existing) throw new NotFoundError('Task not found');

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    task_type: input.task_type, description: input.description,
    priority: input.priority, scheduled_date: input.scheduled_date,
    scheduled_km: input.scheduled_km, recurring_interval_days: input.recurring_interval_days,
    recurring_interval_km: input.recurring_interval_km,
    assigned_workshop: input.assigned_workshop, assigned_mechanic: input.assigned_mechanic,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const cast = ['scheduled_km', 'recurring_interval_days', 'recurring_interval_km'].includes(col) ? 'integer'
        : col === 'scheduled_date' ? 'date' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val); idx++;
    }
  }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(taskId, tenantId);

  const row = await queryOne<TaskRow>(
    `UPDATE maintenance_tasks SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  const withBus = await queryOne<any>(`${TASK_BUS_JOIN} WHERE t.id = $1`, [taskId]);
  return mapTask(withBus || row as any);
}

export async function startTask(tenantId: string, taskId: string, userId: string) {
  const task = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!task) throw new NotFoundError('Task not found');
  if (task.status !== 'scheduled') throw new ConflictError('Only scheduled tasks can be started');

  const row = await queryOne<TaskRow>(
    `UPDATE maintenance_tasks SET status = 'in_progress', started_at = NOW(), started_by = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [userId, taskId, tenantId]
  );
  const withBus = await queryOne<any>(`${TASK_BUS_JOIN} WHERE t.id = $1`, [taskId]);
  return mapTask(withBus || row as any);
}

export async function completeTask(tenantId: string, taskId: string, userId: string, notes?: string, cost?: number) {
  const task = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!task) throw new NotFoundError('Task not found');
  if (task.status !== 'in_progress') throw new ConflictError('Only in-progress tasks can be completed');

  const row = await queryOne<TaskRow>(
    `UPDATE maintenance_tasks
     SET status = 'completed', completed_at = NOW(), completed_by = $1,
         completion_notes = $2, cost = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5 RETURNING *`,
    [userId, notes || null, cost ?? null, taskId, tenantId]
  );
  if (row && row.recurring_interval_km) {
    await query(
      `UPDATE buses SET next_km_threshold = current_km + $1, updated_at = NOW() WHERE id = $2`,
      [row.recurring_interval_km, row.bus_id]
    );
  }
  const withBus = await queryOne<any>(`${TASK_BUS_JOIN} WHERE t.id = $1`, [taskId]);
  return mapTask(withBus || row as any);
}

export async function cancelTask(tenantId: string, taskId: string, userId: string, reason: string) {
  const task = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!task) throw new NotFoundError('Task not found');
  if (task.status === 'completed') throw new ConflictError('Completed tasks cannot be cancelled');

  const row = await queryOne<TaskRow>(
    `UPDATE maintenance_tasks
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1,
         cancellation_reason = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [userId, reason, taskId, tenantId]
  );
  const withBus = await queryOne<any>(`${TASK_BUS_JOIN} WHERE t.id = $1`, [taskId]);
  return mapTask(withBus || row as any);
}

export async function deleteTask(tenantId: string, taskId: string) {
  const row = await queryOne<{ id: string }>(
    'UPDATE maintenance_tasks SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
    [taskId, tenantId]
  );
  if (!row) throw new NotFoundError('Task not found');
  return { id: taskId };
}

export async function getCalendar(tenantId: string, year: number, month: number, status?: string) {
  const conditions: string[] = [
    't.tenant_id = $1',
    't.deleted_at IS NULL',
    'EXTRACT(YEAR FROM t.scheduled_date) = $2',
    'EXTRACT(MONTH FROM t.scheduled_date) = $3',
  ];
  const values: any[] = [tenantId, year, month];
  if (status) { conditions.push(`t.status = $4`); values.push(status); }

  const rows = await query<any>(
    `SELECT t.*, b.plate_number AS bus_plate, b.make AS bus_make, b.model AS bus_model
     FROM maintenance_tasks t
     JOIN buses b ON b.id = t.bus_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.scheduled_date ASC`,
    values
  );
  return {
    year, month,
    tasks: rows.map((r) => ({
      id: r.id, busId: r.bus_id, taskType: r.task_type, description: r.description,
      priority: r.priority, scheduledDate: r.scheduled_date, status: r.status,
      assignedWorkshop: r.assigned_workshop, assignedMechanic: r.assigned_mechanic,
      cost: r.cost === null ? null : parseFloat(r.cost),
      bus: { plateNumber: r.bus_plate, make: r.bus_make, model: r.bus_model },
    })),
  };
}

export async function autoGenerateTasks(tenantId: string, userId: string) {
  const buses = await query<any>(
    `SELECT id, plate_number, current_km, next_km_threshold
     FROM buses
     WHERE tenant_id = $1
       AND next_km_threshold IS NOT NULL
       AND current_km >= next_km_threshold`,
    [tenantId]
  );
  const created: any[] = [];
  for (const bus of buses) {
    const open = await queryOne<{ id: string }>(
      `SELECT id FROM maintenance_tasks
       WHERE tenant_id = $1 AND bus_id = $2 AND status IN ('scheduled', 'in_progress') AND deleted_at IS NULL
       LIMIT 1`,
      [tenantId, bus.id]
    );
    if (open) continue;
    const id = uuid();
    const row = await queryOne<any>(
      `INSERT INTO maintenance_tasks
         (id, tenant_id, bus_id, task_type, description, priority, scheduled_date, scheduled_km, created_by)
       VALUES ($1, $2, $3, 'general_service', $4, 'medium', $5, $6, $7) RETURNING *`,
      [id, tenantId, bus.id,
       `Auto-generated: bus ${bus.plate_number} reached threshold ${bus.next_km_threshold} km`,
       new Date().toISOString().slice(0, 10), bus.next_km_threshold, userId]
    );
    created.push({ id: row!.id, busId: row!.bus_id, scheduledDate: row!.scheduled_date });
  }
  return { generated: created.length, tasks: created };
}