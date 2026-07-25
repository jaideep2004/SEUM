import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import PDFDocument from 'pdfkit';

interface InvoiceRow {
  id: string; tenant_id: string; invoice_number: string;
  customer_name: string; customer_contact: string | null;
  invoice_date: string; due_date: string;
  subtotal: string; tax_amount: string; total: string;
  status: string; reference_trip_ids: string[] | null; notes: string | null;
  paid_amount: string; paid_at: string | null;
  payment_method: string | null; payment_reference: string | null;
  created_by: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

interface LineItemRow {
  id: string; invoice_id: string; description: string;
  quantity: string; unit_price: string; total: string;
  account_id: string | null; trip_id: string | null;
}

function mapInvoice(r: InvoiceRow) {
  return {
    id: r.id, tenantId: r.tenant_id, invoiceNumber: r.invoice_number,
    customerName: r.customer_name, customerContact: r.customer_contact,
    invoiceDate: r.invoice_date, dueDate: r.due_date,
    subtotal: parseFloat(r.subtotal), taxAmount: parseFloat(r.tax_amount),
    total: parseFloat(r.total),
    status: r.status,
    referenceTripIds: r.reference_trip_ids || [],
    notes: r.notes,
    paidAmount: parseFloat(r.paid_amount || '0'),
    paidAt: r.paid_at, paymentMethod: r.payment_method,
    paymentReference: r.payment_reference,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapLineItem(r: LineItemRow) {
  return {
    id: r.id, invoiceId: r.invoice_id, description: r.description,
    quantity: parseFloat(r.quantity), unitPrice: parseFloat(r.unit_price),
    total: parseFloat(r.total),
    accountId: r.account_id, tripId: r.trip_id,
  };
}

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const last = await queryOne<{ invoice_number: string }>(
    `SELECT invoice_number FROM invoices WHERE tenant_id = $1 AND invoice_number LIKE $2 ORDER BY invoice_number DESC LIMIT 1`,
    [tenantId, `${prefix}-${year}-%`]
  );
  let seq = 1;
  if (last) {
    const parts = last.invoice_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

function computeTotals(lines: { quantity: number; unit_price: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  return subtotal;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['paid', 'overdue', 'cancelled'],
  paid: ['refunded'],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
  refunded: [],
};

function checkTransition(current: string, target: string) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new ConflictError(`Cannot transition invoice from ${current} to ${target}`);
  }
}

export async function createInvoice(
  tenantId: string,
  input: {
    customer_name: string; customer_contact?: string;
    invoice_date: string; due_date: string;
    tax_amount?: number; reference_trip_ids?: string[]; notes?: string;
    line_items: { description: string; quantity: number; unit_price: number; account_id?: string; trip_id?: string }[];
  },
  createdBy?: string,
) {
  const invoiceNumber = await nextInvoiceNumber(tenantId);
  const subtotal = computeTotals(input.line_items);
  const taxAmount = input.tax_amount || 0;
  const total = subtotal + taxAmount;

  const invoice = await queryOne<InvoiceRow>(
    `INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_contact, invoice_date, due_date, subtotal, tax_amount, total, reference_trip_ids, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [tenantId, invoiceNumber, input.customer_name, input.customer_contact || null,
     input.invoice_date, input.due_date, subtotal, taxAmount, total,
     input.reference_trip_ids ? `{${input.reference_trip_ids.join(',')}}` : null,
     input.notes || null, createdBy || null],
  );

  for (const line of input.line_items) {
    const lineTotal = line.quantity * line.unit_price;
    await query(
      `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, account_id, trip_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [invoice!.id, line.description, line.quantity, line.unit_price, lineTotal, line.account_id || null, line.trip_id || null],
    );
  }

  return getInvoiceDetail(tenantId, invoice!.id);
}

export async function listInvoices(
  tenantId: string,
  params: { status?: string; customer_name?: string; startDate?: string; endDate?: string; page: number; pageSize: number },
) {
  const conditions: string[] = ['i.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  conditions.push(`i.tenant_id = $${idx}`); values.push(tenantId); idx++;
  if (params.status) { conditions.push(`i.status = $${idx}`); values.push(params.status); idx++; }
  if (params.customer_name) { conditions.push(`i.customer_name ILIKE $${idx}`); values.push(`%${params.customer_name}%`); idx++; }
  if (params.startDate) { conditions.push(`i.invoice_date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`i.invoice_date <= $${idx}`); values.push(params.endDate); idx++; }

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM invoices i WHERE ${where}`, values,
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT i.*, u.name AS created_by_name,
            COALESCE(lines.line_count, 0)::int AS line_count
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     LEFT JOIN LATERAL (SELECT COUNT(*) AS line_count FROM invoice_line_items WHERE invoice_id = i.id) lines ON true
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset],
  );

  return {
    data: rows.map((r: any) => ({ ...mapInvoice(r), createdByName: r.created_by_name, lineCount: r.line_count })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getInvoiceDetail(tenantId: string, id: string) {
  const invoice = await queryOne<any>(
    `SELECT i.*, u.name AS created_by_name
     FROM invoices i LEFT JOIN users u ON u.id = i.created_by
     WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');

  const lines = await query<any>(
    `SELECT li.*, a.name AS account_name FROM invoice_line_items li
     LEFT JOIN accounts a ON a.id = li.account_id
     WHERE li.invoice_id = $1 ORDER BY li.created_at`,
    [id],
  );

  return {
    ...mapInvoice(invoice),
    createdByName: invoice.created_by_name,
    lineItems: lines.map((l: any) => ({ ...mapLineItem(l), accountName: l.account_name })),
  };
}

export async function updateInvoice(tenantId: string, id: string, input: {
  customer_name?: string; customer_contact?: string;
  invoice_date?: string; due_date?: string;
  tax_amount?: number; reference_trip_ids?: string[]; notes?: string;
  line_items?: { description: string; quantity: number; unit_price: number; account_id?: string; trip_id?: string }[];
}) {
  const existing = await queryOne<InvoiceRow>(
    'SELECT id, status FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!existing) throw new NotFoundError('Invoice not found');
  if (existing.status !== 'draft') throw new ConflictError('Only draft invoices can be updated');

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.customer_name !== undefined) { fields.push(`customer_name = $${idx}`); values.push(input.customer_name); idx++; }
  if (input.customer_contact !== undefined) { fields.push(`customer_contact = $${idx}`); values.push(input.customer_contact); idx++; }
  if (input.invoice_date !== undefined) { fields.push(`invoice_date = $${idx}`); values.push(input.invoice_date); idx++; }
  if (input.due_date !== undefined) { fields.push(`due_date = $${idx}`); values.push(input.due_date); idx++; }
  if (input.notes !== undefined) { fields.push(`notes = $${idx}`); values.push(input.notes); idx++; }
  if (input.tax_amount !== undefined) { fields.push(`tax_amount = $${idx}`); values.push(input.tax_amount); idx++; }
  if (input.reference_trip_ids !== undefined) {
    fields.push(`reference_trip_ids = $${idx}`);
    values.push(`{${input.reference_trip_ids.join(',')}}`);
    idx++;
  }

  if (input.line_items) {
    await query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);
    for (const line of input.line_items) {
      const lineTotal = line.quantity * line.unit_price;
      await query(
        `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total, account_id, trip_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, line.description, line.quantity, line.unit_price, lineTotal, line.account_id || null, line.trip_id || null],
      );
    }
    const lines = input.line_items;
    const subtotal = computeTotals(lines);
    const taxAmount = input.tax_amount !== undefined ? input.tax_amount : parseFloat(existing.tax_amount);
    const total = subtotal + taxAmount;
    fields.push(`subtotal = $${idx}`); values.push(subtotal); idx++;
    fields.push(`total = $${idx}`); values.push(total); idx++;
  }

  if (fields.length > 0) {
    fields.push('updated_at = NOW()');
    values.push(id, tenantId);
    await query(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1}`,
      values,
    );
  }

  return getInvoiceDetail(tenantId, id);
}

export async function issueInvoice(tenantId: string, id: string) {
  const invoice = await queryOne<InvoiceRow>(
    'SELECT id, status FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');
  checkTransition(invoice.status, 'issued');

  const result = await queryOne<InvoiceRow>(
    `UPDATE invoices SET status = 'issued', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return getInvoiceDetail(tenantId, result!.id);
}

export async function recordPayment(
  tenantId: string, id: string,
  input: { amount: number; method: string; date: string; reference?: string },
) {
  const invoice = await queryOne<InvoiceRow>(
    'SELECT id, status, total, paid_amount FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (!['issued', 'overdue'].includes(invoice.status)) {
    throw new ConflictError('Only issued or overdue invoices can receive payments');
  }

  const currentPaid = parseFloat(invoice.paid_amount || '0');
  const newPaid = currentPaid + input.amount;
  const total = parseFloat(invoice.total);
  const newStatus = newPaid >= total ? 'paid' : invoice.status;

  const result = await queryOne<InvoiceRow>(
    `UPDATE invoices SET paid_amount = $1, status = $2, payment_method = $3, payment_reference = $4, paid_at = $5, updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [newPaid, newStatus, input.method, input.reference || null, input.date, id],
  );
  return getInvoiceDetail(tenantId, result!.id);
}

export async function cancelInvoice(tenantId: string, id: string) {
  const invoice = await queryOne<InvoiceRow>(
    'SELECT id, status FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');
  checkTransition(invoice.status, 'cancelled');

  const result = await queryOne<InvoiceRow>(
    `UPDATE invoices SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return getInvoiceDetail(tenantId, result!.id);
}

export async function refundInvoice(tenantId: string, id: string) {
  const invoice = await queryOne<InvoiceRow>(
    'SELECT id, status FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');
  checkTransition(invoice.status, 'refunded');

  const result = await queryOne<InvoiceRow>(
    `UPDATE invoices SET status = 'refunded', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return getInvoiceDetail(tenantId, result!.id);
}

export async function generateInvoicePdf(tenantId: string, id: string, companyName?: string): Promise<Buffer> {
  const invoice = await getInvoiceDetail(tenantId, id);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const leftX = 50;
      let topY = 50;

      doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', leftX, topY, { align: 'right' });
      topY += 40;

      doc.fontSize(8).font('Helvetica').fillColor('#666');
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${invoice.invoiceDate}`, { align: 'right' });
      doc.text(`Due Date: ${invoice.dueDate}`, { align: 'right' });
      doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
      topY += 50;

      doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
      doc.text('Bill To:', leftX, topY);
      topY += 14;
      doc.font('Helvetica').fontSize(10);
      doc.text(invoice.customerName, leftX, topY);
      topY += 12;
      if (invoice.customerContact) {
        doc.text(invoice.customerContact);
        topY += 12;
      }
      topY += 20;

      if (companyName) {
        doc.fontSize(8).fillColor('#666').font('Helvetica');
        doc.text(companyName, doc.page.width - 200, 50, { width: 150, align: 'right' });
      }

      doc.fillColor('#000');

      // Table header
      const tableTop = topY;
      const colX = [leftX, 250, 350, 420, 500];
      const colWidths = [200, 100, 70, 80, 70];
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(leftX, tableTop, 500, 18).fill('#f3f4f6');
      doc.fillColor('#000');
      doc.text('Description', colX[0] + 4, tableTop + 4);
      doc.text('Qty', colX[1] + 4, tableTop + 4, { width: colWidths[1] - 8, align: 'right' });
      doc.text('Unit Price', colX[2] + 4, tableTop + 4, { width: colWidths[2] - 8, align: 'right' });
      doc.text('Total', colX[4] + 4, tableTop + 4, { width: colWidths[4] - 8, align: 'right' });

      let yPos = tableTop + 22;
      doc.font('Helvetica').fontSize(9);

      for (const line of invoice.lineItems) {
        doc.text(line.description, colX[0] + 4, yPos, { width: colWidths[0] - 8 });
        doc.text(String(line.quantity), colX[1] + 4, yPos, { width: colWidths[1] - 8, align: 'right' });
        doc.text(line.unitPrice.toFixed(2), colX[2] + 4, yPos, { width: colWidths[2] - 8, align: 'right' });
        doc.text(line.total.toFixed(2), colX[4] + 4, yPos, { width: colWidths[4] - 8, align: 'right' });
        yPos += 18;
      }

      // Totals
      yPos += 8;
      doc.font('Helvetica').fontSize(10);
      doc.text('Subtotal:', 380, yPos, { width: 80, align: 'right' });
      doc.text(invoice.subtotal.toFixed(2), 470, yPos, { width: 80, align: 'right' });
      yPos += 16;
      doc.text('Tax:', 380, yPos, { width: 80, align: 'right' });
      doc.text(invoice.taxAmount.toFixed(2), 470, yPos, { width: 80, align: 'right' });
      yPos += 16;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 380, yPos, { width: 80, align: 'right' });
      doc.text(invoice.total.toFixed(2), 470, yPos, { width: 80, align: 'right' });

      if (invoice.notes) {
        yPos += 30;
        doc.font('Helvetica').fontSize(9).fillColor('#666');
        doc.text(`Notes: ${invoice.notes}`, leftX, yPos);
      }

      // ZATCA-compatible footer
      yPos = Math.max(yPos + 30, doc.page.height - 80);
      doc.fontSize(7).fillColor('#999').font('Helvetica');
      doc.text('Invoice generated by SEUM — Simplified Tax Invoice', leftX, yPos, { align: 'center' });
      doc.text(`Invoice #${invoice.invoiceNumber} | ${invoice.invoiceDate}`, leftX, yPos + 10, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Placeholder for sending — returns true to indicate "queued"
export async function sendInvoice(tenantId: string, id: string, channel: 'email' | 'whatsapp') {
  const invoice = await queryOne<InvoiceRow>(
    'SELECT id, status FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!invoice) throw new NotFoundError('Invoice not found');
  // In production, queue email/WhatsApp via notification service
  return { sent: true, channel, invoiceId: id };
}
