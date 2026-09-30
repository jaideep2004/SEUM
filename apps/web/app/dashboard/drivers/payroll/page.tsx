"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, List, Plus, DollarSign, Eye, CheckCircle, CreditCard, Printer } from "lucide-react";
import { useLanguage, formatDate, formatDateTime, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  draft: "#f59e0b", approved: "#059669", paid: "#3b82f6",
};

const STATUS_KEYS: Record<string, string> = {
  draft: "drivers.payroll.st.draft", approved: "drivers.payroll.st.approved", paid: "drivers.payroll.st.paid",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function DriverPayrollPage() {
  const { lang, t } = useLanguage();
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
      {t(STATUS_KEYS[s] || s)}
    </span>
  );

  const money = (n: number) => formatCurrency(n, lang);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> {t("common.back")}</Link>
          <h1>{t("drivers.payroll.title")}</h1>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}>
          <List size={14} /> {t("drivers.payroll.tabRecords")}
        </button>
        <button className={`${styles.tab} ${activeTab === "generate" ? styles.tabActive : ""}`} onClick={() => setActiveTab("generate")}>
          <Plus size={14} /> {t("drivers.payroll.tabGenerate")}
        </button>
      </div>

      {/* ==================== LIST TAB ==================== */}
      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">{t("drivers.list.allStatus")}</option>
              <option value="draft">{t("drivers.payroll.optDraft")}</option>
              <option value="approved">{t("drivers.payroll.optApproved")}</option>
              <option value="paid">{t("drivers.payroll.optPaid")}</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.loading}>{t("drivers.payroll.loading")}</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>{t("drivers.payroll.empty")}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("drivers.attendance.colDriver")}</th>
                    <th>{t("drivers.payroll.colPeriod")}</th>
                    <th>{t("drivers.payroll.colBase")}</th>
                    <th>{t("drivers.payroll.colTripAllow")}</th>
                    <th>{t("drivers.payroll.colOvertime")}</th>
                    <th>{t("drivers.payroll.colDeductions")}</th>
                    <th>{t("drivers.payroll.colTotal")}</th>
                    <th>{t("drivers.attendance.colStatus")}</th>
                    <th>{t("drivers.attendance.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.driverName || t("drivers.common.unknown")}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.employeeCode || ""}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{formatDate(r.periodStart, lang)} – {formatDate(r.periodEnd, lang)}</td>
                      <td>{money(r.baseSalary)}</td>
                      <td>{money(r.tripAllowance)}</td>
                      <td>{money(r.overtimePay)}</td>
                      <td style={{ color: "#dc2626" }}>{money(r.deductions)}</td>
                      <td style={{ fontWeight: 700 }}>{money(r.totalPayable)}</td>
                      <td>{badge(r.status)}</td>
                      <td>
                        <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(r)}>
                          <Eye size={12} /> {t("common.view")}
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
              <label>{t("drivers.payroll.formPeriodStart")}</label>
              <input type="date" value={genForm.period_start}
                onChange={e => setGenForm({ ...genForm, period_start: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.payroll.formPeriodEnd")}</label>
              <input type="date" value={genForm.period_end}
                onChange={e => setGenForm({ ...genForm, period_end: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.payroll.formTripRate")}</label>
              <input type="number" min="1" value={genForm.trip_rate}
                onChange={e => setGenForm({ ...genForm, trip_rate: parseInt(e.target.value) || 25 })} />
            </div>
            <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "generate"}>
              {actionLoading === "generate" ? t("drivers.payroll.generating") : t("drivers.payroll.generateBtn")}
            </button>
          </form>

          {preview && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("drivers.attendance.colDriver")}</th>
                      <th>{t("drivers.payroll.colTrips")}</th>
                      <th>{t("drivers.payroll.colBase")}</th>
                      <th>{t("drivers.payroll.colTripAllow")}</th>
                      <th>{t("drivers.payroll.colOvertimePay")}</th>
                      <th>{t("drivers.payroll.colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.records?.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.driverName || r.employeeCode}</span>
                        </td>
                        <td>{r.tripCount}</td>
                        <td>{money(r.baseSalary)}</td>
                        <td>{money(r.tripAllowance)}</td>
                        <td>{money(r.overtimePay)}</td>
                        <td style={{ fontWeight: 700 }}>{money(r.totalPayable)}</td>
                      </tr>
                    ))}
                    {preview.totals && (
                      <tr className={styles.totalsRow}>
                        <td colSpan={2}>{preview.totals.driverCount} {t("drivers.payroll.driversWord")}</td>
                        <td>{money(preview.totals.totalBaseSalary)}</td>
                        <td>{money(preview.totals.totalTripAllowance)}</td>
                        <td>{money(preview.totals.totalOvertimePay)}</td>
                        <td style={{ fontSize: 15 }}>{money(preview.totals.totalPayable)}</td>
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
            <h2>{t("drivers.payroll.detailTitlePre")} {detailModal.driverName || t("drivers.attendance.colDriver")}</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colPeriod")}</div>
                <div className={styles.detailValue}>{formatDate(detailModal.periodStart, lang)} – {formatDate(detailModal.periodEnd, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.attendance.colStatus")}</div>
                <div className={styles.detailValue}>{badge(detailModal.status)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colBase")}</div>
                <div className={styles.detailValue}>{money(detailModal.baseSalary)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colTripAllow")}</div>
                <div className={styles.detailValue}>{money(detailModal.tripAllowance)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colOvertimePay")}</div>
                <div className={styles.detailValue}>{money(detailModal.overtimePay)} ({detailModal.overtimeHours}h × {money(detailModal.overtimeRate)}/h)</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.dBonuses")}</div>
                <div className={styles.detailValue}>{money(detailModal.bonuses)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colDeductions")}</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>{money(detailModal.deductions)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("drivers.payroll.colTotal")}</div>
                <div className={styles.detailValue} style={{ fontSize: 18, color: "#059669" }}>{money(detailModal.totalPayable)}</div>
              </div>
              {detailModal.paymentReference && (
                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.detailLabel}>{t("drivers.payroll.dPaymentRef")}</div>
                  <div className={styles.detailValue}>{detailModal.paymentReference}</div>
                </div>
              )}
              {detailModal.paidAt && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>{t("drivers.payroll.dPaidAt")}</div>
                  <div className={styles.detailValue}>{formatDateTime(detailModal.paidAt, lang)}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t("drivers.payroll.payslipTitle")}</h3>
              <div className={styles.payslip}>
                <h2 style={{ color: "#111" }}>{t("drivers.payroll.payslipHeader")}</h2>
                <table className={styles.payslipTable}>
                  <tbody>
                    <tr><td>{t("drivers.attendance.colDriver")}</td><td>{detailModal.driverName || "—"}</td></tr>
                    <tr><td>{t("drivers.payroll.colPeriod")}</td><td>{formatDate(detailModal.periodStart, lang)} – {formatDate(detailModal.periodEnd, lang)}</td></tr>
                    <tr><td>{t("drivers.payroll.colBase")}</td><td>{money(detailModal.baseSalary)}</td></tr>
                    <tr><td>{t("drivers.payroll.colTripAllow")}</td><td>{money(detailModal.tripAllowance)}</td></tr>
                    <tr><td>{t("drivers.payroll.colOvertimePay")}</td><td>{money(detailModal.overtimePay)}</td></tr>
                    <tr><td>{t("drivers.payroll.dBonuses")}</td><td>{money(detailModal.bonuses)}</td></tr>
                    <tr><td>{t("drivers.payroll.colDeductions")}</td><td style={{ color: "#dc2626" }}>-{money(detailModal.deductions)}</td></tr>
                    <tr style={{ fontWeight: 700, borderTop: "2px solid #333" }}><td>{t("drivers.payroll.payslipNet")}</td><td>{money(detailModal.totalPayable)}</td></tr>
                  </tbody>
                </table>
                <div className={styles.payslipActions}>
                  <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => window.print()}>
                    <Printer size={12} /> {t("common.print")}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              {detailModal.status === "draft" && (
                <button className={`${styles.actionBtn} ${styles.approveBtn}`}
                  onClick={() => handleApprove(detailModal.id)}
                  disabled={actionLoading === detailModal.id}>
                  <CheckCircle size={12} /> {t("common.approve")}
                </button>
              )}
              {detailModal.status !== "paid" && (
                <button className={`${styles.actionBtn} ${styles.payBtn}`}
                  onClick={() => { setPayModal(detailModal.id); }}>
                  <CreditCard size={12} /> {t("drivers.payroll.markPaid")}
                </button>
              )}
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(null)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAY MODAL ==================== */}
      {payModal && (
        <div className={styles.overlay} onClick={() => setPayModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{t("drivers.payroll.payTitle")}</h2>
            <div className={styles.field}>
              <label>{t("drivers.payroll.payRefLabel")}</label>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder={t("drivers.payroll.phPayRef")} />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setPayModal(null)}>{t("common.cancel")}</button>
              <button className={`${styles.actionBtn} ${styles.successBtn}`}
                onClick={() => handlePay(payModal)}
                disabled={!payRef.trim() || actionLoading === payModal}>
                {t("drivers.payroll.payTitle")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
