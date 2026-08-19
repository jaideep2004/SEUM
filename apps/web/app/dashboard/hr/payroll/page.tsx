"use client";
import { useState, useEffect } from "react";
import { List, Plus, DollarSign, Eye, CheckCircle, CreditCard, Printer, Briefcase, Save, AlertTriangle } from "lucide-react";
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
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function today() { return new Date().toISOString().slice(0, 10); }

export default function EmployeePayrollPage() {
  const [activeTab, setActiveTab] = useState<"records" | "generate" | "structure">("records");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [detailModal, setDetailModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Generate
  const [genForm, setGenForm] = useState({ period_start: monthStart(), period_end: today() });
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
      if (data.success) setStructureSaved("Salary structure saved");
      else setStructureError(data.error?.message || "Failed to save");
    } catch { setStructureError("Network error"); }
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
      {s}
    </span>
  );

  const structTotal =
    structureForm.basic_salary + structureForm.housing_allowance + structureForm.transport_allowance + structureForm.other_allowances
    - structureForm.insurance_deduction - structureForm.loan_deduction - structureForm.penalty_deductions;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Employee Payroll</h1>
          <p className={styles.pageDesc}>Salary structures, monthly batch processing, and payments</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "records" ? styles.tabActive : ""}`} onClick={() => setActiveTab("records")}>
          <List size={14} /> Payroll Records
        </button>
        <button className={`${styles.tab} ${activeTab === "generate" ? styles.tabActive : ""}`} onClick={() => setActiveTab("generate")}>
          <Plus size={14} /> Batch Generate
        </button>
        <button className={`${styles.tab} ${activeTab === "structure" ? styles.tabActive : ""}`} onClick={() => setActiveTab("structure")}>
          <Briefcase size={14} /> Salary Structure
        </button>
      </div>

      {/* ═══════════ RECORDS TAB ═══════════ */}
      {activeTab === "records" && (
        <>
          <div className={styles.filters}>
            <div className={styles.filterItem}>
              <label>Period From</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div className={styles.filterItem}>
              <label>Period To</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
            <div className={styles.filterItem}>
              <label>Status</label>
              <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading payroll records...</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No payroll records for this period</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Basic Salary</th>
                    <th>Allowances</th>
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
                        <div style={{ fontWeight: 600 }}>{r.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.employeeCode || ""} · {r.department?.replace("_", " ") || ""}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.periodStart?.slice(5)} – {r.periodEnd?.slice(5)}</td>
                      <td>${fmt(r.basicSalary)}</td>
                      <td>${fmt(r.totalAllowances)}</td>
                      <td style={{ color: "#dc2626" }}>${fmt(r.totalDeductions)}</td>
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

      {/* ═══════════ GENERATE TAB ═══════════ */}
      {activeTab === "generate" && (
        <div>
          <form className={styles.form} onSubmit={handleGenerate}>
            <h3 className={styles.formTitle}>Monthly Batch Payroll</h3>
            <div className={styles.formGrid}>
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
            </div>
            <p className={styles.formHint}>Generates draft payroll for all active employees with a salary structure. Employees without a structure are skipped.</p>
            <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "generate"}>
              {actionLoading === "generate" ? "Generating..." : "Preview & Generate"}
            </button>
          </form>

          {preview && (
            <div style={{ marginTop: 24 }}>
              {preview.skipped?.length > 0 && (
                <div className={styles.warningBanner}>
                  <AlertTriangle size={14} />
                  <span>{preview.skipped.length} employee(s) skipped (no salary structure): {preview.skipped.map((s: any) => s.name || s.employeeCode).join(", ")}</span>
                </div>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Total Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.records?.map((r: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.name || r.employeeCode}</span>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{r.department?.replace("_", " ") || ""}</div>
                        </td>
                        <td>${fmt(r.basicSalary)}</td>
                        <td>${fmt(r.totalAllowances)}</td>
                        <td style={{ color: "#dc2626" }}>${fmt(r.totalDeductions)}</td>
                        <td style={{ fontWeight: 700 }}>${fmt(r.totalPayable)}</td>
                      </tr>
                    ))}
                    {preview.totals && (
                      <tr className={styles.totalsRow}>
                        <td>{preview.totals.employeeCount} employees</td>
                        <td>${fmt(preview.totals.totalBasicSalary)}</td>
                        <td>${fmt(preview.totals.totalAllowances)}</td>
                        <td style={{ color: "#dc2626" }}>${fmt(preview.totals.totalDeductions)}</td>
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

      {/* ═══════════ SALARY STRUCTURE TAB ═══════════ */}
      {activeTab === "structure" && (
        <div className={styles.structWrap}>
          <div className={styles.field}>
            <label>Employee</label>
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); if (e.target.value) loadStructure(e.target.value); }}>
              <option value="">Select an employee...</option>
              {roster.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode || "no code"})</option>)}
            </select>
          </div>

          {selectedEmployee && (
            <form className={styles.form} onSubmit={handleSaveStructure} style={{ marginTop: 16 }}>
              {structureSaved && <div className={styles.successBanner}><CheckCircle size={14} /> {structureSaved}</div>}
              {structureError && <div className={styles.errorBanner}>{structureError}</div>}
              <h3 className={styles.formTitle}>Allowances</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Basic Salary ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.basic_salary}
                    onChange={e => setStructureForm({ ...structureForm, basic_salary: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Housing Allowance ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.housing_allowance}
                    onChange={e => setStructureForm({ ...structureForm, housing_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Transport Allowance ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.transport_allowance}
                    onChange={e => setStructureForm({ ...structureForm, transport_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Other Allowances ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.other_allowances}
                    onChange={e => setStructureForm({ ...structureForm, other_allowances: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <h3 className={styles.formTitle}>Deductions</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Insurance ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.insurance_deduction}
                    onChange={e => setStructureForm({ ...structureForm, insurance_deduction: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Loans ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.loan_deduction}
                    onChange={e => setStructureForm({ ...structureForm, loan_deduction: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Penalties ($)</label>
                  <input type="number" min="0" step="0.01" value={structureForm.penalty_deductions}
                    onChange={e => setStructureForm({ ...structureForm, penalty_deductions: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.field}>
                  <label>Effective From</label>
                  <input type="date" value={structureForm.effective_from}
                    onChange={e => setStructureForm({ ...structureForm, effective_from: e.target.value })} />
                </div>
              </div>
              <div className={styles.structTotal}>
                <span>Monthly Net Pay: </span>
                <strong>${fmt(structTotal)}</strong>
                <small> = ${fmt(structureForm.basic_salary + structureForm.housing_allowance + structureForm.transport_allowance + structureForm.other_allowances)} − ${fmt(structureForm.insurance_deduction + structureForm.loan_deduction + structureForm.penalty_deductions)}</small>
              </div>
              <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "structure"}>
                <Save size={12} /> {actionLoading === "structure" ? "Saving..." : "Save Structure"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      {detailModal && (
        <div className={styles.overlay} onClick={() => setDetailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <h2>Payroll Detail — {detailModal.name || "Employee"}</h2>
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
                <div className={styles.detailLabel}>Basic Salary</div>
                <div className={styles.detailValue}>${fmt(detailModal.basicSalary)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Housing Allowance</div>
                <div className={styles.detailValue}>${fmt(detailModal.housingAllowance)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Transport Allowance</div>
                <div className={styles.detailValue}>${fmt(detailModal.transportAllowance)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Other Allowances</div>
                <div className={styles.detailValue}>${fmt(detailModal.otherAllowances)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Insurance</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-${fmt(detailModal.insuranceDeduction)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Loan</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-${fmt(detailModal.loanDeduction)}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Penalties</div>
                <div className={styles.detailValue} style={{ color: "#dc2626" }}>-${fmt(detailModal.penaltyDeductions)}</div>
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
                    <tr><td>Employee</td><td>{detailModal.name || "—"}</td></tr>
                    <tr><td>Period</td><td>{detailModal.periodStart} – {detailModal.periodEnd}</td></tr>
                    <tr><td>Basic Salary</td><td>${fmt(detailModal.basicSalary)}</td></tr>
                    <tr><td>Housing Allowance</td><td>${fmt(detailModal.housingAllowance)}</td></tr>
                    <tr><td>Transport Allowance</td><td>${fmt(detailModal.transportAllowance)}</td></tr>
                    <tr><td>Other Allowances</td><td>${fmt(detailModal.otherAllowances)}</td></tr>
                    <tr><td>Insurance</td><td style={{ color: "#dc2626" }}>-${fmt(detailModal.insuranceDeduction)}</td></tr>
                    <tr><td>Loan</td><td style={{ color: "#dc2626" }}>-${fmt(detailModal.loanDeduction)}</td></tr>
                    <tr><td>Penalties</td><td style={{ color: "#dc2626" }}>-${fmt(detailModal.penaltyDeductions)}</td></tr>
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

      {/* ═══════════ PAY MODAL ═══════════ */}
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
