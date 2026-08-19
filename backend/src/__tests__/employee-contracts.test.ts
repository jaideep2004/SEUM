import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', EID = 'e1', CID = 'c1', DID = 'd1', UID = 'u1';

const CONTRACT_ROW = {
  id: CID, tenant_id: TID, employee_id: EID, contract_type: 'full_time',
  start_date: '2026-01-01', end_date: '2027-01-01', salary: '5000.00',
  benefits: 'Health insurance', file_url: '/uploads/c.pdf', status: 'active',
  created_at: '2026-01-15', updated_at: '2026-01-15',
};

const DOC_ROW = {
  id: DID, tenant_id: TID, employee_id: EID, document_type: 'passport',
  number: 'P12345', issue_date: '2026-01-01', expiry_date: '2031-01-01',
  file_url: '/uploads/p.pdf', notes: null, created_at: '2026-01-15', updated_at: '2026-01-15',
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createContract', () => {
  it('creates a contract with file url', async () => {
    mockQ1.mockResolvedValueOnce({ id: EID }).mockResolvedValueOnce({ ...CONTRACT_ROW });
    const { createContract } = require('../services/employeeContractService');
    const c = await createContract(TID, UID, { employee_id: EID, contract_type: 'full_time', salary: 5000 }, '/uploads/c.pdf');
    expect(c.id).toBe(CID);
    expect(c.salary).toBe(5000);
    expect(c.fileUrl).toBe('/uploads/c.pdf');
    expect(c.status).toBe('active');
  });

  it('throws when employee not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { createContract } = require('../services/employeeContractService');
    await expect(createContract(TID, UID, { employee_id: EID })).rejects.toThrow('Employee not found');
  });
});

describe('listContracts', () => {
  it('returns paginated contracts with employee info', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...CONTRACT_ROW, employee_code: 'E001', employee_name: 'John', employee_email: 'j@t.com', employee_department: 'operations' }]);
    const { listContracts } = require('../services/employeeContractService');
    const r = await listContracts(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].employee.employeeCode).toBe('E001');
    expect(r.meta.total).toBe(1);
  });

  it('filters by expiring_within and status', async () => {
    mockQ1.mockResolvedValue({ count: 0 });
    mockQ.mockResolvedValue([]);
    const { listContracts } = require('../services/employeeContractService');
    await listContracts(TID, { page: 1, pageSize: 20, status: 'active', expiring_within: 30, search: 'jo' });
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('c.status');
    expect(sql).toContain('c.end_date <= CURRENT_DATE');
    expect(sql).toContain('ILIKE');
  });
});

describe('updateContract', () => {
  it('updates fields', async () => {
    mockQ1.mockResolvedValueOnce({ id: CID }).mockResolvedValueOnce({ ...CONTRACT_ROW, contract_type: 'fixed_term', salary: '6000.00' });
    const { updateContract } = require('../services/employeeContractService');
    const c = await updateContract(TID, CID, { salary: 6000 });
    expect(c.salary).toBe(6000);
    expect(mockQ1.mock.calls[1][0]).toContain('salary = $1::numeric');
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { updateContract } = require('../services/employeeContractService');
    await expect(updateContract(TID, CID, { benefits: 'x' })).rejects.toThrow('Contract not found');
  });
});

describe('deleteContract', () => {
  it('soft deletes', async () => {
    mockQ1.mockResolvedValueOnce({ id: CID });
    const { deleteContract } = require('../services/employeeContractService');
    const r = await deleteContract(TID, CID);
    expect(r.id).toBe(CID);
    expect(mockQ1.mock.calls[0][0]).toContain('deleted_at = NOW()');
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { deleteContract } = require('../services/employeeContractService');
    await expect(deleteContract(TID, CID)).rejects.toThrow('Contract not found');
  });
});

describe('createDocument', () => {
  it('creates a document with file url', async () => {
    mockQ1.mockResolvedValueOnce({ id: EID }).mockResolvedValueOnce({ ...DOC_ROW });
    const { createDocument } = require('../services/employeeContractService');
    const d = await createDocument(TID, UID, { employee_id: EID, document_type: 'passport', number: 'P12345' }, '/uploads/p.pdf');
    expect(d.id).toBe(DID);
    expect(d.documentType).toBe('passport');
    expect(d.fileUrl).toBe('/uploads/p.pdf');
  });

  it('throws when employee not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { createDocument } = require('../services/employeeContractService');
    await expect(createDocument(TID, UID, { employee_id: EID })).rejects.toThrow('Employee not found');
  });
});

describe('listDocuments', () => {
  it('returns paginated documents with employee join', async () => {
    mockQ1.mockResolvedValue({ count: 2 });
    mockQ.mockResolvedValue([{ ...DOC_ROW, employee_code: 'E001', employee_name: 'John', employee_department: 'finance' }]);
    const { listDocuments } = require('../services/employeeContractService');
    const r = await listDocuments(TID, { page: 1, pageSize: 20, document_type: 'passport', expiring_within: 365 });
    expect(r.data[0].employee.name).toBe('John');
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('document_type');
    expect(sql).toContain('expiry_date <= CURRENT_DATE');
  });
});

describe('updateDocument', () => {
  it('updates fields', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID }).mockResolvedValueOnce({ ...DOC_ROW, number: 'P99999' });
    const { updateDocument } = require('../services/employeeContractService');
    const d = await updateDocument(TID, DID, { number: 'P99999' });
    expect(d.number).toBe('P99999');
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { updateDocument } = require('../services/employeeContractService');
    await expect(updateDocument(TID, DID, { number: 'x' })).rejects.toThrow('Document not found');
  });
});

describe('deleteDocument', () => {
  it('soft deletes', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID });
    const { deleteDocument } = require('../services/employeeContractService');
    await expect(deleteDocument(TID, DID)).resolves.toEqual({ id: DID });
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { deleteDocument } = require('../services/employeeContractService');
    await expect(deleteDocument(TID, DID)).rejects.toThrow('Document not found');
  });
});

describe('getExpiryAlerts', () => {
  it('returns contracts and documents within N days with flags', async () => {
    mockQ.mockResolvedValueOnce([{ ...CONTRACT_ROW, employee_code: 'E001', employee_name: 'John', end_date: '2026-08-01' }])
      .mockResolvedValueOnce([{ ...DOC_ROW, employee_code: 'E001', employee_name: 'John', expiry_date: '2026-12-01' }]);
    const { getExpiryAlerts } = require('../services/employeeContractService');
    const r = await getExpiryAlerts(TID, 30);
    expect(r.contractCount).toBe(1);
    expect(r.documentCount).toBe(1);
    expect(r.contracts[0].daysLeft).not.toBeNull();
    expect(typeof r.contracts[0].expired).toBe('boolean');
  });
});