"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, List, CalendarDays, ChevronLeft, ChevronRight, Wrench, Sparkles } from "lucide-react";
import { useLanguage, formatDate, localeOf } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TASK_TYPES: Record<string, string> = {
  oil_change: "maintenance.taskTypes.oilChange", tire_replacement: "maintenance.taskTypes.tireReplacement", brake_inspection: "maintenance.taskTypes.brakeInspection",
  engine_service: "maintenance.taskTypes.engineService", ac_service: "maintenance.taskTypes.acService", electrical: "maintenance.taskTypes.electrical",
  body_repair: "maintenance.taskTypes.bodyRepair", general_service: "maintenance.taskTypes.generalService", other: "maintenance.taskTypes.other",
};
const PRIORITY_KEYS: Record<string, string> = {
  low: "maintenance.priority.low", medium: "maintenance.priority.medium", high: "maintenance.priority.high", critical: "maintenance.priority.critical",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#dc2626",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", in_progress: "#8b5cf6", completed: "#059669", cancelled: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "maintenance.status.scheduled", in_progress: "maintenance.status.inProgress", completed: "maintenance.status.completed", cancelled: "maintenance.status.cancelled",
};
const STATUS_DOT: Record<string, string> = { scheduled: "#3b82f6", in_progress: "#8b5cf6", completed: "#059669", cancelled: "#94a3b8" };

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function MaintenancePage() {
  const { lang, t: tr } = useLanguage();
  const [activeTab, setActiveTab] = useState<"list" | "schedule" | "calendar">("list");

  // List state
  const [tasks, setTasks] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busFilter, setBusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<any>({ tasks: [] });

  // Schedule form state
  const [form, setForm] = useState({
    bus_id: "", task_type: "general_service", priority: "medium",
    scheduled_date: new Date().toISOString().slice(0, 10), scheduled_km: "",
    recurring_interval_days: "", recurring_interval_km: "",
    assigned_workshop: "", assigned_mechanic: "", description: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBuses = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setBuses((data.data || []).filter((b: any) => b.status !== "retired" && b.status !== "sold"));
        if (!form.bus_id) setForm((f) => ({ ...f, bus_id: data.data?.[0]?.id || "" }));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  async function fetchTasks() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (busFilter) params.set("bus_id", busFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`${API}/maintenance/tasks?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTasks(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchTasks(); }, [activeTab, busFilter, statusFilter, priorityFilter]);

  async function fetchCalendar() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/maintenance/tasks/calendar?year=${calYear}&month=${calMonth}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCalendar(data.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "calendar") fetchCalendar(); }, [activeTab, calYear, calMonth]);

  async function handleAutoGenerate() {
    setGenLoading(true);
    setGenMsg("");
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/tasks/auto-generate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setGenMsg(`${data.data.generated} ${tr("maintenance.list.autoGenerated")}`);
        fetchTasks();
      } else setGenMsg(data.error?.message || tr("maintenance.list.autoFailed"));
    } catch { setGenMsg(tr("maintenance.list.networkError")); }
    setGenLoading(false);
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bus_id: form.bus_id, task_type: form.task_type, priority: form.priority,
          scheduled_date: form.scheduled_date,
          scheduled_km: form.scheduled_km ? Number(form.scheduled_km) : undefined,
          recurring_interval_days: form.recurring_interval_days ? Number(form.recurring_interval_days) : undefined,
          recurring_interval_km: form.recurring_interval_km ? Number(form.recurring_interval_km) : undefined,
          assigned_workshop: form.assigned_workshop || undefined,
          assigned_mechanic: form.assigned_mechanic || undefined,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSubmitError(data.error?.message || tr("maintenance.list.scheduleFailed")); return; }
      setForm((f) => ({ ...f, task_type: "general_service", priority: "medium", scheduled_km: "", recurring_interval_days: "", recurring_interval_km: "", assigned_workshop: "", assigned_mechanic: "", description: "" }));
      setActiveTab("list");
      fetchTasks();
    } catch { setSubmitError(tr("maintenance.list.networkError")); }
    setSubmitting(false);
  }

  // ----- Calendar helpers -----
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const tasksByDay: Record<number, any[]> = {};
  for (const t of calendar?.tasks || []) {
    const day = parseInt(String(t.scheduledDate).slice(8, 10), 10);
    (tasksByDay[day] = tasksByDay[day] || []).push(t);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{tr("maintenance.list.title")}</h1>
          <p className={styles.subtitle}>{tr("maintenance.list.sub")}</p>
        </div>
        <button className={styles.genBtn} onClick={handleAutoGenerate} disabled={genLoading}>
          <Sparkles size={14} /> {genLoading ? tr("maintenance.list.checking") : tr("maintenance.list.autoGen")}
        </button>
      </div>
      {genMsg && <div className={styles.genMsg}>{genMsg}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}><List size={14} /> {tr("maintenance.list.tasks")}</button>
        <button className={`${styles.tab} ${activeTab === "schedule" ? styles.tabActive : ""}`} onClick={() => setActiveTab("schedule")}><Plus size={14} /> {tr("maintenance.list.schedule")}</button>
        <button className={`${styles.tab} ${activeTab === "calendar" ? styles.tabActive : ""}`} onClick={() => setActiveTab("calendar")}><CalendarDays size={14} /> {tr("maintenance.list.calendar")}</button>
      </div>

      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{tr("maintenance.list.allBuses")}</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{tr("maintenance.list.allStatuses")}</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{tr("maintenance.list.allPriorities")}</option>
              {Object.keys(PRIORITY_COLORS).map((p) => <option key={p} value={p}>{tr(PRIORITY_KEYS[p] || p)}</option>)}
            </select>
          </div>

          {loading ? <div className={styles.loading}>{tr("maintenance.list.loading")}</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{tr("maintenance.list.colBus")}</th><th>{tr("maintenance.list.colTask")}</th><th>{tr("maintenance.list.colPriority")}</th><th>{tr("maintenance.list.colScheduled")}</th><th>{tr("maintenance.list.colWorkshop")}</th><th>{tr("maintenance.list.colStatus")}</th><th>{tr("maintenance.list.colCost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/dashboard/maintenance/${t.id}`} className={styles.plateLink}>
                          {t.bus?.plateNumber || "—"}
                        </Link>
                        <div className={styles.cellSub}>{t.bus?.make} {t.bus?.model}</div>
                      </td>
                      <td>
                        <Link href={`/dashboard/maintenance/${t.id}`} className={styles.taskLink}>{tr(TASK_TYPES[t.taskType] || t.taskType)}</Link>
                        {t.description && <div className={styles.cellSub}>{t.description.slice(0, 60)}</div>}
                      </td>
                      <td>
                        <span className={styles.priorityBadge} style={{ background: (PRIORITY_COLORS[t.priority] || "#6b7280") + "18", color: PRIORITY_COLORS[t.priority] || "#6b7280" }}>
                          {tr(PRIORITY_KEYS[t.priority] || t.priority)}
                        </span>
                      </td>
                      <td>{formatDate(t.scheduledDate, lang)}{t.scheduledKm != null && <div className={styles.cellSub}>{tr("maintenance.list.at")} {t.scheduledKm.toLocaleString()} {tr("maintenance.list.km")}</div>}</td>
                      <td>{t.assignedWorkshop || "—"}{t.assignedMechanic && <div className={styles.cellSub}>{t.assignedMechanic}</div>}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[t.status] || "#6b7280") + "18", color: STATUS_COLORS[t.status] || "#6b7280" }}>
                          <span className={styles.dot} style={{ background: STATUS_DOT[t.status] || "#6b7280" }} /> {tr(STATUS_LABELS[t.status] || t.status)}
                        </span>
                      </td>
                      <td>{t.cost != null ? Number(t.cost).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr><td colSpan={7} className={styles.emptyState}>{tr("maintenance.list.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "schedule" && (
        <form className={styles.form} onSubmit={handleSchedule}>
          {submitError && <div className={styles.error}>{submitError}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fBus")}</label>
              <select value={form.bus_id} onChange={(e) => setForm({ ...form, bus_id: e.target.value })}>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.make} {b.model}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fType")}</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
                {Object.entries(TASK_TYPES).map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fPriority")}</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{tr(PRIORITY_KEYS[p])}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fDate")}</label>
              <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fKm")}</label>
              <input type="number" min="0" value={form.scheduled_km} onChange={(e) => setForm({ ...form, scheduled_km: e.target.value })} placeholder={tr("maintenance.list.phKm")} />
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fRecurDays")}</label>
              <input type="number" min="1" value={form.recurring_interval_days} onChange={(e) => setForm({ ...form, recurring_interval_days: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fRecurKm")}</label>
              <input type="number" min="1" value={form.recurring_interval_km} onChange={(e) => setForm({ ...form, recurring_interval_km: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fWorkshop")}</label>
              <input type="text" value={form.assigned_workshop} onChange={(e) => setForm({ ...form, assigned_workshop: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{tr("maintenance.list.fMechanic")}</label>
              <input type="text" value={form.assigned_mechanic} onChange={(e) => setForm({ ...form, assigned_mechanic: e.target.value })} />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>{tr("maintenance.list.fDesc")}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.bus_id}>
              {submitting ? tr("maintenance.list.scheduling") : tr("maintenance.list.scheduleBtn")}
            </button>
          </div>
        </form>
      )}

      {activeTab === "calendar" && (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarHeader}>
            <div className={styles.calendarNav}>
              <button onClick={() => calMonth === 1 ? (setCalMonth(12), setCalYear(calYear - 1)) : setCalMonth(calMonth - 1)}><ChevronLeft size={14} /></button>
              <span className={styles.calendarTitle}>{new Date(calYear, calMonth - 1, 1).toLocaleDateString(localeOf(lang), { month: "long", year: "numeric" })}</span>
              <button onClick={() => calMonth === 12 ? (setCalMonth(1), setCalYear(calYear + 1)) : setCalMonth(calMonth + 1)}><ChevronRight size={14} /></button>
            </div>
            <div className={styles.legend}>
              {["low", "medium", "high", "critical"].map((p) => (
                <span key={p} className={styles.legendItem}><span className={styles.legendDot} style={{ background: PRIORITY_COLORS[p] }} /> {tr(PRIORITY_KEYS[p])}</span>
              ))}
            </div>
          </div>
          {loading ? <div className={styles.loading}>{tr("maintenance.list.loadingCal")}</div> : (
            <table className={styles.calendarTable}>
              <thead>
                <tr>{["maintenance.calendar.days.sun", "maintenance.calendar.days.mon", "maintenance.calendar.days.tue", "maintenance.calendar.days.wed", "maintenance.calendar.days.thu", "maintenance.calendar.days.fri", "maintenance.calendar.days.sat"].map((k) => <th key={k}>{tr(k)}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: cells.length / 7 }, (_, w) => (
                  <tr key={w}>
                    {cells.slice(w * 7, w * 7 + 7).map((day, i) => (
                      <td key={i} className={`${styles.calDay} ${day === new Date().getDate() && calMonth === new Date().getMonth() + 1 && calYear === new Date().getFullYear() ? styles.calToday : ""}`}>
                        {day !== null && (
                          <>
                            <span className={styles.dayNum}>{day}</span>
                            {(tasksByDay[day] || []).map((t) => (
                              <Link
                                key={t.id}
                                href={`/dashboard/maintenance/${t.id}`}
                                className={styles.taskBlock}
                                style={{ background: (PRIORITY_COLORS[t.priority] || "#6b7280") + "20", color: PRIORITY_COLORS[t.priority] || "#6b7280" }}
                              >
                                <Wrench size={10} /> {t.bus?.plateNumber} · {tr(TASK_TYPES[t.taskType] || t.taskType).split(" ")[0]}
                              </Link>
                            ))}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}