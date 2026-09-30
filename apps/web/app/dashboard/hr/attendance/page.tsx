"use client";
import { useState, useEffect } from "react";
import { Clock, LogOut, CalendarDays, Users, Search } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  present: "#059669",
  absent: "#dc2626",
  late: "#d97706",
  half_day: "#f59e0b",
  on_leave: "#6366f1",
};

const STATUS_KEYS: Record<string, string> = {
  present: "hr.attendance.stPresent",
  absent: "hr.attendance.stAbsent",
  late: "hr.attendance.stLate",
  half_day: "hr.attendance.stHalfDay",
  on_leave: "hr.attendance.stOnLeave",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function EmployeeAttendancePage() {
  const { lang, t } = useLanguage();
  void formatCurrency;
  const today = new Date().toISOString().slice(0, 10);
  const [roster, setRoster] = useState<any[]>([]);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  async function fetchToday() {
    const token = getToken();
    if (!token) return;
    try {
      const [rosterRes, todayRes, monthlyRes] = await Promise.all([
        fetch(`${API}/hr/employees?pageSize=100&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/hr/employee-attendance/list?date=${today}&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/hr/employee-attendance/summary?year=${today.slice(0, 4)}&month=${today.slice(5, 7)}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const rosterData = await rosterRes.json();
      const todayData = await todayRes.json();
      const monthlyData = await monthlyRes.json();
      if (rosterData.success) setRoster(rosterData.data || []);
      if (todayData.success) setTodayRecords(todayData.data || []);
      if (monthlyData.success) setMonthlySummary(monthlyData.data);
    } catch {}
  }

  async function fetchRecords() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, pageSize: "100" });
      if (employeeFilter) params.set("employee_id", employeeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API}/hr/employee-attendance/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRecords(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchToday(); }, []);
  useEffect(() => { fetchRecords(); }, [employeeFilter, statusFilter, startDate, endDate]);

  async function handleCheckIn(employeeId: string) {
    setActionLoading(employeeId);
    const token = getToken();
    try {
      await fetch(`${API}/hr/employee-attendance/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId }),
      });
      await fetchToday();
      await fetchRecords();
    } catch {}
    setActionLoading(null);
  }

  async function handleCheckOut(employeeId: string) {
    setActionLoading(employeeId);
    const token = getToken();
    try {
      await fetch(`${API}/hr/employee-attendance/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId }),
      });
      await fetchToday();
      await fetchRecords();
    } catch {}
    setActionLoading(null);
  }

  const todayByEmployee = new Map(todayRecords.map((r: any) => [r.employeeId, r]));
  const mergedRoster = roster.map((e: any) => ({ ...e, todayRecord: todayByEmployee.get(e.id) }));
  const checkedInCount = mergedRoster.filter((e: any) => e.todayRecord?.checkInTime).length;
  const lateCount = mergedRoster.filter((e: any) => e.todayRecord?.status === "late").length;
  const notCheckedIn = mergedRoster.filter((e: any) => !e.todayRecord?.checkInTime).length;

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>{t("hr.attendance.title")}</h1>
          <p className={styles.pageDesc}>{t("hr.attendance.desc")}</p>
        </div>
      </div>

      {/* ─── Today: Check-in/out interface ─── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Clock size={14} /> {t("common.today")} ({formatDate(today, lang)})</h2>
        </div>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{formatNumber(mergedRoster.length, lang)}</div>
            <div className={styles.summaryLabel}>{t("hr.attendance.sumActive")}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#059669" }}>{formatNumber(checkedInCount, lang)}</div>
            <div className={styles.summaryLabel}>{t("hr.attendance.sumCheckedIn")}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#d97706" }}>{formatNumber(lateCount, lang)}</div>
            <div className={styles.summaryLabel}>{t("hr.attendance.sumLate")}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#6b7280" }}>{formatNumber(notCheckedIn, lang)}</div>
            <div className={styles.summaryLabel}>{t("hr.attendance.sumNotIn")}</div>
          </div>
        </div>

        {mergedRoster.length === 0 ? (
          <div className={styles.emptyState}><Users size={32} style={{ opacity: 0.3 }} /><p>{t("hr.attendance.emptyNoEmp")}</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("hr.attendance.colEmployee")}</th>
                  <th>{t("hr.attendance.colDepartment")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("hr.attendance.colCheckIn")}</th>
                  <th>{t("hr.attendance.colCheckOut")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {mergedRoster.map((e: any) => (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.personCell}>
                        <div className={styles.avatar}>{e.name?.charAt(0).toUpperCase() || "?"}</div>
                        <div className={styles.personInfo}>
                          <span className={styles.personName}>{e.name || t("hr.common.unknown")}</span>
                          <span className={styles.personCode}>{e.employeeCode || e.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.deptCell}>{e.department?.replace("_", " ") || "—"}</td>
                    <td>
                      {e.todayRecord ? (
                        <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[e.todayRecord.status] || "#6b7280") + "20", color: STATUS_COLORS[e.todayRecord.status] || "#6b7280" }}>
                          {t(STATUS_KEYS[e.todayRecord.status] || e.todayRecord.status)}
                        </span>
                      ) : (
                        <span className={styles.notRecorded}>—</span>
                      )}
                    </td>
                    <td className={styles.timeCell}>{fmtTime(e.todayRecord?.checkInTime)}</td>
                    <td className={styles.timeCell}>{fmtTime(e.todayRecord?.checkOutTime)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {!e.todayRecord?.checkInTime && (
                          <button
                            className={`${styles.checkBtn} ${styles.checkInBtn}`}
                            onClick={() => handleCheckIn(e.id)}
                            disabled={actionLoading === e.id}
                          >
                            <Clock size={12} /> {t("hr.attendance.btnIn")}
                          </button>
                        )}
                        {e.todayRecord?.checkInTime && !e.todayRecord?.checkOutTime && (
                          <button
                            className={`${styles.checkBtn} ${styles.checkOutBtn}`}
                            onClick={() => handleCheckOut(e.id)}
                            disabled={actionLoading === e.id}
                          >
                            <LogOut size={12} /> {t("hr.attendance.btnOut")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Monthly summary card ─── */}
      {monthlySummary && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><CalendarDays size={14} /> {t("hr.attendance.monthlySummary")} — {formatDate(new Date(monthlySummary.year, monthlySummary.month - 1, 1), lang)}</h2>
          </div>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{formatNumber(monthlySummary.totalEmployees, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumActive")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: "#059669" }}>{formatNumber(monthlySummary.present, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumPresent")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: "#dc2626" }}>{formatNumber(monthlySummary.absent, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumAbsent")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: "#d97706" }}>{formatNumber(monthlySummary.late, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumLate")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: "#f59e0b" }}>{formatNumber(monthlySummary.halfDay, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumHalfDay")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: "#6366f1" }}>{formatNumber(monthlySummary.onLeave, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumOnLeave")}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{formatNumber(monthlySummary.totalRecords, lang)}</div>
              <div className={styles.summaryLabel}>{t("hr.attendance.sumTotalRecords")}</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Records table with filters ─── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t("hr.attendance.secRecords")}</h2>
        </div>
        <div className={styles.filters}>
          <div className={styles.filterItem}>
            <label>{t("hr.attendance.fEmployee")}</label>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">{t("hr.attendance.allEmployees")}</option>
              {roster.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode || t("hr.common.noCode")})</option>)}
            </select>
          </div>
          <div className={styles.filterItem}>
            <label>{t("hr.attendance.fStatus")}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t("hr.attendance.allStatus")}</option>
              {Object.entries(STATUS_KEYS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
            </select>
          </div>
          <div className={styles.filterItem}>
            <label>{t("hr.attendance.fFrom")}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className={styles.filterItem}>
            <label>{t("hr.attendance.fTo")}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>{t("hr.attendance.loading")}</div>
        ) : records.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={32} style={{ opacity: 0.3 }} />
            <p>{t("hr.attendance.empty")}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("hr.attendance.colDate")}</th>
                  <th>{t("hr.attendance.colEmployee")}</th>
                  <th>{t("hr.attendance.colDepartment")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("hr.attendance.colCheckIn")}</th>
                  <th>{t("hr.attendance.colCheckOut")}</th>
                  <th>{t("hr.attendance.colLateMin")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id}>
                    <td className={styles.dateCell}>{formatDate(r.date, lang)}</td>
                    <td>
                      <div className={styles.personInfo}>
                        <span className={styles.personName}>{r.employee?.name || t("hr.common.unknown")}</span>
                        <span className={styles.personCode}>{r.employee?.employeeCode || r.employeeId.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className={styles.deptCell}>{r.employee?.department?.replace("_", " ") || "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[r.status] || "#6b7280") + "20", color: STATUS_COLORS[r.status] || "#6b7280" }}>
                        {t(STATUS_KEYS[r.status] || r.status)}
                      </span>
                    </td>
                    <td className={styles.timeCell}>{fmtTime(r.checkInTime)}</td>
                    <td className={styles.timeCell}>{fmtTime(r.checkOutTime)}</td>
                    <td>{formatNumber(r.lateMinutes || 0, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
