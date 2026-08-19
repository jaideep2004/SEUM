"use client";
import { useState, useEffect } from "react";
import { Plus, X, CheckCircle, DollarSign, Upload } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORIES = ["fuel","maintenance","salary","tolls","parking","permits","insurance","utilities","office","other"];

const STATUS_STYLES: Record<string, string> = {
  pending: styles.statusPending, approved: styles.statusApproved, reimbursed: styles.statusReimbursed,
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; expense: any } | null>(null);
  const [filters, setFilters] = useState({ expense_category: "", status: "", start_date: "", end_date: "" });
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const [form, setForm] = useState({
    expense_category: "fuel", amount: 0, description: "", date: new Date().toISOString().split("T")[0],
    bus_id: "", driver_id: "", paid_by: "",
  });

  async function fetchExpenses(page = 1) {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.expense_category) params.set("expense_category", filters.expense_category);
    if (filters.status) params.set("status", filters.status);
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    try {
      const res = await fetch(`${API}/accounting/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) { setExpenses(d.data); setMeta(d.meta); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchExpenses(); }, []);

  useEffect(() => {
    (async () => {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      try {
        const [b, d] = await Promise.all([
          fetch(`${API}/fleet/buses?page=1&pageSize=100`, { headers }).then(r => r.json()),
          fetch(`${API}/drivers?page=1&pageSize=100`, { headers }).then(r => r.json()),
        ]);
        if (b.success) setBuses((b.data || []).sort((x: any, y: any) => x.plateNumber.localeCompare(y.plateNumber)));
        if (d.success) setDrivers(d.data || []);
      } catch {}
    })();
  }, []);

  function openCreate() {
    setForm({
      expense_category: "fuel", amount: 0, description: "",
      date: new Date().toISOString().split("T")[0],
      bus_id: "", driver_id: "", paid_by: "",
    });
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/expenses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_category: form.expense_category,
          amount: form.amount,
          description: form.description || undefined,
          date: form.date,
          bus_id: form.bus_id || undefined,
          driver_id: form.driver_id || undefined,
        }),
      });
      const d = await res.json();
      if (d.success) { setCreateOpen(false); fetchExpenses(); }
    } catch {}
    setActionLoading(false);
  }

  async function openDetail(exp: any) {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/expenses/${exp.id}`, {
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
    const { type, expense } = confirmAction;
    const endpoint = `${API}/accounting/expenses/${expense.id}/${type}`;
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        setConfirmAction(null);
        setDetailTarget(d.data);
        fetchExpenses();
      }
    } catch {}
    setActionLoading(false);
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !detailTarget) return;
    setActionLoading(true);
    const token = getToken();
    const fd = new FormData();
    fd.append("receipt", file);
    try {
      const res = await fetch(`${API}/accounting/expenses/${detailTarget.id}/receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await res.json();
      if (d.success) { setDetailTarget(d.data); fetchExpenses(); }
    } catch {}
    setActionLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Expenses</h1>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={openCreate}>
          <Plus size={14} /> Record Expense
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filters.expense_category} onChange={e => setFilters({ ...filters, expense_category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="reimbursed">Reimbursed</option>
        </select>
        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <button className={styles.filterBtn} onClick={() => fetchExpenses()}>Apply</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className={styles.loading}>No expenses found</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Bus</th>
                <th>Driver</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id} onClick={() => openDetail(exp)}>
                  <td>{exp.date}</td>
                  <td><span className={styles.catBadge}>{exp.expenseCategory}</span></td>
                  <td>{exp.description || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                  <td>{exp.busPlate || "—"}</td>
                  <td>{exp.driverName || "—"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${STATUS_STYLES[exp.status] || ""}`}>{exp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className={styles.overlay} onClick={() => setCreateOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Record Expense</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Category *</label>
                  <select value={form.expense_category} onChange={e => setForm({ ...form, expense_category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Amount *</label>
                  <input type="number" step="0.01" min="0.01" value={form.amount || ""} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Bus</label>
                  <select value={form.bus_id} onChange={e => setForm({ ...form, bus_id: e.target.value })}>
                    <option value="">None</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Driver</label>
                  <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}>
                    <option value="">None</option>
                    {drivers.map(dv => <option key={dv.id} value={dv.id}>{dv.name}{dv.employeeCode ? ` (${dv.employeeCode})` : ""}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || !form.amount}>
                  {actionLoading ? "Saving..." : "Record Expense"}
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
              <h2>{detailTarget.expenseCategory} — {formatCurrency(detailTarget.amount)}</h2>
              <button className={styles.closeBtn} onClick={() => setDetailTarget(null)}><X size={18} /></button>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Category</span>
              <span className={styles.infoValue}><span className={styles.catBadge}>{detailTarget.expenseCategory}</span></span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Amount</span>
              <span className={styles.infoValue} style={{ fontWeight: 700 }}>{formatCurrency(detailTarget.amount)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>{detailTarget.date}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>
                <span className={`${styles.statusBadge} ${STATUS_STYLES[detailTarget.status] || ""}`}>{detailTarget.status}</span>
              </span>
            </div>
            {detailTarget.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Description</span>
                <span className={styles.infoValue}>{detailTarget.description}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Bus</span>
              <span className={styles.infoValue}>{detailTarget.busPlate || detailTarget.busId?.slice(0, 8) || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Driver</span>
              <span className={styles.infoValue}>{detailTarget.driverName || detailTarget.driverId?.slice(0, 8) || "—"}</span>
            </div>
            {detailTarget.paidByName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Paid By</span>
                <span className={styles.infoValue}>{detailTarget.paidByName}</span>
              </div>
            )}
            {detailTarget.approvedByName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Approved By</span>
                <span className={styles.infoValue}>{detailTarget.approvedByName}</span>
              </div>
            )}

            {/* Receipt */}
            <div style={{ marginTop: 16 }}>
              <span className={styles.infoLabel}>Receipt</span>
              {detailTarget.receiptUrl ? (
                <img src={detailTarget.receiptUrl} alt="Receipt" className={styles.receiptImg} />
              ) : (
                <div style={{ marginTop: 8 }}>
                  <label className={`${styles.actionBtn} ${styles.secondaryBtn}`} style={{ cursor: "pointer" }}>
                    <Upload size={14} /> Upload Receipt
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleReceiptUpload} />
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.actionsRow}>
              {detailTarget.status === "pending" && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => setConfirmAction({ type: "approve", expense: detailTarget })}>
                  <CheckCircle size={14} /> Approve
                </button>
              )}
              {detailTarget.status === "approved" && (
                <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => setConfirmAction({ type: "reimburse", expense: detailTarget })}>
                  <DollarSign size={14} /> Reimburse
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
            <h3>{confirmAction.type === "approve" ? "Approve Expense" : "Reimburse Expense"}</h3>
            <p>
              {confirmAction.type === "approve" && `Approve ${confirmAction.expense.expenseCategory} expense of ${formatCurrency(confirmAction.expense.amount)}?`}
              {confirmAction.type === "reimburse" && `Mark ${confirmAction.expense.expenseCategory} expense of ${formatCurrency(confirmAction.expense.amount)} as reimbursed?`}
            </p>
            <div className={styles.confirmActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
