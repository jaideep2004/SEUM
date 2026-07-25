import { query, queryOne } from '../db';
import PDFDocument from 'pdfkit';

// ─── P&L Statement ───

export async function profitLoss(tenantId: string, startDate: string, endDate: string) {
  const revenueAccounts = await query<any>(
    `SELECT id, code, name FROM accounts WHERE tenant_id = $1 AND type = 'revenue' AND deleted_at IS NULL ORDER BY code`,
    [tenantId],
  );

  const expenseAccounts = await query<any>(
    `SELECT id, code, name FROM accounts WHERE tenant_id = $1 AND type = 'expense' AND deleted_at IS NULL ORDER BY code`,
    [tenantId],
  );

  async function getAccountBalance(accountIds: string[]) {
    if (accountIds.length === 0) return 0;
    const r = await queryOne<{ bal: string }>(
      `SELECT COALESCE(SUM(CASE WHEN a.type IN ('revenue','liability','equity') THEN credit_amount - debit_amount ELSE debit_amount - credit_amount END), 0)::text AS bal
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL
       JOIN accounts a ON a.id = jel.account_id
       WHERE jel.account_id = ANY($1) AND je.tenant_id = $2 AND je.status = 'posted' AND je.date >= $3 AND je.date <= $4`,
      [accountIds, tenantId, startDate, endDate],
    );
    return parseFloat(r?.bal || '0');
  }

  const revenueIds = revenueAccounts.map((a: any) => a.id);
  const expenseIds = expenseAccounts.map((a: any) => a.id);
  const totalRevenue = await getAccountBalance(revenueIds);
  const totalExpenses = await getAccountBalance(expenseIds);

  const revenueBreakdown = await Promise.all(
    revenueAccounts.map(async (a: any) => {
      const amount = await getAccountBalance([a.id]);
      return { code: a.code, name: a.name, amount };
    }),
  );
  const expenseBreakdown = await Promise.all(
    expenseAccounts.map(async (a: any) => {
      const amount = await getAccountBalance([a.id]);
      return { code: a.code, name: a.name, amount };
    }),
  );

  return {
    period: { startDate, endDate },
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    revenueBreakdown: revenueBreakdown.filter(r => r.amount !== 0),
    expenseBreakdown: expenseBreakdown.filter(e => e.amount !== 0),
  };
}

// ─── Balance Sheet ───

export async function balanceSheet(tenantId: string, asOfDate: string) {
  const sections = [
    { type: 'asset', label: 'Assets' },
    { type: 'liability', label: 'Liabilities' },
    { type: 'equity', label: "Owner's Equity" },
  ];

  const result: any[] = [];

  for (const section of sections) {
    const accounts = await query<any>(
      `SELECT id, code, name FROM accounts WHERE tenant_id = $1 AND type = $2 AND deleted_at IS NULL ORDER BY code`,
      [tenantId, section.type],
    );

    const breakdown = await Promise.all(
      accounts.map(async (a: any) => {
        const row = await queryOne<{ bal: string }>(
          `SELECT COALESCE(SUM(CASE WHEN a.type IN ('revenue','liability','equity') THEN credit_amount - debit_amount ELSE debit_amount - credit_amount END), 0)::text AS bal
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL
           JOIN accounts a ON a.id = jel.account_id
           WHERE jel.account_id = $1 AND je.tenant_id = $2 AND je.status = 'posted' AND je.date <= $3`,
          [a.id, tenantId, asOfDate],
        );
        const amount = parseFloat(row?.bal || '0');
        return { code: a.code, name: a.name, amount };
      }),
    );

    const total = breakdown.reduce((s: number, r: any) => s + r.amount, 0);
    result.push({
      section: section.label,
      total,
      accounts: breakdown.filter(b => b.amount !== 0),
    });
  }

  const equity = result.find(r => r.section === "Owner's Equity");
  const pl = await profitLoss(tenantId, '1900-01-01', asOfDate);
  if (equity) {
    equity.retainedEarnings = pl.netProfit;
    equity.total += pl.netProfit;
  }

  result.push({
    section: 'Total Liabilities & Equity',
    total: (result.find(r => r.section === 'Liabilities')?.total || 0) + (result.find(r => r.section === "Owner's Equity")?.total || 0),
  });

  return { asOfDate, sections: result };
}

// ─── AR / AP Aging ───

export async function arAging(tenantId: string, asOfDate: string) {
  const rows = await query<any>(
    `SELECT i.id, i.invoice_number, i.customer_name, i.invoice_date, i.due_date, i.total, i.paid_amount, i.status
     FROM invoices i
     WHERE i.tenant_id = $1 AND i.deleted_at IS NULL AND i.status IN ('issued','overdue')
     ORDER BY i.due_date`,
    [tenantId],
  );

  const now = new Date(asOfDate);
  const aging = rows.map((r: any) => {
    const due = new Date(r.due_date);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
    const outstanding = parseFloat(r.total) - parseFloat(r.paid_amount || '0');
    let bucket = 'current';
    if (daysOverdue > 90) bucket = '90+';
    else if (daysOverdue > 60) bucket = '61-90';
    else if (daysOverdue > 30) bucket = '31-60';
    else if (daysOverdue > 0) bucket = '1-30';

    return {
      invoiceNumber: r.invoice_number, customerName: r.customer_name,
      invoiceDate: r.invoice_date, dueDate: r.due_date,
      daysOverdue, outstanding, bucket, status: r.status,
    };
  });

  const totals = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const r of aging) { totals[r.bucket as keyof typeof totals] += r.outstanding; }

  return { asOfDate, aging, totals };
}

export async function apAging(tenantId: string, asOfDate: string) {
  // Use unpaid expenses as AP proxy
  const rows = await query<any>(
    `SELECT e.id, e.expense_category AS vendor, e.date, e.amount, e.status, e.created_at
     FROM expenses e
     WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.status IN ('pending','approved')
     ORDER BY e.date`,
    [tenantId],
  );

  const now = new Date(asOfDate);
  const aging = rows.map((r: any) => {
    const due = new Date(r.date);
    due.setDate(due.getDate() + 30); // assume 30-day terms
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
    const outstanding = parseFloat(r.amount);
    let bucket = 'current';
    if (daysOverdue > 90) bucket = '90+';
    else if (daysOverdue > 60) bucket = '61-90';
    else if (daysOverdue > 30) bucket = '31-60';
    else if (daysOverdue > 0) bucket = '1-30';

    return {
      vendor: r.vendor, date: r.date, dueDate: due.toISOString().split('T')[0],
      daysOverdue, outstanding, bucket, status: r.status,
    };
  });

  const totals = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const r of aging) { totals[r.bucket as keyof typeof totals] += r.outstanding; }

  return { asOfDate, aging, totals };
}

// ─── Cash Flow ───

export async function cashFlow(tenantId: string, startDate: string, endDate: string) {
  const revenueRows = await query<any>(
    `SELECT COALESCE(SUM(CASE WHEN a.code LIKE '4%' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0)::text AS inflow,
            COALESCE(SUM(CASE WHEN a.code LIKE '5%' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0)::text AS outflow
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.deleted_at IS NULL
     JOIN accounts a ON a.id = jel.account_id
     WHERE je.tenant_id = $1 AND je.status = 'posted' AND je.date >= $2 AND je.date <= $3`,
    [tenantId, startDate, endDate],
  );

  const expenseRows = await query<any>(
    `SELECT e.expense_category, COALESCE(SUM(e.amount), 0)::text AS total
     FROM expenses e WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
     AND e.date >= $2 AND e.date <= $3 AND e.status = 'reimbursed'
     GROUP BY e.expense_category ORDER BY e.expense_category`,
    [tenantId, startDate, endDate],
  );

  const inflow = parseFloat(revenueRows[0]?.inflow || '0');
  const outflow = parseFloat(revenueRows[0]?.outflow || '0');

  return {
    period: { startDate, endDate },
    operating: {
      inflow: Math.max(inflow, 0),
      outflow: Math.max(outflow, 0),
      net: inflow - outflow,
      breakdown: expenseRows.map((r: any) => ({ category: r.expense_category, amount: parseFloat(r.total) })),
    },
    investing: { inflow: 0, outflow: 0, net: 0, breakdown: [] },
    financing: { inflow: 0, outflow: 0, net: 0, breakdown: [] },
    netCashChange: inflow - outflow,
  };
}

// ─── Expense by Category ───

export async function expenseByCategory(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT e.expense_category, COALESCE(SUM(e.amount), 0)::text AS total, COUNT(*)::int AS count
     FROM expenses e
     WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.date >= $2 AND e.date <= $3
     GROUP BY e.expense_category ORDER BY total DESC`,
    [tenantId, startDate, endDate],
  );

  const breakdown = rows.map((r: any) => ({
    category: r.expense_category,
    total: parseFloat(r.total),
    count: r.count,
  }));
  const grandTotal = breakdown.reduce((s: number, r: any) => s + r.total, 0);

  return { period: { startDate, endDate }, grandTotal, breakdown };
}

// ─── Revenue by Route / Bus ───

export async function revenueByRoute(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT COALESCE(r.name, 'Unknown') AS label, COUNT(*)::int AS trip_count,
            COALESCE(SUM(t.estimated_revenue), 0)::text AS total_revenue
     FROM trips t LEFT JOIN routes r ON r.id = t.route_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL AND t.status = 'completed'
     AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     GROUP BY r.name ORDER BY total_revenue DESC`,
    [tenantId, startDate, endDate],
  );

  return {
    period: { startDate, endDate },
    groupBy: 'route',
    breakdown: rows.map((r: any) => ({
      label: r.label, tripCount: r.trip_count, totalRevenue: parseFloat(r.total_revenue),
    })),
  };
}

export async function revenueByBus(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT COALESCE(b.plate_number, 'Unknown') AS label, COUNT(*)::int AS trip_count,
            COALESCE(SUM(t.estimated_revenue), 0)::text AS total_revenue
     FROM trips t LEFT JOIN buses b ON b.id = t.bus_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL AND t.status = 'completed'
     AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     GROUP BY b.plate_number ORDER BY total_revenue DESC`,
    [tenantId, startDate, endDate],
  );

  return {
    period: { startDate, endDate },
    groupBy: 'bus',
    breakdown: rows.map((r: any) => ({
      label: r.label, tripCount: r.trip_count, totalRevenue: parseFloat(r.total_revenue),
    })),
  };
}

// ─── PDF Generation ───

function addPdfPageHeader(doc: any, title: string, subtitle: string) {
  doc.fontSize(16).font('Helvetica-Bold').text(title, 50, 40);
  doc.fontSize(9).font('Helvetica').fillColor('#666').text(subtitle, 50, 62);
  doc.moveDown(2);
  doc.fillColor('#000');
}

function addPdfTable(doc: any, headers: string[], rows: any[][], startY: number, widths?: number[]) {
  const colX = widths || headers.map((_, i) => 50 + i * 100);
  let y = startY;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.rect(50, y - 4, 495, 16).fill('#f3f4f6');
  doc.fillColor('#000');
  headers.forEach((h, i) => doc.text(h, colX[i] + 4, y));
  y += 18;
  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(String(cell), colX[i] + 4, y, { width: (widths?.[i] || 100) - 8 }));
    y += 16;
    if (y > 780) { doc.addPage(); y = 50; }
  }
  return y;
}

export async function generatePdf(tenantId: string, reportType: string, params: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (c: Buffer) => buffers.push(c));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const startDate = params.start_date || '1900-01-01';
      const endDate = params.end_date || '2099-12-31';
      const asOfDate = params.as_of_date || endDate;

      switch (reportType) {
        case 'profit-loss': {
          const data = await profitLoss(tenantId, startDate, endDate);
          addPdfPageHeader(doc, 'Profit & Loss Statement', `${startDate} to ${endDate}`);
          let y = 90;
          doc.fontSize(10).font('Helvetica-Bold').text('Revenue', 50, y); y += 18;
          for (const r of data.revenueBreakdown) {
            doc.font('Helvetica').fontSize(9).text(`  ${r.code}  ${r.name}`, 50, y);
            doc.text(r.amount.toFixed(2), 450, y, { align: 'right' });
            y += 14;
          }
          doc.font('Helvetica-Bold').text(`Total Revenue`, 50, y); doc.text(data.totalRevenue.toFixed(2), 450, y, { align: 'right' }); y += 22;
          doc.fontSize(10).font('Helvetica-Bold').text('Expenses', 50, y); y += 18;
          for (const e of data.expenseBreakdown) {
            doc.font('Helvetica').fontSize(9).text(`  ${e.code}  ${e.name}`, 50, y);
            doc.text(e.amount.toFixed(2), 450, y, { align: 'right' });
            y += 14;
          }
          doc.font('Helvetica-Bold').text(`Total Expenses`, 50, y); doc.text(data.totalExpenses.toFixed(2), 450, y, { align: 'right' }); y += 22;
          doc.fontSize(12).fillColor(data.netProfit >= 0 ? '#059669' : '#dc2626').text(`Net ${data.netProfit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(data.netProfit).toFixed(2)}`, 50, y);
          break;
        }
        case 'balance-sheet': {
          const data = await balanceSheet(tenantId, asOfDate);
          addPdfPageHeader(doc, 'Balance Sheet', `As of ${asOfDate}`);
          let y = 90;
          for (const section of data.sections) {
            if (!section.accounts) continue;
            doc.fontSize(10).font('Helvetica-Bold').text(section.section, 50, y); y += 18;
            let totalCheck = 0;
            for (const a of section.accounts) {
              doc.font('Helvetica').fontSize(9).text(`  ${a.code}  ${a.name}`, 50, y);
              doc.text(a.amount.toFixed(2), 450, y, { align: 'right' });
              totalCheck += a.amount;
              y += 14;
            }
            if (section.retainedEarnings !== undefined) {
              doc.font('Helvetica').fontSize(9).text(`  Retained Earnings`, 50, y);
              doc.text(section.retainedEarnings.toFixed(2), 450, y, { align: 'right' });
              y += 14;
            }
            doc.font('Helvetica-Bold').text(`Total ${section.section}`, 50, y);
            doc.text(section.total.toFixed(2), 450, y, { align: 'right' });
            y += 22;
          }
          break;
        }
        case 'ar-aging': {
          const data = await arAging(tenantId, asOfDate);
          addPdfPageHeader(doc, 'Accounts Receivable Aging', `As of ${asOfDate}`);
          let y = 90;
          doc.font('Helvetica-Bold').fontSize(9);
          for (const [bucket, total] of Object.entries(data.totals)) {
            doc.text(`${bucket}: ${(total as number).toFixed(2)}`, 50, y);
            y += 14;
          }
          y += 10;
          const headerY = y;
          y = addPdfTable(doc, ['Invoice', 'Customer', 'Due Date', 'Days Over', 'Outstanding', 'Bucket'],
            data.aging.map((r: any) => [r.invoiceNumber, r.customerName, r.dueDate, String(r.daysOverdue), r.outstanding.toFixed(2), r.bucket]),
            headerY, [70, 100, 70, 60, 80, 60]);
          break;
        }
        case 'ap-aging': {
          const data = await apAging(tenantId, asOfDate);
          addPdfPageHeader(doc, 'Accounts Payable Aging', `As of ${asOfDate}`);
          let y = 90;
          doc.font('Helvetica-Bold').fontSize(9);
          for (const [bucket, total] of Object.entries(data.totals)) {
            doc.text(`${bucket}: ${(total as number).toFixed(2)}`, 50, y);
            y += 14;
          }
          y += 10;
          y = addPdfTable(doc, ['Vendor', 'Date', 'Due Date', 'Days Over', 'Outstanding', 'Bucket'],
            data.aging.map((r: any) => [r.vendor, r.date, r.dueDate, String(r.daysOverdue), r.outstanding.toFixed(2), r.bucket]),
            y, [80, 60, 70, 60, 80, 60]);
          break;
        }
        case 'cash-flow': {
          const data = await cashFlow(tenantId, startDate, endDate);
          addPdfPageHeader(doc, 'Cash Flow Statement', `${startDate} to ${endDate}`);
          let y = 90;
          const sections = [
            { label: 'Operating Activities', data: data.operating },
            { label: 'Investing Activities', data: data.investing },
            { label: 'Financing Activities', data: data.financing },
          ];
          for (const s of sections) {
            doc.fontSize(10).font('Helvetica-Bold').text(s.label, 50, y); y += 18;
            doc.font('Helvetica').fontSize(9);
            doc.text(`  Inflow: ${s.data.inflow.toFixed(2)}`, 50, y); y += 14;
            doc.text(`  Outflow: ${s.data.outflow.toFixed(2)}`, 50, y); y += 14;
            doc.text(`  Net: ${s.data.net.toFixed(2)}`, 50, y); y += 22;
          }
          doc.fontSize(11).fillColor('#000').font('Helvetica-Bold').text(`Net Cash Change: ${data.netCashChange.toFixed(2)}`, 50, y);
          break;
        }
        case 'expense-category': {
          const data = await expenseByCategory(tenantId, startDate, endDate);
          addPdfPageHeader(doc, 'Expense by Category', `${startDate} to ${endDate}`);
          let y = addPdfTable(doc, ['Category', 'Count', 'Total', '%'],
            data.breakdown.map((r: any) => [r.category, String(r.count), r.total.toFixed(2), data.grandTotal > 0 ? ((r.total / data.grandTotal) * 100).toFixed(1) + '%' : '0%']),
            90, [120, 60, 100, 80]);
          doc.font('Helvetica-Bold').fontSize(9).text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 50, y + 10);
          break;
        }
        case 'revenue-route': {
          const data = await revenueByRoute(tenantId, startDate, endDate);
          addPdfPageHeader(doc, 'Revenue by Route', `${startDate} to ${endDate}`);
          addPdfTable(doc, ['Route', 'Trips', 'Total Revenue'],
            data.breakdown.map((r: any) => [r.label, String(r.tripCount), r.totalRevenue.toFixed(2)]),
            90, [200, 80, 120]);
          break;
        }
        case 'revenue-bus': {
          const data = await revenueByBus(tenantId, startDate, endDate);
          addPdfPageHeader(doc, 'Revenue by Bus', `${startDate} to ${endDate}`);
          addPdfTable(doc, ['Bus', 'Trips', 'Total Revenue'],
            data.breakdown.map((r: any) => [r.label, String(r.tripCount), r.totalRevenue.toFixed(2)]),
            90, [200, 80, 120]);
          break;
        }
      }

      doc.fontSize(7).fillColor('#999').text('Generated by SEUM — Financial Report', 50, doc.page.height - 40, { align: 'center' });
      doc.end();
    } catch (err) { reject(err); }
  });
}

// ─── CSV Export ───

export async function generateCsv(tenantId: string, reportType: string, params: any): Promise<string> {
  const startDate = params.start_date || '1900-01-01';
  const endDate = params.end_date || '2099-12-31';
  const asOfDate = params.as_of_date || endDate;

  let csv = '';
  const addRow = (cells: any[]) => { csv += cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n'; };

  switch (reportType) {
    case 'profit-loss': {
      const data = await profitLoss(tenantId, startDate, endDate);
      addRow(['Profit & Loss Statement', `${startDate} to ${endDate}`]);
      addRow([]); addRow(['Code', 'Account', 'Amount']);
      for (const r of data.revenueBreakdown) addRow([r.code, r.name, r.amount]);
      addRow(['', 'Total Revenue', data.totalRevenue]);
      addRow([]);
      for (const e of data.expenseBreakdown) addRow([e.code, e.name, e.amount]);
      addRow(['', 'Total Expenses', data.totalExpenses]);
      addRow(['', 'Net Profit/Loss', data.netProfit]);
      break;
    }
    case 'ar-aging': {
      const data = await arAging(tenantId, asOfDate);
      addRow(['Accounts Receivable Aging', `As of ${asOfDate}`]);
      addRow([]); addRow(['Invoice', 'Customer', 'Due Date', 'Days Overdue', 'Outstanding', 'Bucket']);
      for (const r of data.aging) addRow([r.invoiceNumber, r.customerName, r.dueDate, r.daysOverdue, r.outstanding, r.bucket]);
      break;
    }
    case 'ap-aging': {
      const data = await apAging(tenantId, asOfDate);
      addRow(['Accounts Payable Aging', `As of ${asOfDate}`]);
      addRow([]); addRow(['Vendor', 'Date', 'Due Date', 'Days Overdue', 'Outstanding', 'Bucket']);
      for (const r of data.aging) addRow([r.vendor, r.date, r.dueDate, r.daysOverdue, r.outstanding, r.bucket]);
      break;
    }
    case 'expense-category': {
      const data = await expenseByCategory(tenantId, startDate, endDate);
      addRow(['Expense by Category', `${startDate} to ${endDate}`]);
      addRow([]); addRow(['Category', 'Count', 'Total']);
      for (const r of data.breakdown) addRow([r.category, r.count, r.total]);
      addRow(['', 'Grand Total', data.grandTotal]);
      break;
    }
    case 'revenue-route': {
      const data = await revenueByRoute(tenantId, startDate, endDate);
      addRow(['Revenue by Route', `${startDate} to ${endDate}`]);
      addRow([]); addRow(['Route', 'Trips', 'Total Revenue']);
      for (const r of data.breakdown) addRow([r.label, r.tripCount, r.totalRevenue]);
      break;
    }
    case 'revenue-bus': {
      const data = await revenueByBus(tenantId, startDate, endDate);
      addRow(['Revenue by Bus', `${startDate} to ${endDate}`]);
      addRow([]); addRow(['Bus', 'Trips', 'Total Revenue']);
      for (const r of data.breakdown) addRow([r.label, r.tripCount, r.totalRevenue]);
      break;
    }
  }

  return csv;
}
