import { NotFoundError, ConflictError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import {
  createRoute,
  listRoutes,
  getRouteById,
  updateRoute,
  softDeleteRoute,
  addStop,
  removeStop,
} from "../services/routeService";

const TENANT_ID = "tenant-1";
const ROUTE_ID = "route-1";
const STOP_ID = "stop-1";

function makeRouteRow(overrides: Record<string, any> = {}) {
  return {
    id: ROUTE_ID,
    tenant_id: TENANT_ID,
    name: "Makkah-Madinah Express",
    code: "MM-001",
    origin: "Makkah",
    destination: "Madinah",
    distance_km: "450.00",
    estimated_duration_minutes: 300,
    description: "Direct route via highway",
    route_type: "regular",
    status: "active",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function makeStopRow(overrides: Record<string, any> = {}) {
  return {
    id: STOP_ID,
    route_id: ROUTE_ID,
    stop_name: "Jeddah Junction",
    stop_order: 1,
    latitude: "21.4858",
    longitude: "39.1925",
    estimated_arrival_minutes: 60,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("createRoute", () => {
  it("creates a route successfully", async () => {
    mockQueryOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeRouteRow());

    const result = await createRoute(TENANT_ID, {
      name: "Makkah-Madinah Express",
      code: "MM-001",
      origin: "Makkah",
      destination: "Madinah",
      routeType: "regular",
      status: "active",
    });

    expect(result.name).toBe("Makkah-Madinah Express");
    expect(result.code).toBe("MM-001");
    expect(mockQueryOne).toHaveBeenCalledTimes(2);
  });

  it("throws ConflictError when code already exists", async () => {
    mockQueryOne.mockResolvedValueOnce(makeRouteRow());

    await expect(
      createRoute(TENANT_ID, {
        name: "Duplicate",
        code: "MM-001",
        origin: "A", destination: "B",
        routeType: "regular",
        status: "active",
      })
    ).rejects.toThrow(ConflictError);
  });
});

describe("listRoutes", () => {
  it("returns paginated routes", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([makeRouteRow()]);

    const result = await listRoutes(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it("filters by status and routeType", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listRoutes(TENANT_ID, { page: 1, pageSize: 20, status: "active", routeType: "hajj" });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it("returns empty array when no routes", async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listRoutes(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toEqual([]);
  });
});

describe("getRouteById", () => {
  it("returns route with stops", async () => {
    mockQueryOne.mockResolvedValueOnce(makeRouteRow());
    mockQuery.mockResolvedValueOnce([makeStopRow(), makeStopRow({ id: "stop-2", stop_name: "Rabigh", stop_order: 2 })]);

    const result = await getRouteById(TENANT_ID, ROUTE_ID);

    expect(result.name).toBe("Makkah-Madinah Express");
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].stopName).toBe("Jeddah Junction");
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(getRouteById(TENANT_ID, ROUTE_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("updateRoute", () => {
  it("updates route fields", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce(makeRouteRow({ name: "Updated Route" }));
    mockQuery.mockResolvedValueOnce([]);

    const result = await updateRoute(TENANT_ID, ROUTE_ID, { name: "Updated Route" });

    expect(result.name).toBe("Updated Route");
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(updateRoute(TENANT_ID, ROUTE_ID, { name: "Nope" })).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError on duplicate code", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce({ id: "other-route" });

    await expect(updateRoute(TENANT_ID, ROUTE_ID, { code: "MM-001" })).rejects.toThrow(ConflictError);
  });

  it("returns existing when no fields to update", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce(makeRouteRow());
    mockQuery.mockResolvedValueOnce([]);

    const result = await updateRoute(TENANT_ID, ROUTE_ID, {});

    expect(result.name).toBe("Makkah-Madinah Express");
  });
});

describe("softDeleteRoute", () => {
  it("soft deletes a route", async () => {
    mockQueryOne.mockResolvedValueOnce({ id: ROUTE_ID });
    mockQuery.mockResolvedValueOnce(undefined);

    const result = await softDeleteRoute(TENANT_ID, ROUTE_ID);

    expect(result.deleted).toBe(true);
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(softDeleteRoute(TENANT_ID, ROUTE_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("addStop", () => {
  it("adds a stop to a route", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce(makeStopRow());

    const result = await addStop(TENANT_ID, ROUTE_ID, {
      stopName: "Jeddah Junction",
      stopOrder: 1,
      latitude: 21.4858,
      longitude: 39.1925,
      estimatedArrivalMinutes: 60,
    });

    expect(result.stopName).toBe("Jeddah Junction");
    expect(result.stopOrder).toBe(1);
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      addStop(TENANT_ID, ROUTE_ID, { stopName: "Stop", stopOrder: 1 })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("removeStop", () => {
  it("removes a stop from a route", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce({ id: STOP_ID });
    mockQuery.mockResolvedValueOnce(undefined);

    const result = await removeStop(TENANT_ID, ROUTE_ID, STOP_ID);

    expect(result.deleted).toBe(true);
  });

  it("throws NotFoundError when route missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(removeStop(TENANT_ID, ROUTE_ID, STOP_ID)).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when stop missing", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce(null);

    await expect(removeStop(TENANT_ID, ROUTE_ID, STOP_ID)).rejects.toThrow(NotFoundError);
  });
});
