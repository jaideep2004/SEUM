const mockQueryOne = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();

jest.mock("../db", () => ({
  queryOne: (...args: any[]) => mockQueryOne(...args),
  pool: { connect: (...args: any[]) => mockConnect(...args) },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require("xlsx");
import { ValidationError } from "../utils/errors";
import { generateTemplateBuffer, importTrips } from "../services/tripImportService";

const TID = "tenant-1";
const UID = "user-1";
const YEAR = new Date().getFullYear();

function buildWorkbook(rows: any[][]) {
  const tpl = generateTemplateBuffer();
  const wb = XLSX.read(tpl, { type: "buffer" });
  const ws = wb.Sheets["Trips"];
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: -1 });
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const GOOD_ROWS = [
  ["Excel One", "2026-10-01", "10:00", "", "Jeddah", "Makkah", "Coaster", 1, "EX-1", 12, "Pakistan", "Al-Rihla"],
  ["Excel Two", "2026-10-02", "14:00", "16:00", "Makkah", "Madinah", "Bus", 2, "EX-2", 40, "Egypt", ""],
];

beforeEach(() => {
  jest.resetAllMocks();
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
  mockClientQuery.mockResolvedValue({});
  mockQueryOne.mockResolvedValue(null);
});

describe("generateTemplateBuffer", () => {
  it("produces a Trips sheet with all required headers plus instructions", () => {
    const buf = generateTemplateBuffer();
    expect(buf.length).toBeGreaterThan(2000);
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toContain("Trips");
    expect(wb.SheetNames).toContain("Instructions");
    const headers: string[] = XLSX.utils.sheet_to_json(wb.Sheets["Trips"], { header: 1 })[0] as string[];
    for (const h of ["Trip Title", "Origin", "Destination", "Vehicle Type", "Vehicle Count", "Nationality", "Agent"]) {
      expect(headers.join("|")).toContain(h);
    }
  });
});

describe("importTrips validation (fail-safe)", () => {
  it("rejects an empty file", async () => {
    await expect(importTrips(TID, Buffer.alloc(0), UID)).rejects.toThrow(ValidationError);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("returns per-row errors and writes nothing when rows are invalid", async () => {
    const buf = buildWorkbook([
      ["Bad Row", "not-a-date", "10:00", "", "Jeddah", "Makkah", "Spaceship", 0, "", -3, "", ""],
      ["Missing Origin", "2026-10-01", "10:00", "", "", "Makkah", "", "", "", "", "", ""],
    ]);
    const res = await importTrips(TID, buf, UID);
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
    expect(res.errors.some((e) => e.field === "trip_date")).toBe(true);
    expect(res.errors.some((e) => e.field === "vehicle_type")).toBe(true);
    expect(res.errors.some((e) => e.field === "origin")).toBe(true);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("skips the shipped example row instead of importing it", async () => {
    const tpl = generateTemplateBuffer();
    const res = await importTrips(TID, tpl, UID);
    expect(res.success).toBe(false);
    expect(res.totalRows).toBe(0);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("rejects duplicate rows within the file", async () => {
    const buf = buildWorkbook([
      ["Dup", "2026-10-01", "10:00", "", "Jeddah", "Makkah", "", "", "", "", "", ""],
      ["Dup", "2026-10-01", "10:00", "", "Jeddah", "Makkah", "", "", "", "", "", ""],
    ]);
    const res = await importTrips(TID, buf, UID);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe("importTrips success path", () => {
  it("creates trips with sequential numbers, leg codes, and agent linkage", async () => {
    mockQueryOne.mockImplementation((sql: string) =>
      String(sql).includes("FROM customers")
        ? Promise.resolve({ id: "AG-1", name: "Al-Rihla", company_name: "Al-Rihla Travels" })
        : Promise.resolve(null)
    );
    const tripInserts: any[][] = [];
    const legInserts: any[][] = [];
    let numberCalls = 0;
    mockClientQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("SELECT trip_number")) {
        numberCalls += 1;
        return Promise.resolve(numberCalls === 1 ? { rows: [] } : { rows: [{ trip_number: `TR-${YEAR}-0001` }] });
      }
      if (s.includes("INSERT INTO trips")) {
        const params = (mockClientQuery.mock.calls[mockClientQuery.mock.calls.length - 1] as any[])[1];
        tripInserts.push(params);
        return Promise.resolve({});
      }
      if (s.includes("INSERT INTO trip_legs")) {
        const params = (mockClientQuery.mock.calls[mockClientQuery.mock.calls.length - 1] as any[])[1];
        legInserts.push(params);
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    const buf = buildWorkbook(GOOD_ROWS);
    const res = await importTrips(TID, buf, UID);

    expect(res.success).toBe(true);
    expect(res.created).toHaveLength(2);
    expect(res.created![0].tripNumber).toBe(`TR-${YEAR}-0001`);
    expect(res.created![1].tripNumber).toBe(`TR-${YEAR}-0002`);
    expect(legInserts).toHaveLength(2);
    expect(legInserts[0][3]).toBe(`TR-${YEAR}-0001-S1`);
    expect(legInserts[1][3]).toBe(`TR-${YEAR}-0002-S1`);
    // agent matched by name -> linked id; row 2 has no agent
    expect(tripInserts[0][12]).toBe("AG-1");
    // vehicle count + pax flow through
    expect(tripInserts[1][9]).toBe(2);
    expect(mockRelease).toHaveBeenCalled();
  });
});
