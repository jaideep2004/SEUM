import { NotFoundError, ConflictError } from '../utils/errors';

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import {
  createInvoice, listInvoices, getInvoiceDetail,
  updateInvoice, issueInvoice, recordPayment,
  cancelInvoice, refundInvoice, generateInvoicePdf,
} from '../services/invoiceService';

const TID = 'tenant-1';
const INVOICE_ID = 'invoice-1';

function makeInvoiceRow(overrides: Record<string, any> = {}) {
  return {
    id: INVOICE_ID, tenant_id: TID, invoice_number: 'INV-2026-0001',
    customer_name: 'Acme Corp', customer_contact: 'acme@test.com',
    invoice_date: '2026-07-01', due_date: '2026-07-15',
    subtotal: '200.00', tax_amount: '20.00', total: '220.00',
    status: 'draft', reference_trip_ids: [], notes: null,
    paid_amount: '0', paid_at: null, payment_method: null, payment_reference: null,
    created_by: 'user-1', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z', deleted_at: null,
    ...overrides,
  };
}

function makeLineRow(overrides: Record<string, any> = {}) {
  return {
    id: 'line-1', invoice_id: INVOICE_ID, description: 'Bus rental',
    quantity: '2', unit_price: '100.00', total: '200.00',
    account_id: null, trip_id: null,
    ...overrides,
  };
}

beforeEach(() => { jest.resetAllMocks(); });

describe('createInvoice', () => {
  it('creates invoice with line items', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null) // no last invoice for number
      .mockResolvedValueOnce(makeInvoiceRow()); // INSERT return

    mockQuery.mockResolvedValueOnce(undefined); // INSERT line 1
    mockQuery.mockResolvedValueOnce(undefined); // INSERT line 2

    // getInvoiceDetail calls
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow());
    mockQuery.mockResolvedValueOnce([makeLineRow(), makeLineRow({ id: 'line-2', description: 'Driver fee' })]);

    const result = await createInvoice(TID, {
      customer_name: 'Acme Corp', customer_contact: 'acme@test.com',
      invoice_date: '2026-07-01', due_date: '2026-07-15',
      tax_amount: 20,
      line_items: [
        { description: 'Bus rental', quantity: 2, unit_price: 100 },
        { description: 'Driver fee', quantity: 1, unit_price: 50 },
      ],
    }, 'user-1');

    expect(result.invoiceNumber).toBe('INV-2026-0001');
    expect(result.customerName).toBe('Acme Corp');
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(20);
    expect(result.total).toBe(220);
    expect(result.lineItems).toHaveLength(2);
    expect(result.status).toBe('draft');
  });

  it('increments invoice number when previous exists', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ invoice_number: 'INV-2026-0003' }) // last
      .mockResolvedValueOnce(makeInvoiceRow({ invoice_number: 'INV-2026-0004' }));

    mockQuery.mockResolvedValueOnce(undefined);
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ invoice_number: 'INV-2026-0004' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await createInvoice(TID, {
      customer_name: 'Corp', invoice_date: '2026-07-01', due_date: '2026-07-15',
      line_items: [{ description: 'Item', quantity: 1, unit_price: 100 }],
    });
    expect(result.invoiceNumber).toBe('INV-2026-0004');
  });
});

describe('listInvoices', () => {
  it('returns paginated invoices', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([makeInvoiceRow()]);

    const result = await listInvoices(TID, { page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('filters by status and customer name', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listInvoices(TID, {
      page: 1, pageSize: 20, status: 'issued', customer_name: 'Acme',
    });
    expect(result.data).toEqual([]);
  });

  it('filters by date range', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listInvoices(TID, {
      page: 1, pageSize: 20, startDate: '2026-07-01', endDate: '2026-07-31',
    });
    expect(result.data).toEqual([]);
  });
});

describe('getInvoiceDetail', () => {
  it('returns invoice with line items', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow());
    mockQuery.mockResolvedValueOnce([makeLineRow(), makeLineRow({ id: 'line-2', account_id: 'acc-1', account_name: 'Revenue' })]);

    const result = await getInvoiceDetail(TID, INVOICE_ID);
    expect(result.customerName).toBe('Acme Corp');
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[1].accountName).toBe('Revenue');
  });

  it('throws NotFoundError when missing', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(getInvoiceDetail(TID, INVOICE_ID)).rejects.toThrow(NotFoundError);
  });
});

describe('updateInvoice', () => {
  it('updates draft invoice fields', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow()) // existing check
      .mockResolvedValueOnce(makeInvoiceRow({ customer_name: 'Updated Corp' })); // after update

    mockQuery.mockResolvedValueOnce(undefined);
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ customer_name: 'Updated Corp' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await updateInvoice(TID, INVOICE_ID, { customer_name: 'Updated Corp' });
    expect(result.customerName).toBe('Updated Corp');
  });

  it('rejects update on non-draft invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'issued' }));
    await expect(updateInvoice(TID, INVOICE_ID, { customer_name: 'Nope' })).rejects.toThrow(ConflictError);
  });

  it('replaces line items when provided', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow())
      .mockResolvedValueOnce(makeInvoiceRow());

    mockQuery.mockResolvedValueOnce(undefined); // DELETE lines
    mockQuery.mockResolvedValueOnce(undefined); // INSERT line 1
    mockQuery.mockResolvedValueOnce(undefined); // UPDATE invoice totals

    // getInvoiceDetail calls inside updateInvoice
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow());
    mockQuery.mockResolvedValueOnce([makeLineRow({ description: 'New item', total: '300.00' })]);

    const result = await updateInvoice(TID, INVOICE_ID, {
      line_items: [{ description: 'New item', quantity: 3, unit_price: 100 }],
    });
    expect(result.lineItems[0].description).toBe('New item');
  });

  it('throws NotFoundError on missing invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(updateInvoice(TID, 'bad-id', { customer_name: 'Nope' })).rejects.toThrow(NotFoundError);
  });
});

describe('issueInvoice', () => {
  it('issues a draft invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow()) // check existing
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'issued' })); // UPDATE return

    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'issued' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await issueInvoice(TID, INVOICE_ID);
    expect(result.status).toBe('issued');
  });

  it('rejects issuing an already-issued invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'issued' }));
    await expect(issueInvoice(TID, INVOICE_ID)).rejects.toThrow(ConflictError);
  });

  it('rejects issuing a paid invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'paid' }));
    await expect(issueInvoice(TID, INVOICE_ID)).rejects.toThrow(ConflictError);
  });
});

describe('recordPayment', () => {
  it('records full payment on issued invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'issued', total: '220.00', paid_amount: '0' }))
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'paid', paid_amount: '220.00', payment_method: 'bank_transfer' }));

    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'paid', paid_amount: '220.00', payment_method: 'bank_transfer' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await recordPayment(TID, INVOICE_ID, {
      amount: 220, method: 'bank_transfer', date: '2026-07-20',
    });
    expect(result.status).toBe('paid');
    expect(result.paidAmount).toBe(220);
  });

  it('records partial payment (status stays issued)', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'issued', total: '500.00', paid_amount: '0' }))
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'issued', paid_amount: '200.00' }));

    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'issued', paid_amount: '200.00' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await recordPayment(TID, INVOICE_ID, {
      amount: 200, method: 'cash', date: '2026-07-20',
    });
    expect(result.status).toBe('issued');
  });

  it('rejects payment on draft invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'draft' }));
    await expect(recordPayment(TID, INVOICE_ID, { amount: 100, method: 'cash', date: '2026-07-20' })).rejects.toThrow(ConflictError);
  });
});

describe('cancelInvoice', () => {
  it('cancels a draft invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow())
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'cancelled' }));
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'cancelled' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await cancelInvoice(TID, INVOICE_ID);
    expect(result.status).toBe('cancelled');
  });

  it('cancels an issued invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'issued' }))
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'cancelled' }));
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'cancelled' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await cancelInvoice(TID, INVOICE_ID);
    expect(result.status).toBe('cancelled');
  });

  it('rejects cancelling already-paid invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'paid' }));
    await expect(cancelInvoice(TID, INVOICE_ID)).rejects.toThrow(ConflictError);
  });
});

describe('refundInvoice', () => {
  it('refunds a paid invoice', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'paid' }))
      .mockResolvedValueOnce(makeInvoiceRow({ status: 'refunded' }));
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow({ status: 'refunded' }));
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const result = await refundInvoice(TID, INVOICE_ID);
    expect(result.status).toBe('refunded');
  });

  it('rejects refunding draft invoice', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow());
    await expect(refundInvoice(TID, INVOICE_ID)).rejects.toThrow(ConflictError);
  });
});

describe('generateInvoicePdf', () => {
  it('generates a PDF buffer', async () => {
    mockQueryOne.mockResolvedValueOnce(makeInvoiceRow());
    mockQuery.mockResolvedValueOnce([makeLineRow()]);

    const pdf = await generateInvoicePdf(TID, INVOICE_ID, 'SEUM Transport');
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(100);
    expect(pdf.toString('latin1').substring(0, 4)).toBe('%PDF');
  });
});
