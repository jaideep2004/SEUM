"use client";
import { useState, useEffect } from "react";
import { Plus, X, Trash2, Download, ArrowUpRight, Ban, RotateCcw, DollarSign } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
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
  const { lang, t } = useLanguage();
  const money = (v: number) => formatCurrency(v, lang);
  const STATUS_LABELS: Record<string, string> = {
    draft: t("finance.invoices.statusDraft"),
    issued: t("finance.invoices.statusIssued"),
    paid: t("finance.invoices.statusPaid"),
    overdue: t("finance.invoices.statusOverdue"),
    cancelled: t("finance.invoices.statusCancelled"),
    refunded: t("finance.invoices.statusRefunded"),
  };
  const STATUS_CAP_LABELS: Record<string, string> = {
    draft: t("finance.invoices.statusDraftCap"),
    issued: t("finance.invoices.statusIssuedCap"),
    paid: t("finance.invoices.statusPaidCap"),
    overdue: t("finance.invoices.statusOverdueCap"),
    cancelled: t("finance.invoices.statusCancelledCap"),
    refunded: t("finance.invoices.statusRefundedCap"),
  };
  const METHOD_LABELS: Record<string, string> = {
    cash: t("finance.invoices.methodCash"),
    bank_transfer: t("finance.invoices.methodBank"),
    card: t("finance.invoices.methodCard"),
    cheque: t("finance.invoices.methodCheque"),
    online: t("finance.invoices.methodOnline"),
    other: t("finance.invoices.methodOther"),
  };
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
        <h1>{t("finance.invoices.title")}</h1>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={openCreate}>
          <Plus size={14} /> {t("finance.invoices.new")}
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">{t("finance.invoices.allStatuses")}</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_CAP_LABELS[s]}</option>)}
        </select>
        <input placeholder={t("finance.invoices.customerPh")} value={filters.customer_name} onChange={e => setFilters({ ...filters, customer_name: e.target.value })} />
        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <button className={styles.filterBtn} onClick={() => fetchInvoices()}>{t("finance.invoices.apply")}</button>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("finance.invoices.loading")}</div>
      ) : invoices.length === 0 ? (
        <div className={styles.loading}>{t("finance.invoices.empty")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("finance.invoices.colNum")}</th>
                <th>{t("finance.invoices.colCustomer")}</th>
                <th>{t("finance.invoices.colDate")}</th>
                <th>{t("finance.invoices.colDue")}</th>
                <th>{t("finance.invoices.colTotal")}</th>
                <th>{t("finance.invoices.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => openDetail(inv)}>
                  <td className={styles.invoiceNum}>{inv.invoiceNumber}</td>
                  <td>{inv.customerName}</td>
                  <td>{formatDate(inv.invoiceDate, lang)}</td>
                  <td>{formatDate(inv.dueDate, lang)}</td>
                  <td>{money(inv.total)}</td>
                  <td><span className={`${styles.statusBadge} ${statusColor(inv.status)}`}>{STATUS_LABELS[inv.status] || inv.status}</span></td>
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
            <h2>{t("finance.invoices.createTitle")}</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>{t("finance.invoices.fCustomerName")}</label>
                  <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>{t("finance.invoices.fCustomerContact")}</label>
                  <input value={form.customer_contact} onChange={e => setForm({ ...form, customer_contact: e.target.value })} placeholder={t("finance.invoices.contactPh")} />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>{t("finance.invoices.fInvoiceDate")}</label>
                  <input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>{t("finance.invoices.fDueDate")}</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>{t("finance.invoices.fNotes")}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className={styles.lineItemsSection}>
                <h3>{t("finance.invoices.lineItems")}</h3>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>{t("finance.invoices.liDescription")}</th>
                      <th style={{ width: "12%" }}>{t("finance.invoices.liQty")}</th>
                      <th style={{ width: "16%" }}>{t("finance.invoices.liUnitPrice")}</th>
                      <th style={{ width: "16%" }}>{t("finance.invoices.liTotal")}</th>
                      <th style={{ width: "20%" }}>{t("finance.invoices.liAccount")}</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.line_items.map((line, i) => (
                      <tr key={line.id}>
                        <td><input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder={t("finance.invoices.lineDescPh")} required /></td>
                        <td><input type="number" min="0" step="1" value={line.quantity || ""} onChange={e => updateLine(i, "quantity", e.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.unit_price || ""} onChange={e => updateLine(i, "unit_price", e.target.value)} /></td>
                        <td style={{ fontWeight: 600 }}>{money(line.quantity * line.unit_price)}</td>
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
                <button type="button" className={styles.addLineBtn} onClick={addLine}><Plus size={13} /> {t("finance.invoices.addLine")}</button>
              </div>

              <div style={{ textAlign: "right", marginTop: 12, fontSize: "0.875rem" }}>
                <div>{t("finance.invoices.subtotal")} <strong>{money(subtotal)}</strong></div>
                <div style={{ marginTop: 4 }}>
                  {t("finance.invoices.tax")} <input type="number" step="0.01" min="0" value={form.tax_amount || ""}
                    onChange={e => setForm({ ...form, tax_amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: 100, padding: "4px 8px", border: "1px solid var(--color-border)", borderRadius: 4, fontSize: "0.8125rem" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: "1rem" }}>{t("finance.invoices.totalLabel")} <strong>{money(total)}</strong></div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={closeCreate}>{t("finance.invoices.cancel")}</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || form.line_items.some(l => !l.description)}>
                  {actionLoading ? t("finance.invoices.creating") : t("finance.invoices.create")}
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
              <span className={styles.infoLabel}>{t("finance.invoices.infoStatus")}</span>
              <span className={styles.infoValue}>
                <span className={`${styles.statusBadge} ${statusColor(detailTarget.status)}`}>{STATUS_LABELS[detailTarget.status] || detailTarget.status}</span>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoCustomer")}</span>
              <span className={styles.infoValue}>{detailTarget.customerName}</span>
            </div>
            {detailTarget.customerContact && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.invoices.infoContact")}</span>
                <span className={styles.infoValue}>{detailTarget.customerContact}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoInvoiceDate")}</span>
              <span className={styles.infoValue}>{formatDate(detailTarget.invoiceDate, lang)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoDueDate")}</span>
              <span className={styles.infoValue}>{formatDate(detailTarget.dueDate, lang)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoSubtotal")}</span>
              <span className={styles.infoValue}>{money(detailTarget.subtotal)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoTax")}</span>
              <span className={styles.infoValue}>{money(detailTarget.taxAmount)}</span>
            </div>
            <div className={styles.infoRow} style={{ fontWeight: 700, fontSize: "1rem" }}>
              <span className={styles.infoLabel}>{t("finance.invoices.infoTotal")}</span>
              <span className={styles.infoValue}>{money(detailTarget.total)}</span>
            </div>
            {detailTarget.status === "paid" && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.invoices.infoPaid")}</span>
                <span className={styles.infoValue}>{money(detailTarget.paidAmount)} {t("finance.invoices.paidOn")} {formatDate(detailTarget.paidAt?.slice(0, 10), lang)} ({detailTarget.paymentMethod})</span>
              </div>
            )}
            {detailTarget.notes && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.invoices.infoNotes")}</span>
                <span className={styles.infoValue}>{detailTarget.notes}</span>
              </div>
            )}

            <div className={styles.sectionTitle}>{t("finance.invoices.detailLines")}</div>
            <table className={styles.detailLineTable}>
              <thead>
                <tr>
                  <th>{t("finance.invoices.liDescription")}</th>
                  <th>{t("finance.invoices.liQty")}</th>
                  <th>{t("finance.invoices.liUnitPrice")}</th>
                  <th>{t("finance.invoices.liTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.lineItems?.map((l: any) => (
                  <tr key={l.id}>
                    <td>{l.description}{l.accountName ? ` (${l.accountName})` : ""}</td>
                    <td>{l.quantity}</td>
                    <td>{money(l.unitPrice)}</td>
                    <td style={{ fontWeight: 600 }}>{money(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.actionsRow}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => downloadPdf(detailTarget)}>
                <Download size={14} /> {t("finance.invoices.pdf")}
              </button>

              {detailTarget.status === "draft" && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => setConfirmAction({ type: "issue", invoice: detailTarget })}>
                  <ArrowUpRight size={14} /> {t("finance.invoices.issue")}
                </button>
              )}
              {(detailTarget.status === "issued" || detailTarget.status === "overdue") && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => {
                  setPayModal(detailTarget);
                  setPayForm({ amount: detailTarget.total - detailTarget.paidAmount, method: "bank_transfer", date: new Date().toISOString().split("T")[0], reference: "" });
                }}>
                  <DollarSign size={14} /> {t("finance.invoices.recordPayment")}
                </button>
              )}
              {(detailTarget.status === "draft" || detailTarget.status === "issued") && (
                <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => setConfirmAction({ type: "cancel", invoice: detailTarget })}>
                  <Ban size={14} /> {t("finance.invoices.cancelBtn")}
                </button>
              )}
              {detailTarget.status === "paid" && (
                <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => setConfirmAction({ type: "refund", invoice: detailTarget })}>
                  <RotateCcw size={14} /> {t("finance.invoices.refund")}
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
            <h3>{confirmAction.type === "issue" ? t("finance.invoices.confirmIssueTitle") : confirmAction.type === "cancel" ? t("finance.invoices.confirmCancelTitle") : t("finance.invoices.confirmRefundTitle")}</h3>
            <p>
              {confirmAction.type === "issue" && <>{t("finance.invoices.confirmIssuePre")} {confirmAction.invoice.invoiceNumber} {t("finance.invoices.confirmIssueSuf")}</>}
              {confirmAction.type === "cancel" && <>{t("finance.invoices.confirmCancelPre")} {confirmAction.invoice.invoiceNumber}?</>}
              {confirmAction.type === "refund" && <>{t("finance.invoices.confirmRefundPre")} {confirmAction.invoice.invoiceNumber}{t("finance.invoices.confirmRefundSuf")}</>}
            </p>
            <div className={styles.confirmActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setConfirmAction(null)}>{t("finance.invoices.cancel")}</button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? t("finance.invoices.processing") : <>{t("finance.invoices.confirmYesPre")} {confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className={styles.overlay} onClick={() => setPayModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>{t("finance.invoices.payTitle")}</h2>
            <form onSubmit={handlePay}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.invoices.payInvoice")}</span>
                <span className={styles.infoValue}>{payModal.invoiceNumber}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.invoices.payOutstanding")}</span>
                <span className={styles.infoValue}>{money(payModal.total - payModal.paidAmount)}</span>
              </div>
              <div className={styles.field}>
                <label>{t("finance.invoices.payAmount")}</label>
                <input type="number" step="0.01" min="0" value={payForm.amount || ""} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className={styles.field}>
                <label>{t("finance.invoices.payMethod")}</label>
                <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                  {["cash", "bank_transfer", "card", "cheque", "online", "other"].map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>{t("finance.invoices.payDate")}</label>
                <input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>{t("finance.invoices.payReference")}</label>
                <input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder={t("finance.invoices.payRefPh")} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setPayModal(null)}>{t("finance.invoices.cancel")}</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || !payForm.amount}>
                  {actionLoading ? t("finance.invoices.recording") : t("finance.invoices.paySubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
