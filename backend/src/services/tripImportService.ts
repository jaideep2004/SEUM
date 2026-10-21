// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');
import { v4 as uuid } from 'uuid';
import { queryOne, pool } from '../db';
import { ValidationError } from '../utils/errors';

// ------------------------------------------------------------
// Template definition — mirrors bookingImportService pattern
// ------------------------------------------------------------
export const TRIP_TEMPLATE_HEADERS = [
  'trip_title',
  'trip_date',
  'start_time',
  'end_time',
  'origin',
  'destination',
  'vehicle_type',
  'vehicle_count',
  'group_no',
  'pax',
  'nationality',
  'agent',
] as const;

export type TripTemplateField = typeof TRIP_TEMPLATE_HEADERS[number];

// Human-readable header row for the Excel file (normalized on import anyway)
const DISPLAY_HEADERS = [
  'Trip Title',
  'Date (YYYY-MM-DD) *',
  'Start Time (HH:MM) *',
  'End Time (HH:MM)',
  'Origin *',
  'Destination *',
  'Vehicle Type',
  'Vehicle Count',
  'Group No',
  'Pax',
  'Nationality',
  'Agent',
];

export const EXAMPLE_ROW = [
  'Hajj Group 12 - Makkah Package',
  '2026-09-15',
  '08:30',
  '12:30',
  'Jeddah — Airport',
  'Makkah — Al Haram',
  'Bus',
  '2',
  'G-12',
  '45',
  'Indonesian',
  'Al-Noor Travels',
];

export const TRIP_VEHICLE_TYPES = ['Bus', 'Coaster', 'Hiace', 'Staria', 'GMC', 'Sedan'] as const;

// Column mapping: normalized header -> canonical field
const HEADER_ALIASES: Record<string, TripTemplateField> = {
  // trip_title (optional)
  'trip_title': 'trip_title',
  'title': 'trip_title',
  'trip_name': 'trip_title',
  'tripname': 'trip_title',
  // trip_date (required)
  'trip_date': 'trip_date',
  'date': 'trip_date',
  'travel_date': 'trip_date',
  'departure_date': 'trip_date',
  'requested_date': 'trip_date',
  'date_yyyy_mm_dd': 'trip_date',
  'tripdate': 'trip_date',
  // start_time (required)
  'start_time': 'start_time',
  'start': 'start_time',
  'departure_time': 'start_time',
  'time': 'start_time',
  'from_time': 'start_time',
  'starttime': 'start_time',
  // end_time (optional)
  'end_time': 'end_time',
  'end': 'end_time',
  'arrival_time': 'end_time',
  'to_time': 'end_time',
  'endtime': 'end_time',
  // origin (required)
  'origin': 'origin',
  'from': 'origin',
  'pickup': 'origin',
  'pickup_location': 'origin',
  'departure': 'origin',
  'start_location': 'origin',
  // destination (required)
  'destination': 'destination',
  'to': 'destination',
  'dropoff': 'destination',
  'destination_location': 'destination',
  'arrival': 'destination',
  'end_location': 'destination',
  'dest': 'destination',
  // vehicle_type (optional)
  'vehicle_type': 'vehicle_type',
  'vehicle': 'vehicle_type',
  'bus_type': 'vehicle_type',
  'transport_type': 'vehicle_type',
  'vehicletype': 'vehicle_type',
  // vehicle_count (optional)
  'vehicle_count': 'vehicle_count',
  'count': 'vehicle_count',
  'no_of_vehicles': 'vehicle_count',
  'number_of_vehicles': 'vehicle_count',
  'buses': 'vehicle_count',
  'vehiclecount': 'vehicle_count',
  // group_no (optional)
  'group_no': 'group_no',
  'group': 'group_no',
  'group_number': 'group_no',
  'groupno': 'group_no',
  // pax (optional)
  'pax': 'pax',
  'passengers': 'pax',
  'number_of_passengers': 'pax',
  'no_of_pax': 'pax',
  'passenger_count': 'pax',
  // nationality (optional)
  'nationality': 'nationality',
  'nation': 'nationality',
  // agent (optional free text, matched to company customer when possible)
  'agent': 'agent',
  'agent_name': 'agent',
  'company': 'agent',
  'customer': 'agent',
  'customer_name': 'agent',
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

function resolveHeader(raw: string): TripTemplateField | null {
  const norm = normalizeHeader(raw);
  if ((HEADER_ALIASES as any)[norm]) return (HEADER_ALIASES as any)[norm];
  // Display headers carry format hints in parentheses, e.g. "Date (YYYY-MM-DD) *".
  // Strip the parenthesized suffix so the shipped template resolves to its fields.
  const noParen = norm.replace(/\(.*?\)/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (noParen !== norm && (HEADER_ALIASES as any)[noParen]) return (HEADER_ALIASES as any)[noParen];
  const stripped = norm.replace(/_/g, '');
  for (const [key, val] of Object.entries(HEADER_ALIASES)) {
    if (key.replace(/_/g, '') === stripped) return val as any;
  }
  const strippedNoParen = noParen.replace(/_/g, '');
  for (const [key, val] of Object.entries(HEADER_ALIASES)) {
    if (key.replace(/_/g, '') === strippedNoParen) return val as any;
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

// Helpers to parse Excel dates/times (same as bookingImportService)
function parseExcelDateValue(value: any): string | null {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) > 30000 && Number(raw) < 60000) {
    const serial = Number(raw);
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const d = new Date(utcValue);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(raw)) {
    const parts = raw.split(/[\/-]/);
    let y: number, m: number, d: number;
    if (parts[2].length === 4) {
      const a = Number(parts[0]), b = Number(parts[1]);
      if (a > 12) { d = a; m = b; } else if (b > 12) { d = b; m = a; } else {
        d = a; m = b;
      }
      y = Number(parts[2]);
    } else {
      return null;
    }
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return raw;
}

function isValidDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Append 'Z' so midnight is parsed as UTC — TZ-independent (bookings version
  // omits it and rejects valid dates on non-UTC hosts).
  const d = new Date(value + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = value.split('-').map(Number);
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  const trimmed = String(value).trim();
  if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(trimmed)) return true;
  if (/^\d{1,2}:[0-5]\d(:[0-5]\d)?$/.test(trimmed)) {
    const [h] = trimmed.split(':').map(Number);
    return h >= 0 && h <= 23;
  }
  if (/^0?\.\d+$/.test(trimmed)) {
    const frac = Number(trimmed);
    return frac >= 0 && frac < 1;
  }
  return false;
}

function normalizeTime(value: any): string | null {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (/^0?\.\d+$/.test(raw)) {
    const frac = Number(raw);
    const totalMinutes = Math.round(frac * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
  }
  return raw;
}

function normalizeVehicleType(value: string): string | null {
  const t = String(value || '').trim().toLowerCase();
  for (const vt of TRIP_VEHICLE_TYPES) {
    if (vt.toLowerCase() === t) return vt;
  }
  return null;
}

export interface ImportTripRowError {
  row: number; // 1-indexed Excel row number
  column: string; // canonical field name
  field: string;
  message: string;
  value: any;
}

export interface ImportTripsResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errors: ImportTripRowError[];
  created?: { row: number; tripNumber: string; tripId: string; title: string }[];
  createdCount?: number;
}

// Generate template buffer
export function generateTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([DISPLAY_HEADERS, EXAMPLE_ROW]);
  (ws as any)['!cols'] = [
    { wch: 30 }, // trip title
    { wch: 20 }, // date
    { wch: 18 }, // start time
    { wch: 16 }, // end time
    { wch: 20 }, // origin
    { wch: 20 }, // destination
    { wch: 14 }, // vehicle type
    { wch: 14 }, // vehicle count
    { wch: 12 }, // group no
    { wch: 10 }, // pax
    { wch: 16 }, // nationality
    { wch: 20 }, // agent
  ];
  (ws as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
  (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: DISPLAY_HEADERS.length - 1 } }) };

  XLSX.utils.book_append_sheet(wb, ws, 'Trips');

  const instr = [
    ['SEUM — Trip Import Template'],
    [''],
    ['Instructions'],
    ['1. Do not rename the column headers in row 1.'],
    ['2. Required columns are marked with * — they must not be empty.'],
    ['3. Date format: YYYY-MM-DD (e.g., 2026-09-15). Start/End time format: HH:MM 24-hour (e.g., 08:30).'],
    ['4. Vehicle Type (optional): one of Bus, Coaster, Hiace, Staria, GMC, Sedan.'],
    ['5. Vehicle Count (optional): integer 1–100. Pax (optional): integer ≥ 0.'],
    ['6. Agent (optional): matched to an existing company customer by name or phone when possible, otherwise kept as free text.'],
    ['7. If there are errors, no trips will be created — fix the highlighted rows and re-upload.'],
    ['8. On success, each row is created as a single trip with one leg (Origin → Destination).'],
    [''],
    ['Columns'],
    ['Trip Title', 'Optional — e.g., Hajj Group 12 - Makkah Package'],
    ['Date (YYYY-MM-DD) *', 'Trip date'],
    ['Start Time (HH:MM) *', 'Departure time, 24-hour'],
    ['End Time (HH:MM)', 'Optional arrival time, 24-hour'],
    ['Origin *', 'Pickup / departure place'],
    ['Destination *', 'Arrival place'],
    ['Vehicle Type', 'Bus | Coaster | Hiace | Staria | GMC | Sedan'],
    ['Vehicle Count', 'Number of vehicles 1–100'],
    ['Group No', 'Optional group reference'],
    ['Pax', 'Number of passengers ≥ 0'],
    ['Nationality', 'Optional passenger nationality'],
    ['Agent', 'Optional — company customer match or free text'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instr);
  (ws2 as any)['!cols'] = [{ wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
  return buf as Buffer;
}

// Validate and import
export async function importTrips(tenantId: string, buffer: Buffer, userId: string | null): Promise<ImportTripsResult> {
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

  const requiredHeaders: TripTemplateField[] = ['trip_date', 'start_time', 'origin', 'destination'];

  const headerErrors: ImportTripRowError[] = [];
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

  const seenKeys = new Map<string, number>();
  const errors: ImportTripRowError[] = [];
  const validParsed: {
    rowNumber: number;
    tripTitle: string;
    tripDate: string;
    startTime: string;
    endTime: string | null;
    origin: string;
    destination: string;
    vehicleType: string | null;
    vehicleCount: number | null;
    groupNo: string;
    pax: number | null;
    nationality: string;
    agent: string;
    agentId: string | null;
  }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const excelRow = i + 1;
    const raw = rows[i] as any[];
    if (!raw || raw.length === 0) continue;
    const allEmpty = raw.every((v: any) => String(v ?? '').trim() === '');
    if (allEmpty) continue;
    // Skip the shipped example row untouched (users often upload the template as-is)
    const isExample = EXAMPLE_ROW.every((v: any, c: number) => String(raw[c] ?? '').trim() === String(v).trim());
    if (isExample) continue;

    const get = (field: TripTemplateField): string => {
      const idx = headerMap.get(field);
      if (idx == null || idx >= raw.length) return '';
      const v = raw[idx];
      return String(v ?? '').trim();
    };

    const tripTitle = get('trip_title').slice(0, 255);
    const tripDateRaw = get('trip_date');
    const startTimeRaw = get('start_time');
    const endTimeRaw = get('end_time');
    const origin = get('origin');
    const destination = get('destination');
    const vehicleTypeRaw = get('vehicle_type');
    const vehicleCountRaw = get('vehicle_count');
    const groupNo = get('group_no').slice(0, 50);
    const paxRaw = get('pax');
    const nationality = get('nationality').slice(0, 100);
    const agentRaw = get('agent').slice(0, 255);

    const rowErrors: ImportTripRowError[] = [];
    const push = (field: string, column: string, msg: string, val: any) => {
      rowErrors.push({ row: excelRow, column, field, message: msg, value: val });
    };

    if (!tripDateRaw) push('trip_date', 'trip_date', 'Date is required (YYYY-MM-DD)', tripDateRaw);
    if (!startTimeRaw) push('start_time', 'start_time', 'Start time is required (HH:MM)', startTimeRaw);
    if (!origin) push('origin', 'origin', 'Origin is required', origin);
    if (!destination) push('destination', 'destination', 'Destination is required', destination);

    let tripDate: string | null = null;
    if (tripDateRaw) {
      const parsed = parseExcelDateValue(tripDateRaw);
      if (!parsed || !isValidDateISO(parsed)) {
        push('trip_date', 'trip_date', 'Date must be YYYY-MM-DD (e.g., 2026-09-15)', tripDateRaw);
      } else {
        tripDate = parsed;
      }
    }

    let startTime: string | null = null;
    if (startTimeRaw) {
      const normalized = normalizeTime(startTimeRaw);
      if (!normalized || !isValidTime(normalized)) {
        push('start_time', 'start_time', 'Start time must be HH:MM 24-hour (e.g., 08:30)', startTimeRaw);
      } else {
        startTime = normalized;
      }
    }

    let endTime: string | null = null;
    if (endTimeRaw) {
      const normalized = normalizeTime(endTimeRaw);
      if (!normalized || !isValidTime(normalized)) {
        push('end_time', 'end_time', 'End time must be HH:MM 24-hour (e.g., 12:30)', endTimeRaw);
      } else {
        endTime = normalized;
      }
    }

    let vehicleType: string | null = null;
    if (vehicleTypeRaw) {
      const normalized = normalizeVehicleType(vehicleTypeRaw);
      if (!normalized) {
        push('vehicle_type', 'vehicle_type', `Vehicle type must be one of: ${TRIP_VEHICLE_TYPES.join(', ')}`, vehicleTypeRaw);
      } else {
        vehicleType = normalized;
      }
    }

    let vehicleCount: number | null = null;
    if (vehicleCountRaw) {
      const num = Number(vehicleCountRaw);
      if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1 || num > 100) {
        push('vehicle_count', 'vehicle_count', 'Vehicle count must be an integer between 1 and 100', vehicleCountRaw);
      } else {
        vehicleCount = num;
      }
    }

    let pax: number | null = null;
    if (paxRaw) {
      const num = Number(paxRaw);
      if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
        push('pax', 'pax', 'Pax must be an integer ≥ 0', paxRaw);
      } else {
        pax = num;
      }
    }

    // Agent: match company customer by name/phone, otherwise keep as free text
    let agentId: string | null = null;
    let agent = agentRaw;
    if (agentRaw) {
      try {
        const found = await queryOne<{ id: string; name: string; company_name: string | null }>(
          `SELECT id, name, company_name FROM customers
           WHERE tenant_id = $1 AND deleted_at IS NULL
           AND (
             lower(name) = lower($2)
             OR (company_name IS NOT NULL AND lower(company_name) = lower($2))
             OR phone = $2
           )
           LIMIT 1`,
          [tenantId, agentRaw]
        );
        if (found) {
          agentId = found.id;
          agent = found.company_name || found.name;
        }
      } catch (e) {
        // DB lookup failure must not fail validation — keep free text
      }
    }

    // Duplicate within file (title+date+time+origin+destination)
    if (tripDate && startTime && origin && destination) {
      const dupKey = `${tripTitle.toLowerCase().trim()}|${tripDate}|${startTime}|${origin.toLowerCase().trim()}|${destination.toLowerCase().trim()}`;
      if (seenKeys.has(dupKey)) {
        const firstRow = seenKeys.get(dupKey)!;
        push('trip_title', 'trip_title', `Duplicate record — same title/date/time/origin/destination as row ${firstRow}`, `${tripTitle || '(no title)'} / ${tripDate} ${startTime}`);
      } else {
        seenKeys.set(dupKey, excelRow);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validParsed.push({
        rowNumber: excelRow,
        tripTitle,
        tripDate: tripDate!,
        startTime: startTime!,
        endTime,
        origin,
        destination,
        vehicleType,
        vehicleCount,
        groupNo,
        pax,
        nationality,
        agent,
        agentId,
      });
    }
  }

  const isExampleRow = (r: any[]) => EXAMPLE_ROW.every((v: any, c: number) => String(r[c] ?? '').trim() === String(v).trim());
  const dataRowCount = rows.slice(1).filter((r) => !(r.every((v: any) => String(v ?? '').trim() === '')) && !isExampleRow(r)).length;

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

  // Fail-safe passed: create each as a single trip (1 leg) inside one transaction.
  // Direct inserts (no readiness/invoice side effects — createTrip would spam invoices).
  const created: { row: number; tripNumber: string; tripId: string; title: string }[] = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const rec of validParsed) {
      const year = new Date().getFullYear();
      const lastRes = await client.query(
        `SELECT trip_number FROM trips WHERE tenant_id = $1 AND trip_number LIKE $2 ORDER BY trip_number DESC LIMIT 1`,
        [tenantId, `TR-${year}-%`]
      );
      let seq = 1;
      if (lastRes.rows[0]?.trip_number) {
        const parts = String(lastRes.rows[0].trip_number).split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (Number.isFinite(n)) seq = n + 1;
      }
      const tripNumber = `TR-${year}-${String(seq).padStart(4, '0')}`;
      const tripId = uuid();

      await client.query(
        `INSERT INTO trips (id, tenant_id, trip_type, trip_number, scheduled_date,
          scheduled_start_time, scheduled_end_time, created_by,
          trip_title, vehicle_type, vehicle_count, nationality, agent, agent_id, group_no, no_of_pax)
         VALUES ($1, $2, 'single', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          tripId,
          tenantId,
          tripNumber,
          rec.tripDate,
          rec.startTime,
          rec.endTime,
          userId,
          rec.tripTitle || null,
          rec.vehicleType,
          rec.vehicleCount,
          rec.nationality || null,
          rec.agent || null,
          rec.agentId,
          rec.groupNo || null,
          rec.pax,
        ]
      );

      await client.query(
        `INSERT INTO trip_legs (id, tenant_id, trip_id, leg_no, leg_code, origin, destination,
          leg_date, departure_time, arrival_time)
         VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9)`,
        [uuid(), tenantId, tripId, `${tripNumber}-S1`, rec.origin, rec.destination, rec.tripDate, rec.startTime, rec.endTime]
      );

      created.push({ row: rec.rowNumber, tripNumber, tripId, title: rec.tripTitle });
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
