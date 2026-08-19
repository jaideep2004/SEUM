import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', CID = 'c1';

const CUSTOMER = {
  id: CID, tenant_id: TID, name: 'Ahmed Al-Otaibi', phone: '0551234567',
  email: 'ahmed@example.com', id_number: '1045678901', nationality: 'Saudi',
  address: 'Jeddah, Al-Balad', is_company: false, company_name: null,
  notes: 'VIP customer', created_at: '2026-08-12', updated_at: '2026-08-12',
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createCustomer', () => {
  it('creates an individual customer', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...CUSTOMER });
    const { createCustomer } = require('../services/customerService');
    const c = await createCustomer(TID, { name: 'Ahmed Al-Otaibi', phone: '0551234567', is_company: false });
    expect(c.name).toBe('Ahmed Al-Otaibi');
    expect(c.isCompany).toBe(false);
    expect(c.tenantId).toBe(TID);
  });

  it('rejects duplicate phone', async () => {
    mockQ1.mockResolvedValueOnce({ id: 'other' });
    const { createCustomer } = require('../services/customerService');
    await expect(createCustomer(TID, { name: 'X', phone: '0551234567' })).rejects.toThrow('phone already exists');
  });

  it('rejects company customer without company name', async () => {
    mockQ1.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { createCustomer } = require('../services/customerService');
    await expect(createCustomer(TID, { name: 'ACME', phone: '0550000000', is_company: true }))
      .rejects.toThrow('Validation failed');
  });
});

describe('listCustomers', () => {
  it('filters company flag and searches name/phone/id', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...CUSTOMER }]);
    const { listCustomers } = require('../services/customerService');
    const r = await listCustomers(TID, { page: 1, pageSize: 50, is_company: 'false', search: 'Ahmed' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].isCompany).toBe(false);
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('c.is_company = false');
    expect(sql).toContain('c.name ILIKE');
    expect(sql).toContain('c.phone ILIKE');
  });
});

describe('updateCustomer / delete', () => {
  it('updates fields and clears company_name when switching to individual', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...CUSTOMER })
      .mockResolvedValueOnce({ ...CUSTOMER, name: 'Ahmed Updated', is_company: false, company_name: null });
    const { updateCustomer } = require('../services/customerService');
    const c = await updateCustomer(TID, CID, { name: 'Ahmed Updated', is_company: false });
    expect(c.name).toBe('Ahmed Updated');
    const vals = mockQ1.mock.calls[1][1] as any[];
    expect(vals).toContain(null);
  });

  it('soft deletes', async () => {
    mockQ1.mockResolvedValueOnce({ id: CID });
    const { deleteCustomer } = require('../services/customerService');
    await expect(deleteCustomer(TID, CID)).resolves.toEqual({ id: CID });
  });

  it('getCustomerById throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getCustomerById } = require('../services/customerService');
    await expect(getCustomerById(TID, 'nope')).rejects.toThrow('Customer not found');
  });
});

describe('getCustomerBookingHistory', () => {
  it('returns bookings when bookings table exists', async () => {
    mockQ1.mockResolvedValueOnce({ ...CUSTOMER });
    mockQ.mockResolvedValue([
      { id: 'b1', booking_reference: 'BK-2026-0001', number_of_passengers: 4,
        total_amount: '400.00', paid_amount: '200.00', balance: '200.00',
        status: 'confirmed', booking_date: '2026-08-10', payment_status: 'partial', notes: null,
        scheduled_date: '2026-08-20', route_name: 'Jeddah-Makkah', origin: 'Jeddah', destination: 'Makkah' },
    ]);
    const { getCustomerBookingHistory } = require('../services/customerService');
    const r = await getCustomerBookingHistory(TID, CID);
    expect(r.bookings).toHaveLength(1);
    expect(r.bookings[0].bookingReference).toBe('BK-2026-0001');
    expect(r.bookings[0].totalAmount).toBe(400);
    expect(r.bookings[0].route.origin).toBe('Jeddah');
  });

  it('returns empty bookings when table missing (42P01)', async () => {
    mockQ1.mockResolvedValueOnce({ ...CUSTOMER });
    const pgErr = new Error('relation "bookings" does not exist');
    (pgErr as any).code = '42P01';
    mockQ.mockRejectedValueOnce(pgErr);
    const { getCustomerBookingHistory } = require('../services/customerService');
    const r = await getCustomerBookingHistory(TID, CID);
    expect(r.bookings).toEqual([]);
  });
});