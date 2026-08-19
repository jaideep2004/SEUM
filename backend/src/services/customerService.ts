import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import type {
  CreateCustomerInput, UpdateCustomerInput, ListCustomersQuery,
} from '../validators/customers';

interface CustomerRow {
  id: string; tenant_id: string; name: string; phone: string | null;
  email: string | null; id_number: string | null; nationality: string | null;
  address: string | null; is_company: boolean; company_name: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

function mapCustomer(row: CustomerRow) {
  return {
    id: row.id, tenantId: row.tenant_id, name: row.name,
    phone: row.phone, email: row.email, idNumber: row.id_number,
    nationality: row.nationality, address: row.address,
    isCompany: row.is_company, companyName: row.company_name,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function requireCustomer(tenantId: string, customerId: string) {
  const row = await queryOne<CustomerRow>(
    'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [customerId, tenantId]
  );
  if (!row) throw new NotFoundError('Customer not found');
  return row;
}

export async function createCustomer(tenantId: string, input: CreateCustomerInput) {
  if (input.phone) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2 AND deleted_at IS NULL',
      [tenantId, input.phone]
    );
    if (dup) throw new ConflictError('A customer with this phone already exists');
  }
  if (input.email) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL',
      [tenantId, input.email]
    );
    if (dup) throw new ConflictError('A customer with this email already exists');
  }
  if (input.is_company && input.company_name === undefined) {
    throw new ValidationError([{ field: 'company_name', message: 'Company name is required for company customers' }]);
  }

  const id = uuid();
  const row = await queryOne<CustomerRow>(
    `INSERT INTO customers (id, tenant_id, name, phone, email, id_number, nationality, address, is_company, company_name, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, tenantId, input.name, input.phone || null, input.email || null,
     input.id_number || null, input.nationality || null, input.address || null,
     input.is_company, input.company_name || null, input.notes || null]
  );
  return mapCustomer(row!);
}

export async function listCustomers(tenantId: string, params: ListCustomersQuery) {
  const conditions: string[] = ['c.tenant_id = $1', 'c.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.is_company === 'true') conditions.push('c.is_company = true');
  if (params.is_company === 'false') conditions.push('c.is_company = false');
  if (params.search) {
    conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx} OR c.id_number ILIKE $${idx} OR c.company_name ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM customers c WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<CustomerRow>(
    `SELECT c.* FROM customers c WHERE ${where}
     ORDER BY c.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapCustomer), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getCustomerById(tenantId: string, customerId: string) {
  return mapCustomer(await requireCustomer(tenantId, customerId));
}

export async function updateCustomer(tenantId: string, customerId: string, input: UpdateCustomerInput) {
  await requireCustomer(tenantId, customerId);

  if (input.phone !== undefined && input.phone) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2 AND id <> $3 AND deleted_at IS NULL',
      [tenantId, input.phone, customerId]
    );
    if (dup) throw new ConflictError('A customer with this phone already exists');
  }
  if (input.email !== undefined && input.email) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE tenant_id = $1 AND email = $2 AND id <> $3 AND deleted_at IS NULL',
      [tenantId, input.email, customerId]
    );
    if (dup) throw new ConflictError('A customer with this email already exists');
  }
  if (input.is_company === true && input.company_name === undefined) {
    const existing = await requireCustomer(tenantId, customerId);
    if (!existing.company_name) {
      throw new ValidationError([{ field: 'company_name', message: 'Company name is required for company customers' }]);
    }
  }
  if (input.is_company === false) {
    // company_name cleared below via `cleared`
  }

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const cleared: any = input.is_company === false ? { ...input, company_name: null } : input;
  const fields: Record<string, any> = {
    name: cleared.name, phone: cleared.phone, email: cleared.email,
    id_number: cleared.id_number, nationality: cleared.nationality, address: cleared.address,
    is_company: cleared.is_company, company_name: cleared.company_name, notes: cleared.notes,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const cast = col === 'is_company' ? 'boolean' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val === null ? null : val); idx++;
    }
  }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(customerId, tenantId);

  const row = await queryOne<CustomerRow>(
    `UPDATE customers SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return mapCustomer(row!);
}

export async function deleteCustomer(tenantId: string, customerId: string) {
  const row = await queryOne<{ id: string }>(
    'UPDATE customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
    [customerId, tenantId]
  );
  if (!row) throw new NotFoundError('Customer not found');
  return { id: customerId };
}

export async function getCustomerBookingHistory(tenantId: string, customerId: string) {
  await requireCustomer(tenantId, customerId);
  let rows: any[] = [];
  try {
    rows = await query<any>(
      `SELECT b.id, b.booking_reference, b.number_of_passengers, b.total_amount, b.paid_amount,
              b.balance, b.status, b.booking_date, b.payment_status, b.notes,
              t.scheduled_date, r.name AS route_name, r.origin, r.destination
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN routes r ON r.id = t.route_id
       WHERE b.tenant_id = $1 AND b.customer_id = $2 AND b.deleted_at IS NULL
       ORDER BY b.booking_date DESC`,
      [tenantId, customerId]
    );
  } catch (err: any) {
    if (err?.code !== '42P01') throw err;
    rows = [];
  }
  return {
    customerId,
    bookings: rows.map((r: any) => ({
      id: r.id, bookingReference: r.booking_reference, numberOfPassengers: r.number_of_passengers,
      totalAmount: r.total_amount === null ? null : parseFloat(r.total_amount),
      paidAmount: r.paid_amount === null ? null : parseFloat(r.paid_amount),
      balance: r.balance === null ? null : parseFloat(r.balance),
      status: r.status, bookingDate: r.booking_date, paymentStatus: r.payment_status,
      notes: r.notes, scheduledDate: r.scheduled_date,
      route: { name: r.route_name, origin: r.origin, destination: r.destination },
    })),
  };
}