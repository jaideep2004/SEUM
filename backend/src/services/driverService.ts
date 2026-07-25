import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type { CreateDriverInput, UpdateDriverInput, ListDriversQuery, CreateDriverDocInput } from '../validators/drivers';

const SALT_ROUNDS = 12;

interface DriverRow {
  id: string; tenant_id: string; user_id: string | null; employee_code: string | null;
  license_number: string | null; license_expiry: string | null; license_category: string | null;
  passport_number: string | null; nationality: string | null; date_of_birth: string | null;
  hire_date: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null;
  blood_type: string | null; medical_fitness_expiry: string | null; photo_url: string | null;
  status: string; created_at: string; updated_at: string; deleted_at: string | null;
}

interface DriverDocRow {
  id: string; driver_id: string; document_type: string; document_number: string | null;
  issue_date: string | null; expiry_date: string | null; file_url: string | null;
  created_at: string; updated_at: string;
}

function mapDriver(row: DriverRow) {
  return {
    id: row.id, tenantId: row.tenant_id, userId: row.user_id,
    employeeCode: row.employee_code, licenseNumber: row.license_number,
    licenseExpiry: row.license_expiry, licenseCategory: row.license_category,
    passportNumber: row.passport_number, nationality: row.nationality,
    dateOfBirth: row.date_of_birth, hireDate: row.hire_date,
    emergencyContactName: row.emergency_contact_name, emergencyContactPhone: row.emergency_contact_phone,
    bloodType: row.blood_type, medicalFitnessExpiry: row.medical_fitness_expiry,
    photoUrl: row.photo_url, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapDriverWithUser(row: any) {
  const base = mapDriver(row);
  return { ...base, name: row.user_name, email: row.user_email };
}

export async function createDriver(tenantId: string, createdBy: string, input: CreateDriverInput) {
  const existingUser = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1', [input.email]
  );
  if (existingUser) throw new ConflictError(`User with email "${input.email}" already exists`);

  if (input.employeeCode) {
    const existingCode = await queryOne<{ id: string }>(
      'SELECT id FROM drivers WHERE tenant_id = $1 AND employee_code = $2 AND deleted_at IS NULL',
      [tenantId, input.employeeCode]
    );
    if (existingCode) throw new ConflictError(`Driver with code "${input.employeeCode}" already exists`);
  }

  const userId = uuid();
  const driverId = uuid();
  const now = new Date().toISOString();

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  await query(
    `INSERT INTO users (id, tenant_id, email, password, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [userId, tenantId, input.email, hashedPassword, input.name, now]
  );

  const roleResult = await queryOne<{ id: string }>(
    "SELECT id FROM roles WHERE name = 'driver'"
  );
  if (roleResult) {
    await query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [userId, roleResult.id]
    );
  }

  const row = await queryOne<DriverRow>(
    `INSERT INTO drivers (id, tenant_id, user_id, employee_code, license_number, license_expiry,
      license_category, passport_number, nationality, date_of_birth, hire_date,
      emergency_contact_name, emergency_contact_phone, blood_type, medical_fitness_expiry, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [driverId, tenantId, userId, input.employeeCode || null, input.licenseNumber || null,
     input.licenseExpiry || null, input.licenseCategory || null, input.passportNumber || null,
     input.nationality || null, input.dateOfBirth || null, input.hireDate || null,
     input.emergencyContactName || null, input.emergencyContactPhone || null,
     input.bloodType || null, input.medicalFitnessExpiry || null, input.status]
  );

  return { ...mapDriver(row!), name: input.name, email: input.email };
}

export async function listDrivers(tenantId: string, queryParams: ListDriversQuery, isSuperAdmin: boolean) {
  const conditions: string[] = ['d.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`d.tenant_id = $${idx}`); values.push(tenantId); idx++;
  }

  if (queryParams.status) {
    conditions.push(`d.status = $${idx}`); values.push(queryParams.status); idx++;
  }
  if (queryParams.nationality) {
    conditions.push(`d.nationality ILIKE $${idx}`); values.push(`%${queryParams.nationality}%`); idx++;
  }
  if (queryParams.search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR d.employee_code ILIKE $${idx} OR d.license_number ILIKE $${idx})`);
    values.push(`%${queryParams.search}%`); idx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE ${where}`, values
  );
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  values.push(queryParams.pageSize, offset);

  const rows = await query<any>(
    `SELECT d.*, u.name AS user_name, u.email AS user_email
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE ${where}
     ORDER BY d.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`, values
  );

  return {
    data: rows.map((r: any) => ({
      ...mapDriverWithUser(r),
      docCount: r.doc_count,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function getDriverById(tenantId: string, driverId: string, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'd.id = $1 AND d.deleted_at IS NULL'
    : 'd.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [driverId] : [driverId, tenantId];

  const row = await queryOne<any>(
    `SELECT d.*, u.name AS user_name, u.email AS user_email
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE ${cond}`, params
  );
  if (!row) throw new NotFoundError('Driver not found');

  const documents = await query<DriverDocRow>(
    'SELECT * FROM driver_documents WHERE driver_id = $1 ORDER BY created_at DESC',
    [driverId]
  );

  return { ...mapDriverWithUser(row), documents: documents.map(mapDriverDoc) };
}

export async function updateDriver(tenantId: string, driverId: string, input: UpdateDriverInput, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'id = $1 AND deleted_at IS NULL'
    : 'id = $1 AND tenant_id = $2 AND deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [driverId] : [driverId, tenantId];

  const existing = await queryOne<DriverRow>(`SELECT id FROM drivers WHERE ${cond}`, params);
  if (!existing) throw new NotFoundError('Driver not found');

  if (input.name) {
    const driver = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM drivers WHERE id = $1', [driverId]
    );
    if (driver?.user_id) {
      await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
        [input.name, driver.user_id]);
    }
  }

  const setClauses: string[] = [];
  const setValues: any[] = [];
  let setIdx = 1;

  const updateMap: Record<string, string | undefined> = {
    employeeCode: input.employeeCode, licenseNumber: input.licenseNumber,
    licenseExpiry: input.licenseExpiry, licenseCategory: input.licenseCategory,
    passportNumber: input.passportNumber, nationality: input.nationality,
    dateOfBirth: input.dateOfBirth, hireDate: input.hireDate,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    bloodType: input.bloodType, medicalFitnessExpiry: input.medicalFitnessExpiry,
    status: input.status,
  };

  for (const [col, val] of Object.entries(updateMap)) {
    if (val !== undefined) {
      setClauses.push(`${col} = $${setIdx}`);
      setValues.push(val);
      setIdx++;
    }
  }

  if (setClauses.length === 0) {
    return getDriverById(tenantId, driverId, isSuperAdmin);
  }

  setValues.push(driverId, tenantId);
  await query(
    `UPDATE drivers SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${setIdx} AND tenant_id = $${setIdx + 1} AND deleted_at IS NULL`,
    setValues
  );

  return getDriverById(tenantId, driverId, isSuperAdmin);
}

export async function softDeleteDriver(tenantId: string, driverId: string, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'id = $1 AND deleted_at IS NULL'
    : 'id = $1 AND tenant_id = $2 AND deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [driverId] : [driverId, tenantId];

  const existing = await queryOne<DriverRow>(`SELECT id FROM drivers WHERE ${cond}`, params);
  if (!existing) throw new NotFoundError('Driver not found');

  await query('UPDATE drivers SET deleted_at = NOW(), status = $1, updated_at = NOW() WHERE id = $2',
    ['terminated', driverId]);

  return { id: driverId, status: 'terminated' };
}

export async function uploadDriverPhoto(tenantId: string, driverId: string, fileUrl: string, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'id = $1 AND deleted_at IS NULL'
    : 'id = $1 AND tenant_id = $2 AND deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [driverId] : [driverId, tenantId];

  const existing = await queryOne<DriverRow>(`SELECT id FROM drivers WHERE ${cond}`, params);
  if (!existing) throw new NotFoundError('Driver not found');

  await query('UPDATE drivers SET photo_url = $1, updated_at = NOW() WHERE id = $2', [fileUrl, driverId]);
  return { photoUrl: fileUrl };
}

function mapDriverDoc(row: DriverDocRow) {
  return {
    id: row.id, driverId: row.driver_id, documentType: row.document_type,
    documentNumber: row.document_number, issueDate: row.issue_date,
    expiryDate: row.expiry_date, fileUrl: row.file_url,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function createDriverDocument(tenantId: string, driverId: string, input: CreateDriverDocInput, fileUrl?: string) {
  const driver = await queryOne<DriverRow>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const id = uuid();
  const row = await queryOne<DriverDocRow>(
    `INSERT INTO driver_documents (id, driver_id, document_type, document_number, issue_date, expiry_date, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, driverId, input.documentType, input.documentNumber || null,
     input.issueDate || null, input.expiryDate || null, fileUrl || null]
  );
  return mapDriverDoc(row!);
}

export async function listDriverDocuments(tenantId: string, driverId: string) {
  const driver = await queryOne<DriverRow>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const rows = await query<DriverDocRow>(
    'SELECT * FROM driver_documents WHERE driver_id = $1 ORDER BY created_at DESC', [driverId]
  );
  return rows.map(mapDriverDoc);
}

export async function deleteDriverDocument(tenantId: string, driverId: string, docId: string) {
  const driver = await queryOne<DriverRow>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const doc = await queryOne<DriverDocRow>(
    'DELETE FROM driver_documents WHERE id = $1 AND driver_id = $2 RETURNING id', [docId, driverId]
  );
  if (!doc) throw new NotFoundError('Document not found');
  return { id: docId };
}

export async function getExpiringLicenses(tenantId: string, days: number = 30) {
  const rows = await query<any>(
    `SELECT d.*, u.name AS user_name, u.email AS user_email
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
       AND d.license_expiry IS NOT NULL
       AND d.license_expiry <= CURRENT_DATE + $2::integer
       AND d.license_expiry >= CURRENT_DATE
     ORDER BY d.license_expiry`,
    [tenantId, days]
  );
  return rows.map(mapDriverWithUser);
}

export async function getExpiringMedicalFitness(tenantId: string, days: number = 30) {
  const rows = await query<any>(
    `SELECT d.*, u.name AS user_name, u.email AS user_email
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
       AND d.medical_fitness_expiry IS NOT NULL
       AND d.medical_fitness_expiry <= CURRENT_DATE + $2::integer
       AND d.medical_fitness_expiry >= CURRENT_DATE
     ORDER BY d.medical_fitness_expiry`,
    [tenantId, days]
  );
  return rows.map(mapDriverWithUser);
}
