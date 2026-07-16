import { NotFoundError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import {
  createAssignment,
  listAssignments,
  updateAssignment,
  getCalendarData,
} from "../services/fleetService";

const TENANT_ID = "tenant-1";
const BUS_ID = "bus-1";
const USER_ID = "user-1";
const ASSIGNMENT_ID = "assign-1";

function makeAssignmentRow(overrides: Record<string, any> = {}) {
  return {
    id: ASSIGNMENT_ID,
    bus_id: BUS_ID,
    tenant_id: TENANT_ID,
    route_name: "Makkah-Jeddah",
    depot_name: "Main Depot",
    driver_id: "driver-1",
    driver_name: "Ahmed Khan",
    start_date: "2025-08-01",
    end_date: "2025-08-15",
    status: "scheduled",
    notes: null,
    assigned_by: USER_ID,
    created_at: "2025-07-15T10:00:00Z",
    updated_at: "2025-07-15T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createAssignment", () => {
  it("creates an assignment successfully", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BUS_ID })
      .mockResolvedValueOnce(makeAssignmentRow());

    const result = await createAssignment(TENANT_ID, USER_ID, {
      busId: BUS_ID,
      routeName: "Makkah-Jeddah",
      startDate: "2025-08-01",
      endDate: "2025-08-15",
      driverName: "Ahmed Khan",
      status: "scheduled",
    });

    expect(result.routeName).toBe("Makkah-Jeddah");
    expect(result.driverName).toBe("Ahmed Khan");
    expect(result.status).toBe("scheduled");
  });

  it("throws NotFoundError when bus does not exist", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      createAssignment(TENANT_ID, USER_ID, { busId: BUS_ID, startDate: "2025-08-01", status: "scheduled" })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listAssignments", () => {
  it("returns paginated assignments with bus info", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "2" });
    mockQuery.mockResolvedValueOnce([
      { ...makeAssignmentRow(), plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
      { ...makeAssignmentRow({ id: "assign-2", route_name: "Jeddah-Madinah" }), plate_number: "DEF 456", make: "MAN", model: "TGX" },
    ]);

    const result = await listAssignments(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.data[0].plateNumber).toBe("ABC 123");
    expect(result.data[1].routeName).toBe("Jeddah-Madinah");
  });

  it("filters by status", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "0" });
    mockQuery.mockResolvedValueOnce([]);

    await listAssignments(TENANT_ID, { page: 1, pageSize: 20, status: "active" });

    expect(mockQueryOne.mock.calls[0][1]).toContain("active");
  });

  it("filters by busId", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: "0" });
    mockQuery.mockResolvedValueOnce([]);

    await listAssignments(TENANT_ID, { page: 1, pageSize: 20, busId: BUS_ID });

    expect(mockQueryOne.mock.calls[0][1]).toContain(BUS_ID);
  });
});

describe("updateAssignment", () => {
  it("updates assignment fields", async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeAssignmentRow())
      .mockImplementationOnce((sql: string, params: any[]) =>
        Promise.resolve(makeAssignmentRow({ status: params[0] }))
      );

    const result = await updateAssignment(TENANT_ID, ASSIGNMENT_ID, { status: "active" });

    expect(result.status).toBe("active");
  });

  it("throws NotFoundError when assignment missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      updateAssignment(TENANT_ID, ASSIGNMENT_ID, { status: "cancelled" })
    ).rejects.toThrow(NotFoundError);
  });

  it("returns existing when no fields to update", async () => {
    mockQueryOne.mockResolvedValueOnce(makeAssignmentRow());

    const result = await updateAssignment(TENANT_ID, ASSIGNMENT_ID, {});

    expect(result.status).toBe("scheduled");
  });
});

describe("getCalendarData", () => {
  it("returns assignments for the given month", async () => {
    mockQuery.mockResolvedValueOnce([
      { ...makeAssignmentRow(), plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
    ]);

    const result = await getCalendarData(TENANT_ID, 8, 2025);

    expect(result).toHaveLength(1);
    expect(result[0].plateNumber).toBe("ABC 123");
    expect(result[0].startDate).toBe("2025-08-01");
  });

  it("filters by busId when provided", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await getCalendarData(TENANT_ID, 8, 2025, BUS_ID);

    expect(result).toEqual([]);
    expect(mockQuery.mock.calls[0][1]).toContain(BUS_ID);
  });

  it("returns empty array when no assignments", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await getCalendarData(TENANT_ID);

    expect(result).toEqual([]);
  });
});
