"use client";
import { useState, useEffect } from "react";
import { List, Plus, DollarSign, Eye, CheckCircle, CreditCard, Printer, Briefcase, Save, AlertTriangle } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  draft: "#f59e0b", approved: "#059669", paid: "#3b82f6",
};

const STATUS_KEYS: Record<string, string> = {
  draft: "hr.payroll.stDraft",
  approved: "hr.payroll.stApproved",
  paid: "hr.payroll.stPaid",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function EmployeePayrollPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"records" | "generate" | "structure">("records");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const [detailModal, setDetailModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Generate
  const [genForm, setGenForm] = useState({ period_start: monthStart(), period_end: todayStr() });
  const [preview, setPreview] = useState<any>(null);

  // Salary structure
  const [roster, setRoster] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [structureForm, setStructureForm] = useState({
    basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowances: 0,
    insurance_deduction: 0, loan_deduction: 0, penalty_deductions: 0, effective_from: "",
  });
  const [structureSaved, setStructureSaved] = useState<string | null>(null);
  const [structureError, setStructureError] = useState("");

  async function fetchRecords() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100", period_start: periodStart, period_end: periodEnd });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API}/hr/payroll?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setRecords(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "records") fetchRecords(); }, [activeTab, statusFilter, periodStart, periodEnd]);

  useEffect(() => {
    const token = getToken();
    if (!token || activeTab !== "structure") return;
    fetch(`${API}/hr/employees?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setRoster(d.data || []); })
      .catch(() => {});
  }, [activeTab]);

  async function loadStructure(employeeId: string) {
    setStructureSaved(null);
    setStructureError("");
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/hr/payroll/salary-structures?employee_id=${employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const s = data.data[0];
        setStructureForm({
          basic_salary: s.basicSalary, housing_allowance: s.housingAllowance, transport_allowance: s.transportAllowance,
          other_allowances: s.otherAllowances, insurance_deduction: s.insuranceDeduction,
          loan_deduction: s.loanDeduction, penalty_deductions: s.penaltyDeductions, effective_from: s.effectiveFrom || "",
        });
      } else {
        setStructureForm({ basic_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowances: 0, insurance_deduction: 0, loan_deduction: 0, penalty_deductions: 0, effective_from: "" });
      }
    } catch {}
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("generate");
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/payroll/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (data.success) setPreview(data.data);
    } catch {}
    setActionLoading(null);
  }

  async function handleSaveStructure(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setActionLoading("structure");
    setStructureSaved(null);
    setStructureError("");
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/payroll/salary-structures`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...structureForm, employee_id: selectedEmployee }),
      });
      const data = await res.json();
      if (data.success) setStructureSaved(t("hr.payroll.structSaved"));
      else setStructureError(data.error?.message || t("hr.common.failedSave"));
    } catch { setStructureError(t("hr.common.networkError")); }
    setActionLoading(null);
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      await fetch(`${API}/hr/payroll/${id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
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
      await fetch(`${API}/hr/payroll/${id}/pay`, {
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

  const structTotal =
    structureForm.basic_salary + structureForm.housing_allowance + structureForm.transport_allowance + structureForm.other_allowances
    - structureForm.insurance_deduction - structureForm.loan_deduction - structureForm.penalty_deductions;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>{t("hr.payroll.title")}</h1>
          <p className={styles.pageDesc}>{t("hr.payroll.desc")}</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "records" ? styles.tabActive : ""}`} onClick={() => setActiveTab("records")}>
          <List size={14} /> {t("hr.payroll.tabRecords")}
        </button>
        <button className={`${styles.tab} ${activeTab === "generate" ? styles.tabActive : ""}`} onClick={() => setActiveTab("generate")}>
          <Plus size={14} /> {t("hr.payroll.tabGenerate")}
        </button>
        <button className={`${styles.tab} ${activeTab === "structure" ? styles.tabActive : ""}`} onClick={() => setActiveTab("structure")}>
          <Briefcase size={14} /> {t("hr.payroll.tabStructure")}
        </button>
      </div>

      {/* ═══════════ RECORDS TAB ═══════════ */}
      {activeTab === "records" && (
        <>
          <div className={styles.filters}>
            <div className={styles.filterItem}>
              <label>{t("hr.payroll.fPeriodFrom")}</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("hr.payroll.fPeriodTo")}</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("hr.payroll.fStatus")}</label>
              <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">{t("hr.payroll.allStatus")}</option>
                <option value="draft">{t("hr.payroll.optDraft")}</option>
                <option value="approved">{t("hr.payroll.optApproved")}</option>
                <option value="paid">{t("hr.payroll.optPaid")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>{t("hr.payroll.loading")}</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>{t("hr.payroll.empty")}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("hr.payroll.colEmployee")}</th>
                    <th>{t("hr.payroll.colPeriod")}</th>
                    <th>{t("hr.payroll.colBasic")}</th>
                    <th>{t("hr.payroll.colAllow")}</th>
                    <th>{t("hr.payroll.colDeduct")}</th>
                    <th>{t("hr.payroll.colTotal")}</th>
                    <th>{t("hr.payroll.colStatus")}</th>
                    <th>{t("hr.payroll.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name || t("hr.common.unknown")}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.employeeCode || ""} · {r.department?.replace("_", " ") || ""}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.periodStart?.slice(5)} – {r.periodEnd?.slice(5)}</td>
                      <td>{formatCurrency(r.basicSalary, lang)}</td>
                      <td>{formatCurrency(r.totalAllowances, lang)}</td>
                      <td style={{ color: "#dc2626" }}>{formatCurrency(r.totalDeductions, lang)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(r.totalPayable, lang)}</td>
                      <td>{badge(r.status)}</td>
                      <td>
                        <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(r)}>
                          <Eye size={12} /> {t("hr.payroll.view")}
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

      {/* ═══════════ GENERATE TAB ═══════════ */}
      {activeTab === "generate" && (
        <div>
          <form className={styles.form} onSubmit={handleGenerate}>
            <h3 className={styles.formTitle}>{t("hr.payroll.genTitle")}</h3>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>{t("hr.payroll.genPeriodStart")}</label>
                <input type="date" value={genForm.period_start}
                  onChange={e => setGenForm({ ...genForm, period_start: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>{t("hr.payroll.genPeriodEnd")}</label>
                <input type="date" value={genForm.period_end}
                  onChange={e => setGenForm({ ...genForm, period_end: e.target.value })} required />
              </div>
            </div>
            <p className={styles.formHint}>{t("hr.payroll.genHint")}</p>
            <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "generate"}>
              {actionLoading === "generate" ? t("hr.payroll.generating") : t("hr.payroll.generate")}
            </button>
          </form>

          {preview && (
            <div style={{ marginTop: 24 }}>
              {preview.skipped?.length > 0 && (
                <div className={styles.warningBanner}>
                  <AlertTriangle size={14} />
                  <span>{formatNumber(preview.skipped.length, lang)} {t("hr.payroll.skippedMid")} {preview.skipped.map((s: any) => s.name || s.employeeCode).join(", ")}</span>
                </div>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("hr.payroll.colEmployee")}</th>
                      <th>{t("hr.payroll.colBasic")}</th>
                      <th>{t("hr.payroll.colAllow")}</th>
                      <th>{t("hr.payroll.colDeduct")}</th>
                      <th>{t("hr.payroll.colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.records?.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.name || r.employeeCode}</span>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.department?.replace("_", " ") || ""}</div>
                        </td>
                        <td>{formatCurrency(r.basicSalary, lang)}</td>
                        <td>{formatCurrency(r.totalAllowances, lang)}</td>
                        <td style={{ color: "#dc2626" }}>{formatCurrency(r.totalDeductions, lang)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(r.totalPayable, lang)}</td>
                      </tr>
                    ))}
                    {preview.totals && (
                      <tr className={styles.totalsRow}>
                        <td>{formatNumber(preview.totals.employeeCount, lang)} {t("hr.payroll.employeesWord")}</td>
                        <td>{formatCurrency(preview.totals.totalBasicSalary, lang)}</td>
                        <td>{formatCurrency(preview.totals.totalAllowances, lang)}</td>
                        <td style={{ color: "#dc2626" }}>{formatCurrency(preview.totals.totalDeductions, lang)}</td>
                        <td style={{ fontSize: 15 }}>{formatCurrency(preview.totals.totalPayable, lang)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SALARY STRUCTURE TAB ═══════════ */}
      {activeTab === "structure" && (
        <div className={styles.structWrap}>
          <div className={styles.field}>
            <label>{t("hr.payroll.structEmployee")}</label>
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); if (e.target.value) loadStructure(e.target.value); }}>
              <option value="">{t("hr.payroll.structSelect")}</option>
              {roster.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode || t("hr.common.noCode")})</option>)}
            </select>
          </div>

          {selectedEmployee && (
            <form className={styles.form} onSubmit={handleSaveStructure} style={{ marginTop: 16 }}>
              {structureSaved && <div className={styles.successBanner}><CheckCircle size={14} /> {structureSaved}</div>}
              {structureError && <div className={styles.errorBanner}>{structureError}</div>}
              <h3 className={styles.formTitle}>{t("hr.payroll.secAllow")}</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fBasic")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.basic_salary}
                    onChange={e => setStructureForm({ ...structureForm, basic_salary: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fHousing")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.housing_allowance}
                    onChange={e => setStructureForm({ ...structureForm, housing_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fTransport")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.transport_allowance}
                    onChange={e => setStructureForm({ ...structureForm, transport_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fOtherAllow")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.other_allowances}
                    onChange={e => setStructureForm({ ...structureForm, other_allowances: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <h3 className={styles.formTitle}>{t("hr.payroll.secDeduct")}</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fInsurance")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.insurance_deduction}
                    onChange={e => setStructureForm({ ...structureForm, insurance_deduction: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fLoans")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.loan_deduction}
                    onChange={e => setStructureForm({ ...structureForm, loan_deduction: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fPenalties")}</label>
                  <input type="number" min="0" step="0.01" value={structureForm.penalty_deductions}
                    onChange={e => setStructureForm({ ...structureForm, penalty_deductions: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>{t("hr.payroll.fEffective")}</label>
                  <input type="date" value={structureForm.effective_from}
                    onChange={e => setStructureForm({ ...structureForm, effective_from: e.target.value })} />
                </div>
              </div>
              <div className={styles.structTotal}>
                <span>{t("hr.payroll.netLabel")} </span>
                <strong>{formatCurrency(structTotal, lang)}</strong>
                <small> = {formatCurrency(structureForm.basic_salary + structureForm.housing_allowance + structureForm.transport_allowance + structureForm.other_allowances, lang)} − {formatCurrency(structureForm.insurance_deduction + structureForm.loan_deduction + structureForm.penalty_deductions, lang)}</small>
              </div>
              <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "structure"}>
                <Save size={12} /> {actionLoading === "structure" ? t("hr.payroll.saving") : t("hr.payroll.saveStruct")}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      {detailModal && (
        <div className={styles.overlay} onClick={() => setDetailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <h2>{t("hr.payroll.detailTitlePre")} {detailModal.name || t("hr.payroll.slipEmployee")}</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dPeriod")}</div>
                <div className={styles.detailValue}>{formatDate(detailModal.periodStart, lang)} – {formatDate(detailModal.periodEnd, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dStatus")}</div>
                <div className={styles.detailValue}>{badge(detailModal.status)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dBasic")}</div>
                <div className={styles.detailValue}>{formatCurrency(detailModal.basicSalary, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dHousing")}</div>
                <div className={styles.detailValue}>{formatCurrency(detailModal.housingAllowance, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dTransport")}</div>
                <div className={styles.detailValue}>{formatCurrency(detailModal.transportAllowance, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dOther")}</div>
                <div className={styles.detailValue}>{formatCurrency(detailModal.otherAllowances, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dInsurance")}</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.insuranceDeduction, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dLoan")}</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.loanDeduction, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dPenalties")}</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.penaltyDeductions, lang)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{t("hr.payroll.dTotal")}</div>
                <div className={styles.detailValue} style={{ fontSize: 18, color: "#059669" }}>{formatCurrency(detailModal.totalPayable, lang)}</div>
              </div>
              {detailModal.paymentReference && (
                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.detailLabel}>{t("hr.payroll.dPayRef")}</div>
                  <div className={styles.detailValue}>{detailModal.paymentReference}</div>
                </div>
              )}
              {detailModal.paidAt && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>{t("hr.payroll.dPaidAt")}</div>
                  <div className={styles.detailValue}>{formatDate(detailModal.paidAt, lang)}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t("hr.payroll.slipTitle")}</h3>
              <div className={styles.payslip}>
                <h2 style={{ color: "#111" }}>{t("hr.payroll.slipHeader")}</h2>
                <table className={styles.payslipTable}>
                  <tbody>
                    <tr><td>{t("hr.payroll.slipEmployee")}</td><td>{detailModal.name || "—"}</td></tr>
                    <tr><td>{t("hr.payroll.slipPeriod")}</td><td>{formatDate(detailModal.periodStart, lang)} – {formatDate(detailModal.periodEnd, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipBasic")}</td><td>{formatCurrency(detailModal.basicSalary, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipHousing")}</td><td>{formatCurrency(detailModal.housingAllowance, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipTransport")}</td><td>{formatCurrency(detailModal.transportAllowance, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipOther")}</td><td>{formatCurrency(detailModal.otherAllowances, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipInsurance")}</td><td style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.insuranceDeduction, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipLoan")}</td><td style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.loanDeduction, lang)}</td></tr>
                    <tr><td>{t("hr.payroll.slipPenalties")}</td><td style={{ color: "#dc2626" }}>-{formatCurrency(detailModal.penaltyDeductions, lang)}</td></tr>
                    <tr style={{ fontWeight: 700, borderTop: "2px solid #333" }}><td>{t("hr.payroll.slipNet")}</td><td>{formatCurrency(detailModal.totalPayable, lang)}</td></tr>
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
                  <CheckCircle size={12} /> {t("hr.payroll.approve")}
                </button>
              )}
              {detailModal.status !== "paid" && (
                <button className={`${styles.actionBtn} ${styles.payBtn}`}
                  onClick={() => { setPayModal(detailModal.id); }}>
                  <CreditCard size={12} /> {t("hr.payroll.markPaid")}
                </button>
              )}
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(null)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ PAY MODAL ═══════════ */}
      {payModal && (
        <div className={styles.overlay} onClick={() => setPayModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{t("hr.payroll.payTitle")}</h2>
            <div className={styles.field}>
              <label>{t("hr.payroll.payRefLabel")}</label>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder={t("hr.payroll.phPayRef")} />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setPayModal(null)}>{t("common.cancel")}</button>
              <button className={`${styles.actionBtn} ${styles.successBtn}`}
                onClick={() => handlePay(payModal)}
                disabled={!payRef.trim() || actionLoading === payModal}>
                {t("hr.payroll.confirmPay")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
