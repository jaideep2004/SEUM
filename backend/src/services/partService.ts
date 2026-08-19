import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type {
  CreatePartInput, UpdatePartInput, ListPartsQuery,
  StockInInput, StockOutInput, ListTransactionsQuery,
} from '../validators/parts';

interface PartRow {
  id: string; tenant_id: string; part_code: string; part_name: string;
  category: string | null; manufacturer: string | null; unit_of_measure: string;
  quantity_in_stock: number; reorder_level: number;
  unit_price: string | null; supplier_id: string | null;
  storage_location: string | null;
  created_at: string; updated_at: string;
}

interface TxRow {
  id: string; spare_part_id: string; transaction_type: string; quantity: number;
  reference_type: string | null; reference_id: string | null;
  unit_price: string | null; total: string | null; notes: string | null;
  date: string; performed_by: string | null; created_at: string;
}

function mapPart(row: PartRow) {
  return {
    id: row.id, tenantId: row.tenant_id, partCode: row.part_code, partName: row.part_name,
    category: row.category, manufacturer: row.manufacturer,
    unitOfMeasure: row.unit_of_measure, quantityInStock: row.quantity_in_stock,
    reorderLevel: row.reorder_level,
    unitPrice: row.unit_price === null ? null : parseFloat(row.unit_price),
    supplierId: row.supplier_id, storageLocation: row.storage_location,
    createdAt: row.created_at, updatedAt: row.updated_at,
    lowStock: row.quantity_in_stock <= row.reorder_level,
  };
}

function mapTx(row: TxRow) {
  return {
    id: row.id, partId: row.spare_part_id, type: row.transaction_type,
    quantity: row.quantity, referenceType: row.reference_type, referenceId: row.reference_id,
    unitPrice: row.unit_price === null ? null : parseFloat(row.unit_price),
    total: parseFloat(row.total || '0'),
    notes: row.notes, date: row.date, performedBy: row.performed_by, createdAt: row.created_at,
  };
}

async function requirePart(tenantId: string, partId: string) {
  const part = await queryOne<PartRow>(
    'SELECT * FROM spare_parts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [partId, tenantId]
  );
  if (!part) throw new NotFoundError('Part not found');
  return part;
}

async function requireMaintenanceTask(tenantId: string, taskId: string) {
  const task = await queryOne<{ id: string }>(
    'SELECT id FROM maintenance_tasks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [taskId, tenantId]
  );
  if (!task) throw new NotFoundError('Maintenance task not found');
}

async function logTransaction(
  tenantId: string, partId: string, type: 'in' | 'out', quantity: number,
  unitPrice: number | null, total: number, userId: string,
  referenceType?: string, referenceId?: string | null, date?: string, notes?: string
) {
  const id = uuid();
  const row = await queryOne<TxRow>(
    `INSERT INTO inventory_transactions
       (id, spare_part_id, transaction_type, quantity, reference_type, reference_id,
        unit_price, total, notes, date, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, partId, type, quantity, referenceType || null, referenceId || null,
     unitPrice ?? null, total, notes || null,
     date ? new Date(date).toISOString() : new Date().toISOString(), userId]
  );
  return mapTx(row!);
}

export async function createPart(tenantId: string, userId: string, input: CreatePartInput) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM spare_parts WHERE tenant_id = $1 AND part_code = $2 AND deleted_at IS NULL',
    [tenantId, input.part_code]
  );
  if (existing) throw new ConflictError('Part code already exists');

  const id = uuid();
  const row = await queryOne<PartRow>(
    `INSERT INTO spare_parts
       (id, tenant_id, part_code, part_name, category, manufacturer, unit_of_measure,
        quantity_in_stock, reorder_level, unit_price, supplier_id, storage_location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [id, tenantId, input.part_code, input.part_name, input.category || null,
     input.manufacturer || null, input.unit_of_measure, input.quantity_in_stock,
     input.reorder_level, input.unit_price ?? null, input.supplier_id || null,
     input.storage_location || null]
  );
  if (row && input.quantity_in_stock > 0) {
    const price = input.unit_price ?? 0;
    await logTransaction(
      tenantId, id, 'in', input.quantity_in_stock, price,
      input.quantity_in_stock * price, userId, 'initial', undefined, undefined,
      'Initial stock on part creation'
    );
  }
  return mapPart(row!);
}

export async function listParts(tenantId: string, params: ListPartsQuery) {
  const conditions: string[] = ['p.tenant_id = $1', 'p.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.category) { conditions.push(`p.category = $${idx}`); values.push(params.category); idx++; }
  if (params.manufacturer) { conditions.push(`p.manufacturer = $${idx}`); values.push(params.manufacturer); idx++; }
  if (params.lowStock === 'true') { conditions.push(`p.quantity_in_stock <= p.reorder_level`); }
  if (params.search) {
    conditions.push(`(p.part_code ILIKE $${idx} OR p.part_name ILIKE $${idx} OR p.manufacturer ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM spare_parts p WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<PartRow>(
    `SELECT p.* FROM spare_parts p WHERE ${where}
     ORDER BY
       CASE WHEN p.quantity_in_stock <= p.reorder_level THEN 0 ELSE 1 END,
       p.part_name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapPart), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getPartById(tenantId: string, partId: string) {
  const part = await requirePart(tenantId, partId);
  const recent = await query<TxRow>(
    `SELECT * FROM inventory_transactions
     WHERE spare_part_id = $1
     ORDER BY date DESC LIMIT 10`,
    [partId]
  );
  return { ...mapPart(part), recentTransactions: recent.map(mapTx) };
}

export async function updatePart(tenantId: string, partId: string, input: UpdatePartInput) {
  await requirePart(tenantId, partId);

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    part_code: input.part_code, part_name: input.part_name, category: input.category,
    manufacturer: input.manufacturer, unit_of_measure: input.unit_of_measure,
    reorder_level: input.reorder_level, unit_price: input.unit_price,
    supplier_id: input.supplier_id, storage_location: input.storage_location,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const cast = ['reorder_level'].includes(col) ? 'integer' : col === 'unit_price' ? 'numeric' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val); idx++;
    }
  }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');
  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  values.push(partId, tenantId);

  const row = await queryOne<PartRow>(
    `UPDATE spare_parts SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  if (!row) throw new NotFoundError('Part not found');
  if (input.part_code && input.part_code !== row.part_code) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM spare_parts WHERE tenant_id = $1 AND part_code = $2 AND id <> $3 AND deleted_at IS NULL',
      [tenantId, input.part_code, partId]
    );
    if (dup) throw new ConflictError('Part code already exists');
  }
  return mapPart(row);
}

export async function stockIn(tenantId: string, partId: string, userId: string, input: StockInInput) {
  const part = await requirePart(tenantId, partId);
  const price = input.unit_price ?? (part.unit_price ? parseFloat(part.unit_price) : null);
  const total = price !== null ? input.quantity * price : null;

  const updated = await queryOne<PartRow>(
    `UPDATE spare_parts
     SET quantity_in_stock = quantity_in_stock + $1, unit_price = COALESCE($2, unit_price), updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [input.quantity, price ?? null, partId, tenantId]
  );
  const tx = await logTransaction(
    tenantId, partId, 'in', input.quantity, price,
    total ?? 0, userId, input.reference_type, input.reference_id, input.date, input.notes
  );
  return { ...mapPart(updated!), transaction: tx };
}

export async function stockOut(tenantId: string, partId: string, userId: string, input: StockOutInput) {
  const part = await requirePart(tenantId, partId);
  if (part.quantity_in_stock < input.quantity) {
    throw new ConflictError(`Insufficient stock: only ${part.quantity_in_stock} available`);
  }

  let referenceType = 'other';
  let referenceId = input.reference_id || null;
  if (input.maintenance_task_id) {
    await requireMaintenanceTask(tenantId, input.maintenance_task_id);
    referenceType = 'maintenance_task';
    referenceId = input.maintenance_task_id;
  }

  const price = part.unit_price ? parseFloat(part.unit_price) : null;
  const total = price !== null ? input.quantity * price : null;

  const updated = await queryOne<PartRow>(
    `UPDATE spare_parts
     SET quantity_in_stock = quantity_in_stock - $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND quantity_in_stock >= $1 RETURNING *`,
    [input.quantity, partId, tenantId]
  );
  if (!updated) throw new ConflictError(`Insufficient stock: only ${part.quantity_in_stock} available`);

  const tx = await logTransaction(
    tenantId, partId, 'out', input.quantity, price,
    total ?? 0, userId, referenceType, referenceId, input.date, input.notes
  );
  return { ...mapPart(updated), transaction: tx };
}

export async function listTransactions(tenantId: string, params: ListTransactionsQuery) {
  const conditions: string[] = ['it.spare_part_id IN (SELECT id FROM spare_parts WHERE tenant_id = $1 AND deleted_at IS NULL)'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.part_id) { conditions.push(`it.spare_part_id = $${idx}`); values.push(params.part_id); idx++; }
  if (params.transaction_type) { conditions.push(`it.transaction_type = $${idx}`); values.push(params.transaction_type); idx++; }
  if (params.reference_type) { conditions.push(`it.reference_type = $${idx}`); values.push(params.reference_type); idx++; }
  if (params.start_date) { conditions.push(`it.date >= $${idx}`); values.push(new Date(params.start_date).toISOString()); idx++; }
  if (params.end_date) { conditions.push(`it.date <= $${idx}`); values.push(new Date(params.end_date).toISOString()); idx++; }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM inventory_transactions it WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT it.*, p.part_code, p.part_name
     FROM inventory_transactions it
     JOIN spare_parts p ON p.id = it.spare_part_id
     WHERE ${where}
     ORDER BY it.date DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return {
    data: rows.map((r: any) => ({ ...mapTx(r), partCode: r.part_code, partName: r.part_name })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getUsageByBus(tenantId: string, busId: string) {
  const bus = await queryOne<{ id: string }>(
    'SELECT id FROM buses WHERE id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );
  if (!bus) throw new NotFoundError('Bus not found');

  const rows = await query<any>(
    `SELECT it.id, it.reference_id, it.quantity, it.unit_price, it.total, it.date,
            p.part_code, p.part_name, p.unit_of_measure, p.unit_price AS part_unit_price,
            mt.task_type, mt.status AS task_status, mt.scheduled_date,
            mt.assigned_workshop, mt.assigned_mechanic
     FROM inventory_transactions it
     JOIN spare_parts p ON p.id = it.spare_part_id
     JOIN maintenance_tasks mt ON mt.id = it.reference_id AND it.reference_type = 'maintenance_task'
     WHERE it.spare_part_id IN (SELECT id FROM spare_parts WHERE tenant_id = $1 AND deleted_at IS NULL)
       AND mt.bus_id = $2
       AND it.transaction_type = 'out'
     ORDER BY it.date DESC`,
    [tenantId, busId]
  );
  return {
    busId,
    totalParts: rows.reduce((acc: number, r: any) => acc + Number(r.quantity), 0),
    totalCost: rows.reduce((acc: number, r: any) => acc + (r.total ? parseFloat(r.total) : 0), 0),
    items: rows.map((r: any) => ({
      id: r.id, partCode: r.part_code, partName: r.part_name, unitOfMeasure: r.unit_of_measure,
      quantity: Number(r.quantity),
      unitPrice: r.unit_price === null ? null : parseFloat(r.unit_price),
      total: r.total === null ? null : parseFloat(r.total),
      date: r.date,
      task: {
        id: r.reference_id, taskType: r.task_type, status: r.task_status,
        scheduledDate: r.scheduled_date, assignedWorkshop: r.assigned_workshop,
        assignedMechanic: r.assigned_mechanic,
      },
    })),
  };
}