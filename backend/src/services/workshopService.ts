import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type {
  CreateWorkshopInput, UpdateWorkshopInput, ListWorkshopsQuery,
} from '../validators/workshops';

interface WorkshopRow {
  id: string; tenant_id: string; name: string; location: string | null;
  contact: string | null; supervisor: string | null; is_internal: boolean;
  services: string[]; created_at: string; updated_at: string;
}

function mapWorkshop(row: WorkshopRow) {
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name,
    location: row.location, contact: row.contact, supervisor: row.supervisor,
    isInternal: row.is_internal, services: row.services || [],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function requireWorkshop(tenantId: string, workshopId: string) {
  const row = await queryOne<WorkshopRow>(
    'SELECT * FROM workshops WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [workshopId, tenantId]
  );
  if (!row) throw new NotFoundError('Workshop not found');
  return row;
}

export async function createWorkshop(tenantId: string, input: CreateWorkshopInput) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM workshops WHERE tenant_id = $1 AND name = $2 AND deleted_at IS NULL',
    [tenantId, input.name]
  );
  if (existing) throw new ConflictError('Workshop name already exists');

  const id = uuid();
  const row = await queryOne<WorkshopRow>(
    `INSERT INTO workshops (id, tenant_id, name, location, contact, supervisor, is_internal, services)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, tenantId, input.name, input.location || null, input.contact || null,
     input.supervisor || null, input.is_internal, input.services]
  );
  return mapWorkshop(row!);
}

export async function listWorkshops(tenantId: string, params: ListWorkshopsQuery) {
  const conditions: string[] = ['w.tenant_id = $1', 'w.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.is_internal === 'true') { conditions.push(`w.is_internal = true`); }
  if (params.is_internal === 'false') { conditions.push(`w.is_internal = false`); }
  if (params.search) {
    conditions.push(`(w.name ILIKE $${idx} OR w.location ILIKE $${idx} OR w.supervisor ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM workshops w WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<WorkshopRow>(
    `SELECT w.* FROM workshops w WHERE ${where}
     ORDER BY w.is_internal DESC, w.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapWorkshop), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getWorkshopById(tenantId: string, workshopId: string) {
  return mapWorkshop(await requireWorkshop(tenantId, workshopId));
}

export async function updateWorkshop(tenantId: string, workshopId: string, input: UpdateWorkshopInput) {
  await requireWorkshop(tenantId, workshopId);

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM workshops WHERE tenant_id = $1 AND name = $2 AND id <> $3 AND deleted_at IS NULL',
      [tenantId, input.name, workshopId]
    );
    if (dup) throw new ConflictError('Workshop name already exists');
  }

  const fields: Record<string, any> = {
    name: input.name, location: input.location, contact: input.contact,
    supervisor: input.supervisor, is_internal: input.is_internal,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const cast = col === 'is_internal' ? 'boolean' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val); idx++;
    }
  }
  if (input.services !== undefined) {
    sets.push(`services = $${idx}::text[]`);
    values.push(input.services); idx++;
  }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(workshopId, tenantId);

  const row = await queryOne<WorkshopRow>(
    `UPDATE workshops SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return mapWorkshop(row!);
}

export async function deleteWorkshop(tenantId: string, workshopId: string) {
  const row = await queryOne<{ id: string }>(
    'UPDATE workshops SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
    [workshopId, tenantId]
  );
  if (!row) throw new NotFoundError('Workshop not found');
  return { id: workshopId };
}

export async function getWorkshopTasks(tenantId: string, workshopId: string) {
  const workshop = await requireWorkshop(tenantId, workshopId);
  const rows = await query<any>(
    `SELECT t.id, t.task_type, t.priority, t.status, t.scheduled_date,
            t.assigned_mechanic, t.description, t.cost,
            b.plate_number AS bus_plate, b.make AS bus_make, b.model AS bus_model
     FROM maintenance_tasks t
     JOIN buses b ON b.id = t.bus_id
     WHERE t.tenant_id = $1
       AND t.deleted_at IS NULL
       AND t.assigned_workshop = $2
     ORDER BY
       CASE t.status WHEN 'in_progress' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
       t.scheduled_date ASC`,
    [tenantId, workshop.name]
  );
  return {
    workshop: mapWorkshop(workshop),
    tasks: rows.map((r: any) => ({
      id: r.id, taskType: r.task_type, priority: r.priority, status: r.status,
      scheduledDate: r.scheduled_date, assignedMechanic: r.assigned_mechanic,
      description: r.description,
      cost: r.cost === null ? null : parseFloat(r.cost),
      bus: { plateNumber: r.bus_plate, make: r.bus_make, model: r.bus_model },
    })),
  };
}

export async function generateWorkOrderPdf(tenantId: string, workshopId: string): Promise<Buffer> {
  const data = await getWorkshopTasks(tenantId, workshopId);
  const { workshop, tasks } = data;

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  // Header
  doc.fontSize(18).text('WORK ORDER', { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(1.2);

  // Workshop details
  doc.fontSize(13).text('Workshop', { underline: true });
  doc.fontSize(11).text(`Name: ${workshop.name}`);
  doc.text(`Type: ${workshop.isInternal ? 'Internal' : 'External'}`);
  if (workshop.location) doc.text(`Location: ${workshop.location}`);
  if (workshop.contact) doc.text(`Contact: ${workshop.contact}`);
  if (workshop.supervisor) doc.text(`Supervisor: ${workshop.supervisor}`);
  if (workshop.services.length > 0) doc.text(`Services: ${workshop.services.join(', ')}`);
  doc.moveDown(0.8);

  const openTasks = tasks.filter((t: any) => t.status === 'scheduled' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t: any) => t.status !== 'scheduled' && t.status !== 'in_progress');

  if (openTasks.length > 0) {
    doc.fontSize(13).text(`Pending Work (${openTasks.length})`, { underline: true });
    doc.moveDown(0.4);
    for (const t of openTasks) {
      doc.fontSize(11).text(`- [${t.priority.toUpperCase()}] ${t.taskType.replace(/_/g, ' ')} — Bus ${t.bus.plateNumber} (${t.bus.make} ${t.bus.model})`);
      doc.fontSize(9).text(`  Scheduled: ${t.scheduledDate}  |  Status: ${t.status}  |  Mechanic: ${t.assignedMechanic || 'Unassigned'}`);
      if (t.description) doc.fontSize(9).text(`  Notes: ${t.description}`);
      doc.moveDown(0.3);
    }
  }

  if (doneTasks.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(13).text(`Completed / Cancelled (${doneTasks.length})`, { underline: true });
    doc.moveDown(0.4);
    for (const t of doneTasks) {
      doc.fontSize(10).text(`- ${t.taskType.replace(/_/g, ' ')} — Bus ${t.bus.plateNumber} (${t.status}${t.cost != null ? `, cost ${t.cost}` : ''})`);
    }
  }

  doc.moveDown(1.2);
  doc.fontSize(9).text('Authorized signature: ______________________          Date: ______________', { align: 'right' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}