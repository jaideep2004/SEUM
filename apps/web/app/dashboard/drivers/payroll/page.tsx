"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, List, Plus, DollarSign, Eye, CheckCircle, CreditCard, Printer } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  draft: "#f59e0b", approved: "#059669", paid: "#3b82f6",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DriverPayrollPage() {
  const [activeTab, setActiveTab] = useState<"list" | "generate">("list");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [detailModal, setDetailModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Generate form
  const [genForm, setGenForm] = useState({
    period_start: "", period_end: "", trip_rate: 25,
  });
  const [preview, setPreview] = useState<any>(null);

  async function fetchRecords() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      let url = `${API}/drivers/payroll?pageSize=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setRecords(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchRecords(); }, [activeTab, statusFilter]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("generate");
    const token = getToken();
    try {
      const res = await fetch(`${API}/drivers/payroll/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      }
    } catch {}
    setActionLoading(null);
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/payroll/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords();
      setDetailModal((prev: any) => prev?.id === id ? { ...prev, status: "approved" } : prev);
    } catch {}
    setActionLoading(null);
  }

  async function handlePay(id: string) {
    if (!payRef.trim()) return;
    setActionLoading(id);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/payroll/${id}/pay`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_reference: payRef }),
      });
      setPayModal(null);
      setPayRef("");
      fetchRecords();
      setDetailModal(null);
    } catch {}
    setActionLoading(null);
  }

  const badge = (s: string) => (
    <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[s] || "#6b7280") + "20", color: STATUS_COLORS[s] || "#6b7280" }}>
      {s}
    </span>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back</Link>
          <h1>Driver Payroll</h1>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}>
          <List size={14} /> Payroll Records
        </button>
        <button className={`${styles.tab} ${activeTab === "generate" ? styles.tabActive : ""}`} onClick={() => setActiveTab("generate")}>
          <Plus size={14} /> Generate
        </button>
      </div>

      {/* ==================== LIST TAB ==================== */}
      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading payroll records...</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No payroll records found</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Period</th>
                    <th>Base Salary</th>
                    <th>Trip Allowance</th>
                    <th>Overtime</th>
                    <th>Deductions</th>
                    <th>Total Payable</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.driverName || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.employeeCode || ""}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.periodStart?.slice(5)} – {r.periodEnd?.slice(5)}</td>
                      <td>${fmt(r.baseSalary)}</td>
                      <td>${fmt(r.tripAllowance)}</td>
                      <td>${fmt(r.overtimePay)}</td>
                      <td style={{ color: "#dc2626" }}>${fmt(r.deductions)}</td>
                      <td style={{ fontWeight: 700 }}>${fmt(r.totalPayable)}</td>
                      <td>{badge(r.status)}</td>
                      <td>
                        <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(r)}>
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ==================== GENERATE TAB ==================== */}
      {activeTab === "generate" && (
        <div>
          <form className={styles.form} onSubmit={handleGenerate}>
            <div className={styles.field}>
              <label>Period Start</label>
              <input type="date" value={genForm.period_start}
                onChange={e => setGenForm({ ...genForm, period_start: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>Period End</label>
              <input type="date" value={genForm.period_end}
                onChange={e => setGenForm({ ...genForm, period_end: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>Trip Rate ($ per completed trip)</label>
              <input type="number" min="1" value={genForm.trip_rate}
                onChange={e => setGenForm({ ...genForm, trip_rate: parseInt(e.target.value) || 25 })} />
            </div>
            <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "generate"}>
              {actionLoading === "generate" ? "Generating..." : "Preview & Generate"}
            </button>
          </form>

          {preview && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Trips</th>
                      <th>Base Salary</th>
                      <th>Trip Allowance</th>
                      <th>Overtime Pay</th>
                      <th>Total Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.records?.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.driverName || r.employeeCode}</span>
                        </td>
                        <td>{r.tripCount}</td>
                        <td>${fmt(r.baseSalary)}</td>
                        <td>${fmt(r.tripAllowance)}</td>
                        <td>${fmt(r.overtimePay)}</td>
                        <td style={{ fontWeight: 700 }}>${fmt(r.totalPayable)}</td>
                      </tr>
                    ))}
                    {preview.totals && (
                      <tr className={styles.totalsRow}>
                        <td colSpan={2}>{preview.totals.driverCount} drivers</td>
                        <td>${fmt(preview.totals.totalBaseSalary)}</td>
                        <td>${fmt(preview.totals.totalTripAllowance)}</td>
                        <td>${fmt(preview.totals.totalOvertimePay)}</td>
                        <td style={{ fontSize: 15 }}>${fmt(preview.totals.totalPayable)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {detailModal && (
        <div className={styles.overlay} onClick={() => setDetailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <h2>Payroll Detail — {detailModal.driverName || "Driver"}</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Period</div>
                <div className={styles.detailValue}>{detailModal.periodStart} – {detailModal.periodEnd}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Status</div>
                <div className={styles.detailValue}>{badge(detailModal.status)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Base Salary</div>
                <div className={styles.detailValue}>${fmt(detailModal.baseSalary)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Trip Allowance</div>
                <div className={styles.detailValue}>${fmt(detailModal.tripAllowance)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Overtime Pay</div>
                <div className={styles.detailValue}>${fmt(detailModal.overtimePay)} ({detailModal.overtimeHours}h × ${fmt(detailModal.overtimeRate)}/h)</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Bonuses</div>
                <div className={styles.detailValue}>${fmt(detailModal.bonuses)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Deductions</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>${fmt(detailModal.deductions)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Total Payable</div>
                <div className={styles.detailValue} style={{ fontSize: 18, color: "#059669" }}>${fmt(detailModal.totalPayable)}</div>
              </div>
              {detailModal.paymentReference && (
                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.detailLabel}>Payment Ref</div>
                  <div className={styles.detailValue}>{detailModal.paymentReference}</div>
                </div>
              )}
              {detailModal.paidAt && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Paid At</div>
                  <div className={styles.detailValue}>{new Date(detailModal.paidAt).toLocaleString()}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Payslip Preview</h3>
              <div className={styles.payslip}>
                <h2 style={{ color: "#111" }}>PAYSLIP</h2>
                <table className={styles.payslipTable}>
                  <tbody>
                    <tr><td>Driver</td><td>{detailModal.driverName || "—"}</td></tr>
                    <tr><td>Period</td><td>{detailModal.periodStart} – {detailModal.periodEnd}</td></tr>
                    <tr><td>Base Salary</td><td>${fmt(detailModal.baseSalary)}</td></tr>
                    <tr><td>Trip Allowance</td><td>${fmt(detailModal.tripAllowance)}</td></tr>
                    <tr><td>Overtime Pay</td><td>${fmt(detailModal.overtimePay)}</td></tr>
                    <tr><td>Bonuses</td><td>${fmt(detailModal.bonuses)}</td></tr>
                    <tr><td>Deductions</td><td style={{ color: "#dc2626" }}>-${fmt(detailModal.deductions)}</td></tr>
                    <tr style={{ fontWeight: 700, borderTop: "2px solid #333" }}><td>NET PAYABLE</td><td>${fmt(detailModal.totalPayable)}</td></tr>
                  </tbody>
                </table>
                <div className={styles.payslipActions}>
                  <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => window.print()}>
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              {detailModal.status === "draft" && (
                <button className={`${styles.actionBtn} ${styles.approveBtn}`}
                  onClick={() => handleApprove(detailModal.id)}
                  disabled={actionLoading === detailModal.id}>
                  <CheckCircle size={12} /> Approve
                </button>
              )}
              {detailModal.status !== "paid" && (
                <button className={`${styles.actionBtn} ${styles.payBtn}`}
                  onClick={() => { setPayModal(detailModal.id); }}>
                  <CreditCard size={12} /> Mark Paid
                </button>
              )}
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAY MODAL ==================== */}
      {payModal && (
        <div className={styles.overlay} onClick={() => setPayModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Confirm Payment</h2>
            <div className={styles.field}>
              <label>Payment Reference</label>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TRANS-001, bank ref" />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setPayModal(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.successBtn}`}
                onClick={() => handlePay(payModal)}
                disabled={!payRef.trim() || actionLoading === payModal}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
