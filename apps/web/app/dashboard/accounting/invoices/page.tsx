"use client";
import { useState, useEffect } from "react";
import { Plus, X, Trash2, Download, ArrowUpRight, Ban, RotateCcw, DollarSign } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUSES = ["draft", "issued", "paid", "overdue", "cancelled", "refunded"];

const STATUS_STYLES: Record<string, string> = {
  draft: styles.statusDraft, issued: styles.statusIssued, paid: styles.statusPaid,
  overdue: styles.statusOverdue, cancelled: styles.statusCancelled, refunded: styles.statusRefunded,
};

interface LineItem {
  id: string; description: string; quantity: number; unit_price: number; account_id: string;
}

function emptyLine(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, account_id: "" };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; invoice: any } | null>(null);
  const [payModal, setPayModal] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "bank_transfer", date: "", reference: "" });
  const [accounts, setAccounts] = useState<any[]>([]);

  const [filters, setFilters] = useState({ status: "", customer_name: "", start_date: "", end_date: "" });

  const [form, setForm] = useState({
    customer_name: "", customer_contact: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    tax_amount: 0, notes: "",
    line_items: [emptyLine()],
  });

  async function fetchInvoices(page = 1) {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.status) params.set("status", filters.status);
    if (filters.customer_name) params.set("customer_name", filters.customer_name);
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    try {
      const res = await fetch(`${API}/accounting/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) { setInvoices(d.data); setMeta(d.meta); }
    } catch {}
    setLoading(false);
  }

  async function fetchAccounts() {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounts`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) {
        const flat: any[] = [];
        const walk = (nodes: any[]) => nodes.forEach((n: any) => { flat.push(n); if (n.children) walk(n.children); });
        walk(d.data.tree || []);
        setAccounts(flat);
      }
    } catch {}
  }

  useEffect(() => { fetchInvoices(); }, []);

  function openCreate() {
    fetchAccounts();
    setForm({
      customer_name: "", customer_contact: "",
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      tax_amount: 0, notes: "",
      line_items: [emptyLine()],
    });
    setCreateOpen(true);
  }

  function closeCreate() { setCreateOpen(false); }

  function updateLine(idx: number, field: string, value: any) {
    const lines = [...form.line_items];
    (lines[idx] as any)[field] = field === "quantity" || field === "unit_price" ? (parseFloat(value) || 0) : value;
    setForm({ ...form, line_items: lines });
  }

  function removeLine(idx: number) {
    if (form.line_items.length <= 1) return;
    setForm({ ...form, line_items: form.line_items.filter((_, i) => i !== idx) });
  }

  function addLine() { setForm({ ...form, line_items: [...form.line_items, emptyLine()] }); }

  const subtotal = form.line_items.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const total = subtotal + form.tax_amount;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/invoices`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.customer_name,
          customer_contact: form.customer_contact || undefined,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          tax_amount: form.tax_amount,
          notes: form.notes || undefined,
          line_items: form.line_items.map(l => ({
            description: l.description, quantity: l.quantity, unit_price: l.unit_price,
            account_id: l.account_id || undefined,
          })),
        }),
      });
      const d = await res.json();
      if (d.success) { closeCreate(); fetchInvoices(); }
    } catch {}
    setActionLoading(false);
  }

  async function openDetail(inv: any) {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/invoices/${inv.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setDetailTarget(d.data);
    } catch {}
  }

  async function handleAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    const token = getToken();
    const { type, invoice } = confirmAction;
    const endpoint = `${API}/accounting/invoices/${invoice.id}/${type}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        setConfirmAction(null);
        setDetailTarget(d.data);
        fetchInvoices();
      }
    } catch {}
    setActionLoading(false);
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    setActionLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/invoices/${payModal.id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount as any) || 0, reference: payForm.reference || undefined }),
      });
      const d = await res.json();
      if (d.success) {
        setPayModal(null);
        setDetailTarget(d.data);
        fetchInvoices();
      }
    } catch {}
    setActionLoading(false);
  }

  async function downloadPdf(invoice: any) {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  const statusColor = (s: string) => STATUS_STYLES[s] || styles.statusDraft;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Invoices</h1>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={openCreate}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input placeholder="Customer name" value={filters.customer_name} onChange={e => setFilters({ ...filters, customer_name: e.target.value })} />
        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <button className={styles.filterBtn} onClick={() => fetchInvoices()}>Apply</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className={styles.loading}>No invoices found</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => openDetail(inv)}>
                  <td className={styles.invoiceNum}>{inv.invoiceNumber}</td>
                  <td>{inv.customerName}</td>
                  <td>{inv.invoiceDate}</td>
                  <td>{inv.dueDate}</td>
                  <td>{formatCurrency(inv.total)}</td>
                  <td><span className={`${styles.statusBadge} ${statusColor(inv.status)}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className={styles.overlay} onClick={closeCreate}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>New Invoice</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Customer Name *</label>
                  <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>Customer Contact</label>
                  <input value={form.customer_contact} onChange={e => setForm({ ...form, customer_contact: e.target.value })} placeholder="Phone / Email" />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Invoice Date *</label>
                  <input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className={styles.lineItemsSection}>
                <h3>Line Items</h3>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Description</th>
                      <th style={{ width: "12%" }}>Qty</th>
                      <th style={{ width: "16%" }}>Unit Price</th>
                      <th style={{ width: "16%" }}>Total</th>
                      <th style={{ width: "20%" }}>Account</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.line_items.map((line, i) => (
                      <tr key={line.id}>
                        <td><input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Service description" required /></td>
                        <td><input type="number" min="0" step="1" value={line.quantity || ""} onChange={e => updateLine(i, "quantity", e.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.unit_price || ""} onChange={e => updateLine(i, "unit_price", e.target.value)} /></td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(line.quantity * line.unit_price)}</td>
                        <td>
                          <select value={line.account_id} onChange={e => updateLine(i, "account_id", e.target.value)}>
                            <option value="">—</option>
                            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                          </select>
                        </td>
                        <td>
                          {form.line_items.length > 1 && (
                            <button type="button" className={styles.removeBtn} onClick={() => removeLine(i)}><Trash2 size={14} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className={styles.addLineBtn} onClick={addLine}><Plus size={13} /> Add Line</button>
              </div>

              <div style={{ textAlign: "right", marginTop: 12, fontSize: "0.875rem" }}>
                <div>Subtotal: <strong>{formatCurrency(subtotal)}</strong></div>
                <div style={{ marginTop: 4 }}>
                  Tax: <input type="number" step="0.01" min="0" value={form.tax_amount || ""}
                    onChange={e => setForm({ ...form, tax_amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: 100, padding: "4px 8px", border: "1px solid var(--color-border)", borderRadius: 4, fontSize: "0.8125rem" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: "1rem" }}>Total: <strong>{formatCurrency(total)}</strong></div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={closeCreate}>Cancel</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || form.line_items.some(l => !l.description)}>
                  {actionLoading ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Slideover */}
      {detailTarget && (
        <div className={styles.slideover} onClick={() => setDetailTarget(null)}>
          <div className={styles.slideoverPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.slideoverHeader}>
              <h2>{detailTarget.invoiceNumber}</h2>
              <button className={styles.closeBtn} onClick={() => setDetailTarget(null)}><X size={18} /></button>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>
                <span className={`${styles.statusBadge} ${statusColor(detailTarget.status)}`}>{detailTarget.status}</span>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Customer</span>
              <span className={styles.infoValue}>{detailTarget.customerName}</span>
            </div>
            {detailTarget.customerContact && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Contact</span>
                <span className={styles.infoValue}>{detailTarget.customerContact}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Invoice Date</span>
              <span className={styles.infoValue}>{detailTarget.invoiceDate}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Due Date</span>
              <span className={styles.infoValue}>{detailTarget.dueDate}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Subtotal</span>
              <span className={styles.infoValue}>{formatCurrency(detailTarget.subtotal)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tax</span>
              <span className={styles.infoValue}>{formatCurrency(detailTarget.taxAmount)}</span>
            </div>
            <div className={styles.infoRow} style={{ fontWeight: 700, fontSize: "1rem" }}>
              <span className={styles.infoLabel}>Total</span>
              <span className={styles.infoValue}>{formatCurrency(detailTarget.total)}</span>
            </div>
            {detailTarget.status === "paid" && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Paid</span>
                <span className={styles.infoValue}>{formatCurrency(detailTarget.paidAmount)} on {detailTarget.paidAt?.slice(0, 10)} ({detailTarget.paymentMethod})</span>
              </div>
            )}
            {detailTarget.notes && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Notes</span>
                <span className={styles.infoValue}>{detailTarget.notes}</span>
              </div>
            )}

            <div className={styles.sectionTitle}>Line Items</div>
            <table className={styles.detailLineTable}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.lineItems?.map((l: any) => (
                  <tr key={l.id}>
                    <td>{l.description}{l.accountName ? ` (${l.accountName})` : ""}</td>
                    <td>{l.quantity}</td>
                    <td>{formatCurrency(l.unitPrice)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.actionsRow}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => downloadPdf(detailTarget)}>
                <Download size={14} /> PDF
              </button>

              {detailTarget.status === "draft" && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => setConfirmAction({ type: "issue", invoice: detailTarget })}>
                  <ArrowUpRight size={14} /> Issue
                </button>
              )}
              {(detailTarget.status === "issued" || detailTarget.status === "overdue") && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => {
                  setPayModal(detailTarget);
                  setPayForm({ amount: detailTarget.total - detailTarget.paidAmount, method: "bank_transfer", date: new Date().toISOString().split("T")[0], reference: "" });
                }}>
                  <DollarSign size={14} /> Record Payment
                </button>
              )}
              {(detailTarget.status === "draft" || detailTarget.status === "issued") && (
                <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => setConfirmAction({ type: "cancel", invoice: detailTarget })}>
                  <Ban size={14} /> Cancel
                </button>
              )}
              {detailTarget.status === "paid" && (
                <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => setConfirmAction({ type: "refund", invoice: detailTarget })}>
                  <RotateCcw size={14} /> Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action */}
      {confirmAction && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmAction(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3>{confirmAction.type === "issue" ? "Issue Invoice" : confirmAction.type === "cancel" ? "Cancel Invoice" : "Refund Invoice"}</h3>
            <p>
              {confirmAction.type === "issue" && `This will lock invoice ${confirmAction.invoice.invoiceNumber} and mark it as issued. Continue?`}
              {confirmAction.type === "cancel" && `Cancel invoice ${confirmAction.invoice.invoiceNumber}?`}
              {confirmAction.type === "refund" && `Issue a refund for invoice ${confirmAction.invoice.invoiceNumber}? This action is irreversible.`}
            </p>
            <div className={styles.confirmActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? "Processing..." : `Yes, ${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className={styles.overlay} onClick={() => setPayModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>Record Payment</h2>
            <form onSubmit={handlePay}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Invoice</span>
                <span className={styles.infoValue}>{payModal.invoiceNumber}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Outstanding</span>
                <span className={styles.infoValue}>{formatCurrency(payModal.total - payModal.paidAmount)}</span>
              </div>
              <div className={styles.field}>
                <label>Amount *</label>
                <input type="number" step="0.01" min="0" value={payForm.amount || ""} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className={styles.field}>
                <label>Payment Method *</label>
                <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                  {["cash", "bank_transfer", "card", "cheque", "online", "other"].map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Payment Date *</label>
                <input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>Reference</label>
                <input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Cheque # / Transaction ID" />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || !payForm.amount}>
                  {actionLoading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
