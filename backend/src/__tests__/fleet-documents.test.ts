import { ConflictError, NotFoundError } from "../utils/errors";

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock("../db", () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

jest.mock("../services/notificationService", () => ({
  createDocumentExpiryNotifications: jest.fn().mockResolvedValue(undefined),
}));

import {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getExpiringDocuments,
} from "../services/fleetService";

const TENANT_ID = "tenant-1";
const BUS_ID = "bus-1";
const DOC_ID = "doc-1";

function makeDocRow(overrides: Record<string, any> = {}) {
  return {
    id: DOC_ID,
    bus_id: BUS_ID,
    tenant_id: TENANT_ID,
    document_type: "registration",
    document_number: "REG-001",
    issue_date: "2025-01-01",
    expiry_date: "2026-01-01",
    file_url: null,
    status: "active",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createDocument", () => {
  it("creates a document successfully", async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BUS_ID })
      .mockResolvedValueOnce(makeDocRow());

    const result = await createDocument(BUS_ID, TENANT_ID, {
      documentType: "registration",
      documentNumber: "REG-001",
      expiryDate: "2026-01-01",
      status: "active",
    });

    expect(result.documentType).toBe("registration");
    expect(result.documentNumber).toBe("REG-001");
    expect(mockQueryOne).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundError when bus does not exist", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      createDocument(BUS_ID, TENANT_ID, {
        documentType: "insurance",
        status: "active",
      })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listDocuments", () => {
  it("lists documents for a bus", async () => {
    mockQuery.mockResolvedValueOnce([makeDocRow(), makeDocRow({ id: "doc-2" })]);

    const results = await listDocuments(BUS_ID, TENANT_ID);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(DOC_ID);
    expect(results[1].id).toBe("doc-2");
  });

  it("returns empty array when no documents exist", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const results = await listDocuments(BUS_ID, TENANT_ID);

    expect(results).toEqual([]);
  });
});

describe("getDocument", () => {
  it("gets a single document", async () => {
    mockQueryOne.mockResolvedValueOnce(makeDocRow());

    const result = await getDocument(BUS_ID, DOC_ID, TENANT_ID);

    expect(result.id).toBe(DOC_ID);
    expect(result.documentType).toBe("registration");
  });

  it("throws NotFoundError when document missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(getDocument(BUS_ID, DOC_ID, TENANT_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("updateDocument", () => {
  it("updates document fields", async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeDocRow())
      .mockResolvedValueOnce(makeDocRow({ document_type: "insurance" }));

    const result = await updateDocument(BUS_ID, DOC_ID, TENANT_ID, {
      documentType: "insurance",
    });

    expect(result.documentType).toBe("insurance");
  });

  it("throws NotFoundError when document missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(
      updateDocument(BUS_ID, DOC_ID, TENANT_ID, { documentType: "insurance" })
    ).rejects.toThrow(NotFoundError);
  });

  it("returns existing doc when no fields to update", async () => {
    mockQueryOne.mockResolvedValueOnce(makeDocRow());

    const result = await updateDocument(BUS_ID, DOC_ID, TENANT_ID, {});

    expect(result.documentType).toBe("registration");
  });
});

describe("deleteDocument", () => {
  it("deletes a document", async () => {
    mockQueryOne.mockResolvedValueOnce(makeDocRow());

    const result = await deleteDocument(BUS_ID, DOC_ID, TENANT_ID);

    expect(result.id).toBe(DOC_ID);
  });

  it("throws NotFoundError when document missing", async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(deleteDocument(BUS_ID, DOC_ID, TENANT_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("getExpiringDocuments", () => {
  it("returns documents expiring within given days", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const dateStr = futureDate.toISOString().split("T")[0];

    mockQuery.mockResolvedValueOnce([
      { ...makeDocRow({ expiry_date: dateStr }), plate_number: "ABC 123", make: "Toyota", model: "Coaster" },
    ]);

    const results = await getExpiringDocuments(TENANT_ID, 30);

    expect(results).toHaveLength(1);
    expect(results[0].plateNumber).toBe("ABC 123");
  });

  it("returns empty array when no documents expiring", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const results = await getExpiringDocuments(TENANT_ID, 30);

    expect(results).toEqual([]);
  });
});
