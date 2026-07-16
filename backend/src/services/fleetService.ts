import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import { createDocumentExpiryNotifications } from './notificationService';
import type { CreateBusInput, UpdateBusInput, ListBusesQuery, CreateDocumentInput, UpdateDocumentInput, UpdateReadinessInput, CreateFuelLogInput, FuelLogQuery, CreateAssignmentInput, UpdateAssignmentInput, AssignmentQuery } from '../validators/fleet';

interface BusRow {
  id: string;
  tenant_id: string;
  plate_number: string;
  chassis_number: string | null;
  make: string;
  model: string;
  year: number;
  capacity_seated: number;
  capacity_standing: number;
  color: string | null;
  vin: string | null;
  engine_number: string | null;
  fuel_type: string;
  status: string;
  purchase_date: string | null;
  purchase_price: string | null;
  assigned_depot: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapBus(row: BusRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    plateNumber: row.plate_number,
    chassisNumber: row.chassis_number,
    make: row.make,
    model: row.model,
    year: row.year,
    capacitySeated: row.capacity_seated,
    capacityStanding: row.capacity_standing,
    color: row.color,
    vin: row.vin,
    engineNumber: row.engine_number,
    fuelType: row.fuel_type,
    status: row.status,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : null,
    assignedDepot: row.assigned_depot,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBus(tenantId: string, input: CreateBusInput) {
  const existing = await queryOne<BusRow>(
    'SELECT id FROM buses WHERE tenant_id = $1 AND plate_number = $2',
    [tenantId, input.plateNumber]
  );
  if (existing) {
    throw new ConflictError(`Bus with plate number "${input.plateNumber}" already exists`);
  }

  const id = uuid();
  const row = await queryOne<BusRow>(
    `INSERT INTO buses (
      id, tenant_id, plate_number, chassis_number, make, model, year,
      capacity_seated, capacity_standing, color, vin, engine_number,
      fuel_type, status, purchase_date, purchase_price, assigned_depot
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      id, tenantId, input.plateNumber, input.chassisNumber || null,
      input.make, input.model, input.year, input.capacitySeated,
      input.capacityStanding, input.color || null, input.vin || null,
      input.engineNumber || null, input.fuelType, input.status,
      input.purchaseDate || null, input.purchasePrice || null,
      input.assignedDepot || null,
    ]
  );

  return mapBus(row!);
}

export async function listBuses(tenantId: string, queryParams: ListBusesQuery, isSuperAdmin: boolean) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (!isSuperAdmin) {
    conditions.push(`b.tenant_id = $${paramIndex++}`);
    values.push(tenantId);
  }

  if (queryParams.status) {
    conditions.push(`b.status = $${paramIndex++}`);
    values.push(queryParams.status);
  }

  if (queryParams.depot) {
    conditions.push(`b.assigned_depot ILIKE $${paramIndex++}`);
    values.push(`%${queryParams.depot}%`);
  }

  if (queryParams.search) {
    conditions.push(`(
      b.plate_number ILIKE $${paramIndex} OR
      b.make ILIKE $${paramIndex} OR
      b.model ILIKE $${paramIndex} OR
      b.vin ILIKE $${paramIndex}
    )`);
    values.push(`%${queryParams.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM buses b ${whereClause}`, values
  );
  const total = parseInt(countResult[0].count, 10);

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  const rows = await query<BusRow>(
    `SELECT b.* FROM buses b ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, queryParams.pageSize, offset]
  );

  return {
    data: rows.map(mapBus),
    meta: {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      total,
      totalPages: Math.ceil(total / queryParams.pageSize),
    },
  };
}

export async function getBusById(tenantId: string, busId: string, isSuperAdmin: boolean) {
  const conditions = isSuperAdmin
    ? 'WHERE b.id = $1'
    : 'WHERE b.id = $1 AND b.tenant_id = $2';

  const params = isSuperAdmin ? [busId] : [busId, tenantId];
  const row = await queryOne<BusRow>(
    `SELECT b.*, t.name as tenant_name
     FROM buses b
     JOIN tenants t ON t.id = b.tenant_id
     ${conditions}`, params
  );

  if (!row) {
    throw new NotFoundError('Bus not found');
  }

  return { ...mapBus(row), tenantName: (row as any).tenant_name };
}

export async function updateBus(tenantId: string, busId: string, input: UpdateBusInput, isSuperAdmin: boolean) {
  const existing = isSuperAdmin
    ? await queryOne<BusRow>('SELECT * FROM buses WHERE id = $1', [busId])
    : await queryOne<BusRow>('SELECT * FROM buses WHERE id = $1 AND tenant_id = $2', [busId, tenantId]);

  if (!existing) {
    throw new NotFoundError('Bus not found');
  }

  if (input.plateNumber && input.plateNumber !== existing.plate_number) {
    const duplicate = await queryOne<BusRow>(
      'SELECT id FROM buses WHERE tenant_id = $1 AND plate_number = $2 AND id != $3',
      [existing.tenant_id, input.plateNumber, busId]
    );
    if (duplicate) {
      throw new ConflictError(`Bus with plate number "${input.plateNumber}" already exists`);
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    plateNumber: 'plate_number',
    chassisNumber: 'chassis_number',
    make: 'make',
    model: 'model',
    year: 'year',
    capacitySeated: 'capacity_seated',
    capacityStanding: 'capacity_standing',
    color: 'color',
    vin: 'vin',
    engineNumber: 'engine_number',
    fuelType: 'fuel_type',
    status: 'status',
    purchaseDate: 'purchase_date',
    purchasePrice: 'purchase_price',
    assignedDepot: 'assigned_depot',
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${column} = $${paramIndex++}`);
      values.push((input as any)[key] ?? null);
    }
  }

  if (fields.length === 0) {
    return getBusById(tenantId, busId, isSuperAdmin);
  }

  fields.push('updated_at = NOW()');
  values.push(busId);

  const row = await queryOne<BusRow>(
    `UPDATE buses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return mapBus(row!);
}

export async function softDeleteBus(tenantId: string, busId: string, isSuperAdmin: boolean) {
  const conditions = isSuperAdmin ? 'id = $1' : 'id = $1 AND tenant_id = $2';
  const params = isSuperAdmin ? [busId] : [busId, tenantId];

  const row = await queryOne<BusRow>(
    `UPDATE buses SET is_active = false, updated_at = NOW() WHERE ${conditions} RETURNING *`,
    params
  );

  if (!row) {
    throw new NotFoundError('Bus not found');
  }

  return mapBus(row);
}

export async function getBusHistory(tenantId: string, busId: string, isSuperAdmin: boolean) {
  // First verify the bus exists
  const bus = isSuperAdmin
    ? await queryOne<BusRow>('SELECT * FROM buses WHERE id = $1', [busId])
    : await queryOne<BusRow>('SELECT * FROM buses WHERE id = $1 AND tenant_id = $2', [busId, tenantId]);

  if (!bus) throw new NotFoundError('Bus not found');

  // Fetch audit log entries for this bus
  const auditEntries = await query<any>(
    `SELECT al.*, u.name as actor_name, u.email as actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.resource = 'fleet' AND al.resource_id = $1
     ORDER BY al.created_at DESC`,
    [busId]
  );

  // Fetch document events for this bus
  const docEntries = await query<any>(
    `SELECT al.*, u.name as actor_name, u.email as actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.resource = 'bus_document'
       AND al.resource_id IN (
         SELECT id::text FROM bus_documents WHERE bus_id = $1
       )
     ORDER BY al.created_at DESC`,
    [busId]
  );

  // Combine and sort by date
  const timeline = [
    ...auditEntries.map((e: any) => ({
      type: 'bus_event' as const,
      id: e.id,
      action: e.action,
      actorName: e.actor_name,
      actorEmail: e.actor_email,
      oldValue: e.old_value,
      newValue: e.new_value,
      createdAt: e.created_at,
    })),
    ...docEntries.map((e: any) => ({
      type: 'document_event' as const,
      id: e.id,
      action: e.action,
      actorName: e.actor_name,
      actorEmail: e.actor_email,
      oldValue: e.old_value,
      newValue: e.new_value,
      createdAt: e.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Also include the creation event from the bus record itself
  const creationEvent = {
    type: 'bus_event' as const,
    id: 'creation',
    action: 'created',
    actorName: null,
    actorEmail: null,
    oldValue: null,
    newValue: { ...mapBus(bus) },
    createdAt: bus.created_at,
  };

  return [creationEvent, ...timeline.filter((t) => t.createdAt !== bus.created_at)];
}

// ─── Vehicle Documents ───

interface DocumentRow {
  id: string;
  bus_id: string;
  tenant_id: string;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapDocument(row: DocumentRow) {
  return {
    id: row.id,
    busId: row.bus_id,
    tenantId: row.tenant_id,
    documentType: row.document_type,
    documentNumber: row.document_number,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    fileUrl: row.file_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDocument(busId: string, tenantId: string, input: CreateDocumentInput) {
  const bus = await queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2', [busId, tenantId]);
  if (!bus) throw new NotFoundError('Bus not found');

  const id = uuid();
  const row = await queryOne<DocumentRow>(
    `INSERT INTO bus_documents (id, bus_id, tenant_id, document_type, document_number, issue_date, expiry_date, file_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [id, busId, tenantId, input.documentType, input.documentNumber || null, input.issueDate || null, input.expiryDate || null, input.fileUrl || null, input.status]
  );

  // Check if this document is expiring soon and create notifications
  if (input.expiryDate) {
    createDocumentExpiryNotifications(tenantId).catch(() => {});
  }

  return mapDocument(row!);
}

export async function listDocuments(busId: string, tenantId: string) {
  const rows = await query<DocumentRow>(
    `SELECT * FROM bus_documents WHERE bus_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
    [busId, tenantId]
  );
  return rows.map(mapDocument);
}

export async function getDocument(busId: string, docId: string, tenantId: string) {
  const row = await queryOne<DocumentRow>(
    'SELECT * FROM bus_documents WHERE id = $1 AND bus_id = $2 AND tenant_id = $3',
    [docId, busId, tenantId]
  );
  if (!row) throw new NotFoundError('Document not found');
  return mapDocument(row);
}

export async function updateDocument(busId: string, docId: string, tenantId: string, input: UpdateDocumentInput) {
  const existing = await queryOne<DocumentRow>(
    'SELECT * FROM bus_documents WHERE id = $1 AND bus_id = $2 AND tenant_id = $3',
    [docId, busId, tenantId]
  );
  if (!existing) throw new NotFoundError('Document not found');

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    documentType: 'document_type',
    documentNumber: 'document_number',
    issueDate: 'issue_date',
    expiryDate: 'expiry_date',
    fileUrl: 'file_url',
    status: 'status',
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${column} = $${paramIndex++}`);
      values.push((input as any)[key] ?? null);
    }
  }

  if (fields.length === 0) return mapDocument(existing);

  fields.push('updated_at = NOW()');
  values.push(docId);

  const row = await queryOne<DocumentRow>(
    `UPDATE bus_documents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  // Re-check expiring documents after update
  createDocumentExpiryNotifications(tenantId).catch(() => {});

  return mapDocument(row!);
}

export async function deleteDocument(busId: string, docId: string, tenantId: string) {
  const row = await queryOne<DocumentRow>(
    'DELETE FROM bus_documents WHERE id = $1 AND bus_id = $2 AND tenant_id = $3 RETURNING *',
    [docId, busId, tenantId]
  );
  if (!row) throw new NotFoundError('Document not found');
  return mapDocument(row);
}

export async function getExpiringDocuments(tenantId: string, days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const rows = await query<any>(
    `SELECT d.*, b.plate_number, b.make, b.model
     FROM bus_documents d
     JOIN buses b ON b.id = d.bus_id
     WHERE d.tenant_id = $1 AND d.status = 'active'
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= $2
       AND d.expiry_date >= CURRENT_DATE
     ORDER BY d.expiry_date ASC`,
    [tenantId, cutoff.toISOString().split('T')[0]]
  );

  return rows.map((r: any) => ({
    ...mapDocument(r),
    plateNumber: r.plate_number,
    busMake: r.make,
    busModel: r.model,
  }));
}

// ─── Bus Readiness ───

interface ReadinessRow {
  id: string;
  bus_id: string;
  tenant_id: string;
  status: string;
  checked_by: string | null;
  checked_at: string | null;
  notes: string | null;
  next_scheduled_maintenance_km: number | null;
  next_scheduled_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapReadiness(row: ReadinessRow) {
  return {
    id: row.id,
    busId: row.bus_id,
    tenantId: row.tenant_id,
    status: row.status,
    checkedBy: row.checked_by,
    checkedAt: row.checked_at,
    notes: row.notes,
    nextScheduledMaintenanceKm: row.next_scheduled_maintenance_km,
    nextScheduledMaintenanceDate: row.next_scheduled_maintenance_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getReadiness(tenantId: string, statusFilter?: string) {
  let sql = `
    SELECT r.*, b.plate_number, b.make, b.model, b.year, b.status AS bus_status
    FROM bus_readiness r
    RIGHT JOIN buses b ON b.id = r.bus_id AND b.tenant_id = r.tenant_id
    WHERE b.tenant_id = $1 AND b.deleted_at IS NULL
  `;
  const params: any[] = [tenantId];

  if (statusFilter) {
    params.push(statusFilter);
    sql += ` AND r.status = $${params.length}`;
  }

  sql += ` ORDER BY b.plate_number ASC`;

  const rows = await query<any>(sql, params);
  return rows.map((r: any) => ({
    ...(r.id ? mapReadiness(r) : { status: null }),
    plateNumber: r.plate_number,
    busMake: r.make,
    busModel: r.model,
    busYear: r.year,
    busStatus: r.bus_status,
  }));
}

export async function getReadinessByBusId(busId: string, tenantId: string) {
  const row = await queryOne<ReadinessRow>(
    'SELECT * FROM bus_readiness WHERE bus_id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );
  return row ? mapReadiness(row) : null;
}

export async function updateReadiness(busId: string, tenantId: string, userId: string, input: UpdateReadinessInput) {
  const bus = await queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [busId, tenantId]);
  if (!bus) throw new NotFoundError('Bus not found');

  const existing = await queryOne<ReadinessRow>(
    'SELECT id FROM bus_readiness WHERE bus_id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );

  const now = new Date().toISOString();
  const row = existing
    ? await queryOne<ReadinessRow>(
        `UPDATE bus_readiness
         SET status = $1, notes = COALESCE($2, notes), checked_by = $3, checked_at = $4,
             next_scheduled_maintenance_km = COALESCE($5, next_scheduled_maintenance_km),
             next_scheduled_maintenance_date = COALESCE($6, next_scheduled_maintenance_date),
             updated_at = $4
         WHERE id = $7 RETURNING *`,
        [input.status, input.notes || null, userId, now, input.nextScheduledMaintenanceKm || null, input.nextScheduledMaintenanceDate || null, existing.id]
      )
    : await queryOne<ReadinessRow>(
        `INSERT INTO bus_readiness (bus_id, tenant_id, status, notes, checked_by, checked_at,
          next_scheduled_maintenance_km, next_scheduled_maintenance_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [busId, tenantId, input.status, input.notes || null, userId, now, input.nextScheduledMaintenanceKm || null, input.nextScheduledMaintenanceDate || null]
      );

  return mapReadiness(row!);
}

export async function checkBusReadiness(busId: string, tenantId: string): Promise<void> {
  const row = await queryOne<ReadinessRow>(
    'SELECT status FROM bus_readiness WHERE bus_id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );
  if (row && row.status !== 'ready') {
    throw new ConflictError(`Bus is currently ${row.status.replace('_', ' ')} and cannot be assigned to a trip`);
  }
}

// ─── Fuel Tracking ───

interface FuelLogRow {
  id: string;
  bus_id: string;
  tenant_id: string;
  date: string;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading: number | null;
  station_name: string | null;
  fuel_type: string;
  receipt_url: string | null;
  filled_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapFuelLog(row: FuelLogRow) {
  return {
    id: row.id,
    busId: row.bus_id,
    tenantId: row.tenant_id,
    date: row.date,
    liters: row.liters,
    costPerLiter: row.cost_per_liter,
    totalCost: row.total_cost,
    odometerReading: row.odometer_reading,
    stationName: row.station_name,
    fuelType: row.fuel_type,
    receiptUrl: row.receipt_url,
    filledBy: row.filled_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createFuelLog(tenantId: string, input: CreateFuelLogInput) {
  const bus = await queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.busId, tenantId]);
  if (!bus) throw new NotFoundError('Bus not found');

  const id = uuid();
  const row = await queryOne<FuelLogRow>(
    `INSERT INTO fuel_logs (id, bus_id, tenant_id, date, liters, cost_per_liter, total_cost,
      odometer_reading, station_name, fuel_type, receipt_url, filled_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      id, input.busId, tenantId,
      input.date || new Date().toISOString().split('T')[0],
      input.liters, input.costPerLiter, input.totalCost,
      input.odometerReading || null, input.stationName || null,
      input.fuelType, input.receiptUrl || null, input.filledBy || null,
    ]
  );

  return mapFuelLog(row!);
}

export async function listFuelLogs(tenantId: string, queryParams: FuelLogQuery) {
  const conditions: string[] = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 1;

  if (queryParams.busId) {
    params.push(queryParams.busId);
    conditions.push(`bus_id = $${++paramIndex}`);
  }
  if (queryParams.startDate) {
    params.push(queryParams.startDate);
    conditions.push(`date >= $${++paramIndex}`);
  }
  if (queryParams.endDate) {
    params.push(queryParams.endDate);
    conditions.push(`date <= $${++paramIndex}`);
  }

  const where = conditions.join(' AND ');
  const offset = (queryParams.page - 1) * queryParams.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM fuel_logs WHERE ${where}`, params
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT f.*, b.plate_number, b.make, b.model
     FROM fuel_logs f
     JOIN buses b ON b.id = f.bus_id
     WHERE ${where}
     ORDER BY f.date DESC, f.created_at DESC
     LIMIT $${++paramIndex} OFFSET $${++paramIndex}`,
    [...params, queryParams.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapFuelLog(r),
      plateNumber: r.plate_number,
      busMake: r.make,
      busModel: r.model,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function getFuelAnalytics(tenantId: string, busId?: string) {
  const conditions: string[] = ['f.tenant_id = $1'];
  const params: any[] = [tenantId];

  if (busId) {
    params.push(busId);
    conditions.push('f.bus_id = $2');
  }

  const where = conditions.join(' AND ');

  // Summary stats
  const summary = await queryOne<any>(
    `SELECT
       COUNT(*)::int AS total_fills,
       COALESCE(SUM(f.liters), 0)::float AS total_liters,
       COALESCE(SUM(f.total_cost), 0)::float AS total_cost,
       COALESCE(AVG(f.cost_per_liter), 0)::float AS avg_cost_per_liter
     FROM fuel_logs f
     WHERE ${where}`,
    params
  );

  // Efficiency trend: km per liter per fill (requires odometer_reading)
  const trend = await query<any>(
    `SELECT f.id, f.date, f.liters, f.total_cost, f.odometer_reading, f.fuel_type,
            b.plate_number, b.make, b.model
     FROM fuel_logs f
     JOIN buses b ON b.id = f.bus_id
     WHERE ${where}
       AND f.odometer_reading IS NOT NULL
     ORDER BY f.date ASC, f.created_at ASC`,
    params
  );

  // Calculate km/liter where consecutive readings exist
  const efficiencyData: any[] = [];
  for (let i = 1; i < trend.length; i++) {
    const prev = trend[i - 1];
    const curr = trend[i];
    const kmDiff = curr.odometer_reading - prev.odometer_reading;
    if (kmDiff > 0) {
      efficiencyData.push({
        date: curr.date,
        plateNumber: curr.plate_number,
        kmPerLiter: parseFloat((kmDiff / curr.liters).toFixed(2)),
        costPerKm: parseFloat((curr.total_cost / kmDiff).toFixed(2)),
        liters: curr.liters,
      });
    }
  }

  // Average efficiency
  const avgKmPerLiter = efficiencyData.length > 0
    ? parseFloat((efficiencyData.reduce((s, d) => s + d.kmPerLiter, 0) / efficiencyData.length).toFixed(2))
    : null;

  const avgCostPerKm = efficiencyData.length > 0
    ? parseFloat((efficiencyData.reduce((s, d) => s + d.costPerKm, 0) / efficiencyData.length).toFixed(2))
    : null;

  return {
    summary: {
      totalFills: summary?.total_fills || 0,
      totalLiters: summary?.total_liters || 0,
      totalCost: summary?.total_cost || 0,
      avgCostPerLiter: summary?.avg_cost_per_liter || 0,
    },
    avgKmPerLiter,
    avgCostPerKm,
    efficiencyTrend: efficiencyData,
  };
}

export async function checkFuelEfficiencyDrop(tenantId: string): Promise<{ dropped: boolean; message: string | null }> {
  // Get the last 10 efficiency data points
  const trend = await query<any>(
    `SELECT f1.date, f1.odometer_reading AS curr_odo, f1.liters,
            f2.odometer_reading AS prev_odo, f2.date AS prev_date
     FROM fuel_logs f1
     JOIN fuel_logs f2 ON f2.bus_id = f1.bus_id AND f2.tenant_id = f1.tenant_id
       AND f2.odometer_reading IS NOT NULL AND f2.odometer_reading < f1.odometer_reading
     WHERE f1.tenant_id = $1
       AND f1.odometer_reading IS NOT NULL
       AND f2.odometer_reading IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM fuel_logs f3
         WHERE f3.bus_id = f1.bus_id AND f3.tenant_id = f1.tenant_id
           AND f3.odometer_reading IS NOT NULL
           AND f3.odometer_reading > f2.odometer_reading AND f3.odometer_reading < f1.odometer_reading
       )
     ORDER BY f1.date DESC
     LIMIT 10`,
    [tenantId]
  );

  if (trend.length < 4) return { dropped: false, message: null };

  // Calculate km/liter for each consecutive pair
  const efficiencies = trend.map((r: any) => ({
    date: r.date,
    kmPerLiter: (r.curr_odo - r.prev_odo) / r.liters,
  }));

  // Compare average of last 2 vs previous entries
  const recent = efficiencies.slice(0, 2);
  const previous = efficiencies.slice(2);
  const recentAvg = recent.reduce((s: number, d: any) => s + d.kmPerLiter, 0) / recent.length;
  const prevAvg = previous.reduce((s: number, d: any) => s + d.kmPerLiter, 0) / previous.length;

  if (prevAvg > 0 && recentAvg < prevAvg * 0.75) {
    return {
      dropped: true,
      message: `Fuel efficiency dropped ${Math.round((1 - recentAvg / prevAvg) * 100)}% in recent fills. Possible theft or maintenance issue.`,
    };
  }

  return { dropped: false, message: null };
}

// ─── Assignments ───

interface AssignmentRow {
  id: string;
  bus_id: string;
  tenant_id: string;
  route_name: string | null;
  depot_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    busId: row.bus_id,
    tenantId: row.tenant_id,
    routeName: row.route_name,
    depotName: row.depot_name,
    driverId: row.driver_id,
    driverName: row.driver_name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes,
    assignedBy: row.assigned_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAssignment(tenantId: string, userId: string, input: CreateAssignmentInput) {
  const bus = await queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.busId, tenantId]);
  if (!bus) throw new NotFoundError('Bus not found');

  const id = uuid();
  const row = await queryOne<AssignmentRow>(
    `INSERT INTO assignments (id, bus_id, tenant_id, route_name, depot_name, driver_id, driver_name,
      start_date, end_date, status, notes, assigned_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      id, input.busId, tenantId,
      input.routeName || null, input.depotName || null,
      input.driverId || null, input.driverName || null,
      input.startDate, input.endDate || null,
      input.status, input.notes || null, userId,
    ]
  );

  return mapAssignment(row!);
}

export async function listAssignments(tenantId: string, queryParams: AssignmentQuery) {
  const conditions: string[] = ['a.tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 1;

  if (queryParams.busId) {
    params.push(queryParams.busId);
    conditions.push(`a.bus_id = $${++paramIndex}`);
  }
  if (queryParams.status) {
    params.push(queryParams.status);
    conditions.push(`a.status = $${++paramIndex}`);
  }
  if (queryParams.startDate) {
    params.push(queryParams.startDate);
    conditions.push(`a.start_date >= $${++paramIndex}`);
  }
  if (queryParams.endDate) {
    params.push(queryParams.endDate);
    conditions.push(`a.end_date <= $${++paramIndex}`);
  }

  const where = conditions.join(' AND ');
  const offset = (queryParams.page - 1) * queryParams.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM assignments a WHERE ${where}`, params
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT a.*, b.plate_number, b.make, b.model
     FROM assignments a
     JOIN buses b ON b.id = a.bus_id
     WHERE ${where}
     ORDER BY a.start_date DESC, a.created_at DESC
     LIMIT $${++paramIndex} OFFSET $${++paramIndex}`,
    [...params, queryParams.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapAssignment(r),
      plateNumber: r.plate_number,
      busMake: r.make,
      busModel: r.model,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function updateAssignment(tenantId: string, assignmentId: string, input: UpdateAssignmentInput) {
  const existing = await queryOne<AssignmentRow>(
    'SELECT * FROM assignments WHERE id = $1 AND tenant_id = $2',
    [assignmentId, tenantId]
  );
  if (!existing) throw new NotFoundError('Assignment not found');

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    routeName: 'route_name',
    depotName: 'depot_name',
    driverId: 'driver_id',
    driverName: 'driver_name',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    notes: 'notes',
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${column} = $${paramIndex++}`);
      values.push((input as any)[key] ?? null);
    }
  }

  if (fields.length === 0) return mapAssignment(existing);

  fields.push('updated_at = NOW()');
  values.push(assignmentId);

  const row = await queryOne<AssignmentRow>(
    `UPDATE assignments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return mapAssignment(row!);
}

export async function getCalendarData(tenantId: string, month?: number, year?: number, busId?: string) {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const firstDay = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastDayDate = new Date(targetYear, targetMonth, 0);
  const lastDay = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

  const conditions: string[] = [
    'a.tenant_id = $1',
    'a.start_date <= $2',
    `(a.end_date IS NULL OR a.end_date >= $3)`,
  ];
  const params: any[] = [tenantId, lastDay, firstDay];

  if (busId) {
    params.push(busId);
    conditions.push('a.bus_id = $4');
  }

  const where = conditions.join(' AND ');

  const rows = await query<any>(
    `SELECT a.*, b.plate_number, b.make, b.model
     FROM assignments a
     JOIN buses b ON b.id = a.bus_id
     WHERE ${where}
     ORDER BY b.plate_number ASC, a.start_date ASC`,
    params
  );

  return rows.map((r: any) => ({
    ...mapAssignment(r),
    plateNumber: r.plate_number,
    busMake: r.make,
    busModel: r.model,
  }));
}
