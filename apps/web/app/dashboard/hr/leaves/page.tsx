"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, CalendarDays, List, CheckCircle, XCircle, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  pending_manager: "#f59e0b", pending_hr: "#8b5cf6", approved: "#059669", rejected: "#dc2626",
};
const STATUS_KEYS: Record<string, string> = {
  pending_manager: "hr.leaves.stPendingMgr",
  pending_hr: "hr.leaves.stPendingHr",
  approved: "hr.leaves.stApproved",
  rejected: "hr.leaves.stRejected",
};
const TYPE_COLORS: Record<string, string> = {
  annual: "#3b82f6", sick: "#ef4444", emergency: "#f97316",
  maternity: "#ec4899", paternity: "#14b8a6", unpaid: "#6b7280",
};
const TYPE_KEYS: Record<string, string> = {
  annual: "hr.leaves.tyAnnual",
  sick: "hr.leaves.tySick",
  emergency: "hr.leaves.tyEmergency",
  maternity: "hr.leaves.tyMaternity",
  paternity: "hr.leaves.tyPaternity",
  unpaid: "hr.leaves.tyUnpaid",
};
const LEAVE_TYPES = ["annual", "sick", "emergency", "maternity", "paternity", "unpaid"];
const DEPARTMENT_KEYS: Record<string, string> = {
  operations: "hr.leaves.deptOperations",
  finance: "hr.leaves.deptFinance",
  hr: "hr.leaves.deptHr",
  fleet: "hr.leaves.deptFleet",
  maintenance: "hr.leaves.deptMaintenance",
  customer_service: "hr.leaves.deptCustomerService",
  executive: "hr.leaves.deptExecutive",
  admin: "hr.leaves.deptAdmin",
};
const DAY_KEYS = ["hr.leaves.daySun", "hr.leaves.dayMon", "hr.leaves.dayTue", "hr.leaves.dayWed", "hr.leaves.dayThu", "hr.leaves.dayFri", "hr.leaves.daySat"];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function EmployeeLeavesPage() {
  const { lang, t: tr } = useLanguage();
  void formatNumber;
  void formatCurrency;
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState<"list" | "apply" | "calendar">("list");

  // List state
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Employees roster + balance
  const [roster, setRoster] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [balance, setBalance] = useState<any>(null);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<any>(null);

  // Apply form state
  const [form, setForm] = useState({
    employee_id: "", leave_type: "annual", start_date: today, end_date: today, reason: "",
  });

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchRoster() {
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/employees?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setRoster(data.data || []);
        if (!selectedEmployee && data.data?.length > 0) setSelectedEmployee(data.data[0].id);
      }
    } catch {}
  }

  useEffect(() => { fetchRoster(); }, []);

  useEffect(() => {
    if (!selectedEmployee) { setBalance(null); return; }
    const token = getToken();
    fetch(`${API}/hr/employee-leaves/balance/${selectedEmployee}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBalance(d.data); })
      .catch(() => {});
  }, [selectedEmployee, leaves]);

  async function fetchLeaves() {
    setLoading(true);
    const token = getToken();
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("leave_type", typeFilter);
      if (deptFilter) params.set("department", deptFilter);
      const res = await fetch(`${API}/hr/employee-leaves?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLeaves(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchLeaves(); }, [activeTab, statusFilter, typeFilter, deptFilter]);

  async function fetchCalendar() {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/employee-leaves/calendar?year=${calYear}&month=${calMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCalendar(data.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "calendar") fetchCalendar(); }, [activeTab, calYear, calMonth]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setActionLoading("apply");
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/employee-leaves`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || tr("hr.common.failedSubmit")); return; }
      setForm({ employee_id: "", leave_type: "annual", start_date: today, end_date: today, reason: "" });
      setActiveTab("list");
      fetchLeaves();
    } catch { setError(tr("hr.common.networkError")); } finally { setActionLoading(null); }
  }

  async function handleManagerApprove(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      const stored = localStorage.getItem("seum_user");
      const user = stored ? JSON.parse(stored) : {};
      const res = await fetch(`${API}/hr/employee-leaves/${id}/manager-approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: user.id || "00000000-0000-0000-0000-000000000000" }),
      });
      const data = await res.json();
      if (!data.success) alert(data.message || tr("hr.common.actionFailed"));
      fetchLeaves();
    } catch {} finally { setActionLoading(null); }
  }

  async function handleHrApprove(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      const stored = localStorage.getItem("seum_user");
      const user = stored ? JSON.parse(stored) : {};
      const res = await fetch(`${API}/hr/employee-leaves/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: user.id || "00000000-0000-0000-0000-000000000000" }),
      });
      const data = await res.json();
      if (!data.success) alert(data.message || tr("hr.common.actionFailed"));
      fetchLeaves();
    } catch {} finally { setActionLoading(null); }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      const res = await fetch(`${API}/hr/employee-leaves/${id}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!data.success) alert(data.message || tr("hr.common.actionFailed"));
      setRejectModal(null);
      setRejectReason("");
      fetchLeaves();
    } catch {} finally { setActionLoading(null); }
  }

  const badge = (value: string, map: Record<string, string>, label?: string) => (
    <span className={styles.statusBadge} style={{ background: (map[value] || "#6b7280") + "20", color: map[value] || "#6b7280" }}>
      {label || value.replace("_", " ")}
    </span>
  );

  const typeBadge = (value: string) => (
    <span className={styles.typeBadge} style={{ background: (TYPE_COLORS[value] || "#6b7280") + "20", color: TYPE_COLORS[value] || "#6b7280" }}>
      {tr(TYPE_KEYS[value] || value)}
    </span>
  );

  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const dayHeaders = DAY_KEYS.map((k) => tr(k));
  const blankCells = Array.from({ length: firstDay }, (_, i) => i);

  const selectedEmployeeInfo = roster.find((e: any) => e.id === selectedEmployee);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ArrowLeft size={16} />
          <h1>{tr("hr.leaves.title")}</h1>
        </div>
      </div>

      {activeTab !== "calendar" && (
        <div className={styles.balanceSection}>
          <div className={styles.balancePicker}>
            <UserCheck size={14} />
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              {roster.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name || e.employeeCode || e.id}</option>
              ))}
            </select>
          </div>
          {balance && (
            <div className={styles.balanceCards}>
              {Object.entries(balance.allowances || {}).map(([type, info]: [string, any]) => (
                <div key={type} className={styles.balanceCard}>
                  <div className={styles.balanceType}>{tr(TYPE_KEYS[type] || type)}</div>
                  <div className={styles.balanceValue} style={{ color: TYPE_COLORS[type] || "#6b7280" }}>
                    {info.remaining}
                  </div>
                  <div className={styles.balanceUsed}>{info.used} {tr("hr.leaves.usedWord")} / {info.total}</div>
                </div>
              ))}
            </div>
          )}
          {selectedEmployeeInfo && (
            <div className={styles.balanceTitle}>
              {selectedEmployeeInfo.name || tr("hr.common.unknown")} · {selectedEmployeeInfo.employeeCode || ""} · {selectedEmployeeInfo.department || ""}
            </div>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}>
          <List size={14} /> {tr("hr.leaves.tabList")}
        </button>
        <button className={`${styles.tab} ${activeTab === "apply" ? styles.tabActive : ""}`} onClick={() => setActiveTab("apply")}>
          <Plus size={14} /> {tr("hr.leaves.tabApply")}
        </button>
        <button className={`${styles.tab} ${activeTab === "calendar" ? styles.tabActive : ""}`} onClick={() => setActiveTab("calendar")}>
          <CalendarDays size={14} /> {tr("hr.leaves.tabCalendar")}
        </button>
      </div>

      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select className={styles.filterSelect} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">{tr("hr.leaves.filterAllDept")}</option>
              {Object.entries(DEPARTMENT_KEYS).map(([v, k]) => <option key={v} value={v}>{tr(k)}</option>)}
            </select>
            <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">{tr("hr.leaves.filterAllStatus")}</option>
              <option value="pending_manager">{tr("hr.leaves.optPendingMgr")}</option>
              <option value="pending_hr">{tr("hr.leaves.optPendingHr")}</option>
              <option value="approved">{tr("hr.leaves.optApproved")}</option>
              <option value="rejected">{tr("hr.leaves.optRejected")}</option>
            </select>
            <select className={styles.filterSelect} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">{tr("hr.leaves.filterAllTypes")}</option>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{tr(TYPE_KEYS[t] || t)}</option>)}
            </select>
          </div>

          {loading ? (
            <div className={styles.loading}>{tr("hr.leaves.loading")}</div>
          ) : leaves.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>{tr("hr.leaves.empty")}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{tr("hr.leaves.colEmployee")}</th>
                    <th>{tr("hr.leaves.colDept")}</th>
                    <th>{tr("hr.leaves.colType")}</th>
                    <th>{tr("hr.leaves.colFrom")}</th>
                    <th>{tr("hr.leaves.colTo")}</th>
                    <th>{tr("hr.leaves.colDays")}</th>
                    <th>{tr("hr.leaves.colStatus")}</th>
                    <th>{tr("hr.leaves.colChain")}</th>
                    <th>{tr("hr.leaves.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l: any) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.employee?.name || tr("hr.common.unknown")}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{l.employee?.employeeCode || ""}</div>
                      </td>
                      <td>{badge(l.employee?.department || "", {})}</td>
                      <td>{typeBadge(l.leaveType)}</td>
                      <td>{formatDate(l.startDate, lang)}</td>
                      <td>{formatDate(l.endDate, lang)}</td>
                      <td>{Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1}</td>
                      <td>{badge(l.status, STATUS_COLORS, tr(STATUS_KEYS[l.status] || l.status))}</td>
                      <td>
                        <div className={styles.chain}>
                          <span className={`${styles.chainStep} ${l.status === "rejected" ? styles.chainDone : ""}`} title={l.managerApproverName || tr("hr.leaves.chainManager")}>
                            <CheckCircle size={11} /> {tr("hr.leaves.chainManager")}
                          </span>
                          <span className={styles.chainArrow}>→</span>
                          <span className={`${styles.chainStep} ${l.status === "approved" ? styles.chainDone : ""}`} title={l.hrApproverName || tr("hr.leaves.chainHr")}>
                            <CheckCircle size={11} /> {tr("hr.leaves.chainHr")}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {l.status === "pending_manager" && (
                            <>
                              <button className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={() => handleManagerApprove(l.id)}
                                disabled={actionLoading === l.id}
                                title={tr("hr.leaves.mgrTitle")}>
                                <CheckCircle size={12} /> {tr("hr.leaves.btnMgr")}
                              </button>
                              <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={() => setRejectModal({ id: l.id })}
                                disabled={actionLoading === l.id}>
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          {l.status === "pending_hr" && (
                            <>
                              <button className={`${styles.actionBtn} ${styles.hrBtn}`}
                                onClick={() => handleHrApprove(l.id)}
                                disabled={actionLoading === l.id}
                                title={tr("hr.leaves.hrTitle")}>
                                <CheckCircle size={12} /> {tr("hr.leaves.btnHr")}
                              </button>
                              <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={() => setRejectModal({ id: l.id })}
                                disabled={actionLoading === l.id}>
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "apply" && (
        <form className={styles.form} onSubmit={handleApply}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>{tr("hr.leaves.fEmployee")}</label>
            <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required>
              <option value="">{tr("hr.leaves.selectEmp")}</option>
              {roster.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name || e.employeeCode || e.id} · {e.department || ""}</option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{tr("hr.leaves.fLeaveType")}</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{tr(TYPE_KEYS[t] || t)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{tr("hr.leaves.fReason")}</label>
              <input
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder={tr("hr.leaves.phReason")}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{tr("hr.leaves.fStart")}</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>{tr("hr.leaves.fEnd")}</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <p className={styles.hint}>{tr("hr.leaves.hint")}</p>
          <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "apply" || !form.employee_id}>
            {actionLoading === "apply" ? tr("hr.leaves.submitting") : tr("hr.leaves.submit")}
          </button>
        </form>
      )}

      {activeTab === "calendar" && (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarHeader}>
            <div className={styles.calendarTitle}>
              {formatDate(new Date(calYear, calMonth - 1, 1), lang)}
            </div>
            <div className={styles.calendarNav}>
              <button onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => { const n = new Date(); setCalMonth(n.getMonth() + 1); setCalYear(n.getFullYear()); }}>{tr("common.today")}</button>
              <button onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className={styles.loading}>{tr("hr.leaves.calLoading")}</div>
          ) : !calendar ? null : (
            <table className={styles.calendarTable}>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>{tr("hr.leaves.calEmpCol")}</th>
                  {dayHeaders.map((d, i) => <th key={i}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {calendar.employees?.map((emp: any) => {
                  const leavesForEmp = (calendar.leaves || []).filter((l: any) => l.employeeId === emp.id);
                  return (
                    <tr key={emp.id}>
                      <td className={styles.driverNameCell}>
                        <div style={{ fontWeight: 600, fontSize: 11 }}>{emp.name || emp.employeeCode}</div>
                        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{emp.employeeCode}</div>
                      </td>
                      {blankCells.map((_, i) => <td key={`b${i}`} />)}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayLeaves = leavesForEmp.filter((l: any) => l.startDate <= dateStr && l.endDate >= dateStr);
                        return (
                          <td key={i} style={{ background: dayLeaves.length > 0 ? (TYPE_COLORS[dayLeaves[0].leaveType] || "#6b7280") + "15" : undefined }}>
                            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{day}</div>
                            {dayLeaves.map((l: any) => (
                              <div key={l.id} className={styles.leaveBlock} style={{
                                background: (TYPE_COLORS[l.leaveType] || "#6b7280") + "30",
                                color: TYPE_COLORS[l.leaveType] || "#6b7280",
                              }}>
                                {tr(TYPE_KEYS[l.leaveType] || l.leaveType)}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {rejectModal && (
        <div className={styles.overlay} onClick={() => setRejectModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{tr("hr.leaves.rejectTitle")}</h2>
            <div className={styles.field}>
              <label>{tr("hr.leaves.rejectLabel")}</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tr("hr.leaves.phReject")} />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setRejectModal(null)}>{tr("common.cancel")}</button>
              <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                onClick={() => handleReject(rejectModal.id)}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id}>
                {actionLoading === rejectModal.id ? tr("hr.leaves.rejecting") : tr("hr.leaves.rejectBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
