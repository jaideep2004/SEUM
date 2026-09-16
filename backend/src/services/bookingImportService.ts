// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');
import { query, queryOne, pool } from '../db';
import { ValidationError } from '../utils/errors';

// ------------------------------------------------------------
// Template definition
// ------------------------------------------------------------
export const TEMPLATE_HEADERS = [
  'customer_name',
  'customer_phone',
  'customer_email',
  'pickup_location',
  'destination_location',
  'requested_date',
  'requested_time',
  'number_of_passengers',
  'trip_type_requested',
  'total_amount',
  'notes',
] as const;

// Human-readable header row for the Excel file (will be normalized on import anyway)
const DISPLAY_HEADERS = [
  'Customer Name *',
  'Customer Phone *',
  'Customer Email',
  'Pickup Location *',
  'Destination *',
  'Date (YYYY-MM-DD) *',
  'Time (HH:MM) *',
  'Passengers *',
  'Trip Type',
  'Price (SAR) *',
  'Notes',
];

const EXAMPLE_ROW = [
  'Ahmed Al-Otaibi',
  '0551234567',
  'ahmed@example.com',
  'Jeddah — Al Hamra',
  'Makkah — Al Haram',
  '2026-09-15',
  '08:30',
  '25',
  'charter',
  '2500',
  'Group transfer — 25 pax',
];

// Column mapping: normalized header -> canonical field
const HEADER_ALIASES: Record<string, typeof TEMPLATE_HEADERS[number]> = {
  // customer_name
  'customer_name': 'customer_name',
  'customer': 'customer_name',
  'name': 'customer_name',
  'client_name': 'customer_name',
  'company_name': 'customer_name',
  // phone
  'customer_phone': 'customer_phone',
  'phone': 'customer_phone',
  'mobile': 'customer_phone',
  'customer_mobile': 'customer_phone',
  // email
  'customer_email': 'customer_email',
  'email': 'customer_email',
  // pickup
  'pickup_location': 'pickup_location',
  'pickup': 'pickup_location',
  'from': 'pickup_location',
  'origin': 'pickup_location',
  // destination
  'destination_location': 'destination_location',
  'destination': 'destination_location',
  'dropoff': 'destination_location',
  'to': 'destination_location',
  'dest': 'destination_location',
  // date
  'requested_date': 'requested_date',
  'date': 'requested_date',
  'trip_date': 'requested_date',
  'requested date': 'requested_date',
  // time
  'requested_time': 'requested_time',
  'time': 'requested_time',
  'departure_time': 'requested_time',
  // passengers
  'number_of_passengers': 'number_of_passengers',
  'passengers': 'number_of_passengers',
  'pax': 'number_of_passengers',
  'pax_count': 'number_of_passengers',
  'passenger_count': 'number_of_passengers',
  'no_of_pax': 'number_of_passengers',
  // trip type
  'trip_type_requested': 'trip_type_requested',
  'trip_type': 'trip_type_requested',
  'service_type': 'trip_type_requested',
  'trip type': 'trip_type_requested',
  // price
  'total_amount': 'total_amount',
  'price': 'total_amount',
  'amount': 'total_amount',
  'total': 'total_amount',
  'selling_price': 'total_amount',
  'quotation': 'total_amount',
  // notes
  'notes': 'notes',
  'special_requirements': 'notes',
  'remarks': 'notes',
  'requirements': 'notes',
};

function normalizeHeader(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[*]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_');
}

function resolveHeader(raw: string): typeof TEMPLATE_HEADERS[number] | null {
  const norm = normalizeHeader(raw);
  if ((HEADER_ALIASES as any)[norm]) return (HEADER_ALIASES as any)[norm];
  // also try without underscores/spaces stripped comparison
  const stripped = norm.replace(/_/g, '');
  for (const [key, val] of Object.entries(HEADER_ALIASES)) {
    if (key.replace(/_/g, '') === stripped) return val as any;
  }
  return null;
}

function parseHeaderIndexes(headerRow: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell == null || String(cell).trim() === '') continue;
    const resolved = resolveHeader(String(cell));
    if (resolved && !map.has(resolved)) {
      map.set(resolved, i);
    }
  }
  return map;
}

// Helpers to parse Excel dates/times
function parseExcelDateValue(value: any): string | null {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  // If numeric Excel serial date, XLSX may give string of number — try to detect
  // But with raw:false we mostly get strings. Keep simple: only support YYYY-MM-DD string
  // Also support Excel serialized number like 45200 (if raw true would be number). Here we treat string numeric as date serial.
  if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) > 30000 && Number(raw) < 60000) {
    // Convert Excel serial to ISO date
    const serial = Number(raw);
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const d = new Date(utcValue);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  // Strip time if included
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // Support DD/MM/YYYY or MM/DD/YYYY with /
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(raw)) {
    const parts = raw.split(/[\/-]/);
    let y: number, m: number, d: number;
    if (parts[2].length === 4) {
      // assume DD/MM/YYYY (common in KSA — try to detect, but prefer D/M/Y)
      // If first part >12, definitely day first
      const a = Number(parts[0]), b = Number(parts[1]);
      if (a > 12) { d = a; m = b; } else if (b > 12) { d = b; m = a; } else { // ambiguous, assume DD/MM
        d = a; m = b;
      }
      y = Number(parts[2]);
    } else {
      return null;
    }
    const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return iso;
  }
  return raw;
}

function isValidDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  // Verify components not rolled over (e.g., 2026-13-40)
  const [y, m, day] = value.split('-').map(Number);
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  const trimmed = String(value).trim();
  // Accept HH:MM or HH:MM:SS 24h
  if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(trimmed)) return true;
  // Accept H:MM
  if (/^\d{1,2}:[0-5]\d(:[0-5]\d)?$/.test(trimmed)) {
    const [h] = trimmed.split(':').map(Number);
    return h >= 0 && h <= 23;
  }
  // Accept Excel time fraction like 0.375 (9:00) if numeric string
  if (/^0?\.\d+$/.test(trimmed)) {
    const frac = Number(trimmed);
    return frac >= 0 && frac < 1;
  }
  return false;
}

function normalizeTime(value: any): string | null {
  if (value == null || String(value).trim() === '') return null;
  let raw = String(value).trim();
  // If numeric fraction
  if (/^0?\.\d+$/.test(raw)) {
    const frac = Number(raw);
    const totalMinutes = Math.round(frac * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // If includes seconds, strip seconds
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
  }
  return raw;
}

export interface ImportRowError {
  row: number; // 1-indexed Excel row number
  column: string; // canonical field name
  field: string;
  message: string;
  value: any;
}

export interface ImportValidationResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errors: ImportRowError[];
  created?: { bookingReference: string; row: number; customerName: string }[];
  createdCount?: number;
}

async function nextBookingReference(tenantId: string): Promise<string> {
  const prefix = 'BK';
  const year = new Date().getFullYear();
  const last = await queryOne<{ booking_reference: string }>(
    `SELECT booking_reference FROM bookings WHERE tenant_id = $1 AND booking_reference LIKE $2 ORDER BY booking_reference DESC LIMIT 1`,
    [tenantId, `${prefix}-${year}-%`]
  );
  let seq = 1;
  if (last) {
    const parts = last.booking_reference.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
    if (isNaN(seq)) seq = 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

// Generate template buffer
export function generateTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([DISPLAY_HEADERS, EXAMPLE_ROW]);
  // Column widths
  (ws as any)['!cols'] = [
    { wch: 18 }, // customer name
    { wch: 16 }, // phone
    { wch: 22 }, // email
    { wch: 20 }, // pickup
    { wch: 20 }, // destination
    { wch: 18 }, // date
    { wch: 14 }, // time
    { wch: 12 }, // pax
    { wch: 14 }, // trip type
    { wch: 14 }, // price
    { wch: 24 }, // notes
  ];
  // Freeze header row
  (ws as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
  // Add autofilter
  (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: DISPLAY_HEADERS.length - 1 } }) };

  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');

  // Instructions sheet
  const instr = [
    ['SEUM — Booking Import Template'],
    [''],
    ['Instructions'],
    ['1. Do not rename the column headers in row 1.'],
    ['2. Required columns are marked with * — they must not be empty.'],
    ['3. Customer Phone must match an existing customer (by phone or name). Create the customer first via Customers page if needed.'],
    ['4. Date format: YYYY-MM-DD (e.g., 2026-09-15). Time format: HH:MM 24-hour (e.g., 08:30 or 14:45).'],
    ['5. Passengers: integer 1–100. Price: number ≥0 (SAR).'],
    ['6. If there are errors, no bookings will be created — fix the highlighted rows and re-upload.'],
    ['7. On success, all rows are created as Pending Approval with channel = excel.'],
    [''],
    ['Columns'],
    ['Customer Name *', 'Full name or company name (must match existing customer)'],
    ['Customer Phone *', 'Phone used to match customer (exact match)'],
    ['Customer Email', 'Optional — for reference only'],
    ['Pickup Location *', 'Pickup address / area'],
    ['Destination *', 'Destination address / area'],
    ['Date (YYYY-MM-DD) *', 'Requested trip date'],
    ['Time (HH:MM) *', 'Requested departure time'],
    ['Passengers *', 'Number of passengers'],
    ['Trip Type', 'single | round | charter | shuttle etc.'],
    ['Price (SAR) *', 'Total price / quotation'],
    ['Notes', 'Special requirements / optional'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instr);
  (ws2 as any)['!cols'] = [{ wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
  return buf as Buffer;
}

// Validate and import
export async function importBookings(tenantId: string, buffer: Buffer, userId: string | null): Promise<ImportValidationResult> {
  if (!buffer || buffer.length === 0) {
    throw new ValidationError([{ field: 'file', message: 'Empty file uploaded' }]);
  }

  let workbook: any;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false } as any);
  } catch (e) {
    throw new ValidationError([{ field: 'file', message: 'Invalid Excel file — must be .xlsx' }]);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ValidationError([{ field: 'file', message: 'Excel file contains no sheets' }]);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new ValidationError([{ field: 'file', message: 'Excel sheet not found' }]);

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false }) as any[][];

  if (!rows || rows.length === 0) {
    return { success: false, totalRows: 0, validRows: 0, errors: [{ row: 1, column: 'file', field: 'file', message: 'File is empty', value: '' }] };
  }

  const headerRow = rows[0] as any[];
  const headerMap = parseHeaderIndexes(headerRow);

  const requiredHeaders: (typeof TEMPLATE_HEADERS[number])[] = [
    'customer_name',
    'customer_phone',
    'pickup_location',
    'destination_location',
    'requested_date',
    'requested_time',
    'number_of_passengers',
    'total_amount',
  ];

  const headerErrors: ImportRowError[] = [];
  for (const req of requiredHeaders) {
    if (!headerMap.has(req)) {
      headerErrors.push({
        row: 1,
        column: req,
        field: req,
        message: `Missing required column: ${req} (header row 1)`,
        value: headerRow.join(' | '),
      });
    }
  }
  if (headerErrors.length > 0) {
    return { success: false, totalRows: 0, validRows: 0, errors: headerErrors };
  }

  // Prepare duplicate detection
  const seenKeys = new Map<string, number>(); // key -> first row number
  const errors: ImportRowError[] = [];
  const validParsed: {
    rowNumber: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    pickup: string;
    destination: string;
    requestedDate: string;
    requestedTime: string;
    pax: number;
    tripType: string;
    totalAmount: number;
    notes: string;
    matchedCustomerId?: string;
  }[] = [];

  // Iterate data rows (Excel row number = index+1)
  for (let i = 1; i < rows.length; i++) {
    const excelRow = i + 1;
    const raw = rows[i] as any[];
    if (!raw || raw.length === 0) continue;
    // Skip rows that are entirely empty (after trimming)
    const allEmpty = raw.every((v) => String(v ?? '').trim() === '');
    if (allEmpty) continue;

    const get = (field: typeof TEMPLATE_HEADERS[number]): string => {
      const idx = headerMap.get(field);
      if (idx == null || idx >= raw.length) return '';
      const v = raw[idx];
      return String(v ?? '').trim();
    };

    const customerName = get('customer_name');
    const customerPhone = get('customer_phone');
    const customerEmail = get('customer_email');
    const pickup = get('pickup_location');
    const destination = get('destination_location');
    let requestedDateRaw = get('requested_date');
    let requestedTimeRaw = get('requested_time');
    const paxRaw = get('number_of_passengers');
    const tripTypeRaw = get('trip_type_requested');
    const totalRaw = get('total_amount');
    const notes = get('notes');

    const rowErrors: ImportRowError[] = [];
    const push = (field: string, column: string, msg: string, val: any) => {
      rowErrors.push({ row: excelRow, column, field, message: msg, value: val });
    };

    // Required field checks
    if (!customerName) push('customer_name', 'customer_name', 'Customer name is required', customerName);
    if (!customerPhone) push('customer_phone', 'customer_phone', 'Customer phone is required', customerPhone);
    if (!pickup) push('pickup_location', 'pickup_location', 'Pickup location is required', pickup);
    if (!destination) push('destination_location', 'destination_location', 'Destination is required', destination);
    if (!requestedDateRaw) push('requested_date', 'requested_date', 'Date is required (YYYY-MM-DD)', requestedDateRaw);
    if (!requestedTimeRaw) push('requested_time', 'requested_time', 'Time is required (HH:MM)', requestedTimeRaw);
    if (!paxRaw) push('number_of_passengers', 'number_of_passengers', 'Passenger count is required', paxRaw);
    if (!totalRaw) push('total_amount', 'total_amount', 'Price is required', totalRaw);

    // Pax validation
    let pax: number | null = null;
    if (paxRaw) {
      const num = Number(paxRaw);
      if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1 || num > 100) {
        push('number_of_passengers', 'number_of_passengers', 'Passengers must be an integer between 1 and 100', paxRaw);
      } else {
        pax = num;
      }
    }

    // Price validation
    let totalAmount: number | null = null;
    if (totalRaw) {
      const num = Number(String(totalRaw).replace(/,/g, ''));
      if (!Number.isFinite(num) || num < 0 || num > 99999999.99) {
        push('number_of_passengers', 'total_amount', 'Price must be a number ≥ 0 (max 99,999,999.99)', totalRaw);
      } else {
        // round to 2 decimals
        totalAmount = Math.round(num * 100) / 100;
      }
    }

    // Date format
    let requestedDate: string | null = null;
    if (requestedDateRaw) {
      const parsed = parseExcelDateValue(requestedDateRaw);
      if (!parsed || !isValidDateISO(parsed)) {
        push('requested_date', 'requested_date', 'Date must be YYYY-MM-DD (e.g., 2026-09-15)', requestedDateRaw);
      } else {
        requestedDate = parsed;
      }
    }

    // Time format
    let requestedTime: string | null = null;
    if (requestedTimeRaw) {
      const normalized = normalizeTime(requestedTimeRaw);
      if (!normalized || !isValidTime(normalized)) {
        push('requested_time', 'requested_time', 'Time must be HH:MM 24-hour (e.g., 08:30 or 14:45)', requestedTimeRaw);
      } else {
        requestedTime = normalized;
      }
    }

    // Trip type validation (optional but length check)
    let tripType = tripTypeRaw ? String(tripTypeRaw).trim().slice(0, 50) : '';
    if (tripType && tripType.length > 50) {
      push('trip_type_requested', 'trip_type_requested', 'Trip type must be ≤ 50 characters', tripTypeRaw);
    }

    // Customer match (only if name+phone not already flagged missing)
    let matchedCustomerId: string | undefined;
    if (customerName && customerPhone) {
      // Query customer existence by phone exact or name case-insensitive or company_name
      try {
        const found = await queryOne<{ id: string }>(
          `SELECT id FROM customers
           WHERE tenant_id = $1 AND deleted_at IS NULL
           AND (
             phone = $2
             OR lower(name) = lower($3)
             OR (company_name IS NOT NULL AND lower(company_name) = lower($3))
             OR (phone IS NOT NULL AND lower(phone) = lower($2))
           )
           LIMIT 1`,
          [tenantId, customerPhone, customerName]
        );
        if (!found) {
          push('customer_name', 'customer_name', `Customer not found — no match for name/phone: "${customerName}" / "${customerPhone}" (create customer first)`, `${customerName} / ${customerPhone}`);
        } else {
          matchedCustomerId = found.id;
        }
      } catch (e) {
        // DB error — treat as validation error but not fatal for fail-safe? We'll push error
        push('customer_name', 'customer_name', 'Customer lookup failed', `${customerName} / ${customerPhone}`);
      }
    }

    // Duplicate within file (only if previous fields valid enough to build key)
    if (customerPhone && requestedDate && requestedTime && pickup && destination) {
      const dupKey = `${customerPhone.toLowerCase().trim()}|${requestedDate}|${requestedTime}|${pickup.toLowerCase().trim()}|${destination.toLowerCase().trim()}`;
      if (seenKeys.has(dupKey)) {
        const firstRow = seenKeys.get(dupKey)!;
        push('customer_phone', 'customer_phone', `Duplicate record — same customer/date/time/pickup/destination as row ${firstRow}`, `${customerPhone} / ${requestedDate} ${requestedTime}`);
      } else {
        seenKeys.set(dupKey, excelRow);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validParsed.push({
        rowNumber: excelRow,
        customerName,
        customerPhone,
        customerEmail,
        pickup,
        destination,
        requestedDate: requestedDate!,
        requestedTime: requestedTime!,
        pax: pax!,
        tripType,
        totalAmount: totalAmount!,
        notes,
        matchedCustomerId: matchedCustomerId!,
      });
    }
  }

  const totalRows = validParsed.length + errors.filter((e, idx, arr) => {
    // count distinct rows with errors (rough: count unique row numbers that have errors)
    return true;
  }).length;
  // More accurate totalRows = number of data rows (excluding header, excluding fully empty)
  const dataRowCount = rows.slice(1).filter((r) => !(r.every((v: any) => String(v ?? '').trim() === ''))).length;

  if (errors.length > 0) {
    return {
      success: false,
      totalRows: dataRowCount,
      validRows: validParsed.length,
      errors,
    };
  }

  if (validParsed.length === 0) {
    return {
      success: false,
      totalRows: dataRowCount,
      validRows: 0,
      errors: [{ row: 1, column: 'file', field: 'file', message: 'No valid data rows found', value: '' }],
    };
  }

  // Fail-safe: file has errors already handled. Now batch create inside transaction.
  // We use sequential inserts to generate references correctly (reference generation reads max).
  // Wrap in transaction for atomicity.
  const created: { bookingReference: string; row: number; customerName: string }[] = [];

  // Use transaction for atomic batch insert
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const rec of validParsed) {
      const reference = await (async (): Promise<string> => {
        const prefix = 'BK';
        const year = new Date().getFullYear();
        const lastRes = await client.query(
          `SELECT booking_reference FROM bookings WHERE tenant_id = $1 AND booking_reference LIKE $2 ORDER BY booking_reference DESC LIMIT 1`,
          [tenantId, `${prefix}-${year}-%`]
        );
        let seq = 1;
        if (lastRes.rows[0]) {
          const parts = lastRes.rows[0].booking_reference.split('-');
          seq = parseInt(parts[parts.length - 1], 10) + 1;
          if (isNaN(seq)) seq = 1;
        } else if (created.length > 0) {
          // Fallback to in-memory seq if DB still returns same because inserts not committed? But within tx, lastRes will include uncommitted rows? So it should increment.
          seq = created.length + 1;
        }
        return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
      })();

      // Insert booking
      const insertRes = await client.query(
        `INSERT INTO bookings (tenant_id, customer_id, trip_id, booking_reference, number_of_passengers, seat_numbers, total_amount, paid_amount, balance, status, booking_date, payment_status, notes, channel, pickup_location, destination_location, requested_date, requested_time, trip_type_requested)
         VALUES ($1,$2,NULL,$3,$4,'{}',$5,0,$5,'pending_approval',NOW(),'unpaid',$6,'excel',$7,$8,$9,$10,$11) RETURNING id, booking_reference`,
        [
          tenantId,
          rec.matchedCustomerId,
          reference,
          rec.pax,
          rec.totalAmount,
          rec.notes || null,
          rec.pickup,
          rec.destination,
          rec.requestedDate,
          rec.requestedTime,
          rec.tripType || null,
        ]
      );
      const bookingId = insertRes.rows[0].id;
      const bookingRef = insertRes.rows[0].booking_reference;

      await client.query(
        `INSERT INTO booking_status_history (tenant_id, booking_id, from_status, to_status, changed_by, notes)
         VALUES ($1,$2,NULL,'pending_approval',$3,'Excel import')`,
        [tenantId, bookingId, userId]
      );

      created.push({ bookingReference: bookingRef, row: rec.rowNumber, customerName: rec.customerName });
    }
    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    success: true,
    totalRows: dataRowCount,
    validRows: validParsed.length,
    errors: [],
    created,
    createdCount: created.length,
  };
}
