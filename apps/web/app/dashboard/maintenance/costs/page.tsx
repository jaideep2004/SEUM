"use client";
import { useState, useEffect, useCallback } from "react";
import { BarChart3, Plus, Receipt, TrendingUp, Wallet, Wrench, CalendarRange } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TASK_TYPES: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_inspection: "Brake Inspection",
  engine_service: "Engine Service", ac_service: "AC Service", electrical: "Electrical",
  body_repair: "Body Repair", general_service: "General Service", other: "Other",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", invoiced: "#3b82f6", paid: "#059669", cancelled: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", invoiced: "Invoiced", paid: "Paid", cancelled: "Cancelled",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState<"report" | "record" | "byBus" | "age">("report");

  // Report state
  const [costs, setCosts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ partsCost: 0, laborCost: 0, totalCost: 0 });
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busFilter, setBusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Record cost form
  const [tasks, setTasks] = useState<any[]>([]);
  const [form, setForm] = useState({
    maintenance_task_id: "", labor_hours: "0", labor_rate: "50",
    paid_to: "", invoice_number: "", status: "pending",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Charts state
  const [byBus, setByBus] = useState<any>({ buses: [], grandTotal: 0 });
  const [agePoints, setAgePoints] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchBuses = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setBuses((data.data || []).filter((b: any) => b.status !== "retired" && b.status !== "sold"));
    } catch {}
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  async function fetchCosts() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (busFilter) params.set("bus_id", busFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("task_type", typeFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const res = await fetch(`${API}/maintenance/costs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setCosts(data.data || []);
        setSummary(data.meta?.summary || { partsCost: 0, laborCost: 0, totalCost: 0 });
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "report") fetchCosts(); }, [activeTab, busFilter, statusFilter, typeFilter, startDate, endDate]);

  async function fetchByBus() {
    setChartLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/costs/by-bus`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setByBus(data.data);
    } catch {}
    setChartLoading(false);
  }

  async function fetchAge() {
    setChartLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/costs/analytics/age`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAgePoints(data.data.points || []);
    } catch {}
    setChartLoading(false);
  }

  useEffect(() => { if (activeTab === "byBus") fetchByBus(); }, [activeTab]);
  useEffect(() => { if (activeTab === "age") fetchAge(); }, [activeTab]);

  async function loadTasks() {
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/tasks?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTasks((data.data || []).filter((t: any) => t.status === "completed" || t.status === "in_progress"));
    } catch {}
  }

  useEffect(() => { if (activeTab === "record") loadTasks(); }, [activeTab]);

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          maintenance_task_id: form.maintenance_task_id,
          labor_hours: Number(form.labor_hours) || 0,
          labor_rate: Number(form.labor_rate) || 50,
          paid_to: form.paid_to || undefined,
          invoice_number: form.invoice_number || undefined,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSubmitError(data.error?.message || "Failed to record cost"); return; }
      setForm({ maintenance_task_id: "", labor_hours: "0", labor_rate: "50", paid_to: "", invoice_number: "", status: "pending" });
      setActiveTab("report");
      fetchCosts();
    } catch { setSubmitError("Network error"); }
    setSubmitting(false);
  }

  // Bar chart geometry
  const maxBusCost = Math.max(...byBus.buses.map((b: any) => b.totalCost), 1);
  // Scatter geometry
  const maxAge = Math.max(...agePoints.map((p) => p.ageYears), 1);
  const maxCost = Math.max(...agePoints.map((p) => p.totalCost), 1);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Maintenance Cost Tracking</h1>
          <p className={styles.subtitle}>Auto-calculated from parts used + labor hours, with per-bus and fleet analytics.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "report" ? styles.tabActive : ""}`} onClick={() => setActiveTab("report")}><Receipt size={14} /> Cost Report</button>
        <button className={`${styles.tab} ${activeTab === "record" ? styles.tabActive : ""}`} onClick={() => setActiveTab("record")}><Plus size={14} /> Record Cost</button>
        <button className={`${styles.tab} ${activeTab === "byBus" ? styles.tabActive : ""}`} onClick={() => setActiveTab("byBus")}><BarChart3 size={14} /> Cost per Bus</button>
        <button className={`${styles.tab} ${activeTab === "age" ? styles.tabActive : ""}`} onClick={() => setActiveTab("age")}><TrendingUp size={14} /> Cost vs Age</button>
      </div>

      {activeTab === "report" && (
        <>
          <div className={styles.filters}>
            <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All buses</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All types</option>
              {Object.entries(TASK_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.filterSelect} />
            <span className={styles.rangeSep}>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.filterSelect} />
          </div>

          <div className={styles.kpiRow}>
            <div className={styles.kpi}><span className={styles.kpiLabel}><Wrench size={12} /> Parts Cost</span><strong>{Number(summary.partsCost).toLocaleString()}</strong></div>
            <div className={styles.kpi}><span className={styles.kpiLabel}><CalendarRange size={12} /> Labor Cost</span><strong>{Number(summary.laborCost).toLocaleString()}</strong></div>
            <div className={styles.kpiTotal}><span className={styles.kpiLabel}><Wallet size={12} /> Total Cost</span><strong>{Number(summary.totalCost).toLocaleString()}</strong></div>
          </div>

          {loading ? <div className={styles.loading}>Loading costs...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Bus</th><th>Task</th><th>Scheduled</th><th>Parts</th><th>Labor</th><th>Total</th><th>Invoice</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className={styles.plateLink}>{c.bus?.plateNumber || "—"}</span>
                        <div className={styles.cellSub}>{c.bus?.make} {c.bus?.model}</div>
                      </td>
                      <td>
                        <span className={styles.taskType}>{TASK_TYPES[c.task?.taskType] || c.task?.taskType}</span>
                        <div className={styles.cellSub}>{c.task?.assignedWorkshop || "—"}</div>
                      </td>
                      <td>{fmtDate(c.task?.scheduledDate)}{c.task && <div className={styles.cellSub}>· {c.task.status}</div>}</td>
                      <td>{Number(c.partsCost).toLocaleString()}</td>
                      <td>{Number(c.laborCost).toLocaleString()}{c.laborHours > 0 && <div className={styles.cellSub}>{c.laborHours} h × {c.laborRate}</div>}</td>
                      <td><strong>{Number(c.totalCost).toLocaleString()}</strong></td>
                      <td>{c.invoiceNumber || "—"}{c.paidTo && <div className={styles.cellSub}>{c.paidTo}</div>}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[c.status] || "#6b7280") + "18", color: STATUS_COLORS[c.status] || "#6b7280" }}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {costs.length === 0 && (
                    <tr><td colSpan={8} className={styles.emptyState}>No cost records — record one for a completed task.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "record" && (
        <form className={styles.form} onSubmit={handleRecord}>
          {submitError && <div className={styles.error}>{submitError}</div>}
          <div className={styles.formRow}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Maintenance Task *</label>
              <select value={form.maintenance_task_id} onChange={(e) => setForm({ ...form, maintenance_task_id: e.target.value })}>
                <option value="">Select a completed/in-progress task...</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.bus?.plateNumber} — {TASK_TYPES[t.taskType] || t.taskType} ({t.scheduledDate})</option>
                ))}
              </select>
              <p className={styles.hint}>Parts cost is auto-calculated from stock-outs linked to this task. Labor = hours × rate.</p>
            </div>
            <div className={styles.field}>
              <label>Labor Hours</label>
              <input type="number" min="0" step="0.5" value={form.labor_hours} onChange={(e) => setForm({ ...form, labor_hours: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Labor Rate / hour</label>
              <input type="number" min="0" step="0.5" value={form.labor_rate} onChange={(e) => setForm({ ...form, labor_rate: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Paid To</label>
              <input type="text" value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} placeholder="Workshop / vendor" />
            </div>
            <div className={styles.field}>
              <label>Invoice Number</label>
              <input type="text" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.maintenance_task_id}>
              {submitting ? "Recording..." : "Record Cost"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "byBus" && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3><BarChart3 size={14} /> Lifetime Maintenance Cost per Bus</h3>
            <span className={styles.grandTotal}>Fleet total: {Number(byBus.grandTotal).toLocaleString()}</span>
          </div>
          {chartLoading ? <div className={styles.loading}>Loading...</div> : (
            byBus.buses.length === 0 ? (
              <div className={styles.emptyState}>No cost records yet.</div>
            ) : (
              <div className={styles.barChart}>
                {byBus.buses.map((b: any) => (
                  <div key={b.busId} className={styles.barCol}>
                    <div className={styles.barValue}>{Number(b.totalCost).toLocaleString()}</div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ height: `${Math.max((b.totalCost / maxBusCost) * 100, 2)}%` }} />
                    </div>
                    <div className={styles.barLabel}>{b.plateNumber}</div>
                    <div className={styles.barSub}>{b.taskCount} task(s)</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === "age" && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3><TrendingUp size={14} /> Maintenance Cost vs Bus Age</h3>
            <span className={styles.grandTotal}>{agePoints.length} buses</span>
          </div>
          {chartLoading ? <div className={styles.loading}>Loading...</div> : (
            agePoints.length === 0 ? (
              <div className={styles.emptyState}>No buses in fleet.</div>
            ) : (
              <div className={styles.scatterWrap}>
                <svg viewBox="0 0 680 360" className={styles.scatterSvg}>
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                    <g key={f}>
                      <line x1="70" y1={20 + f * 300} x2="650" y2={20 + f * 300} className={styles.gridLine} />
                      <text x="12" y={26 + f * 300} className={styles.axisLabel}>{Math.round(maxCost * (1 - f)).toLocaleString()}</text>
                    </g>
                  ))}
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                    <g key={`x${f}`}>
                      <line x1={70 + f * 580} y1="20" x2={70 + f * 580} y2="320" className={styles.gridLineV} />
                      <text x={70 + f * 580 - 12} y="342" className={styles.axisLabel}>{Math.round(maxAge * f * 10) / 10}</text>
                    </g>
                  ))}
                  {agePoints.map((p, i) => {
                    const cx = 70 + (p.ageYears / maxAge) * 580;
                    const cy = 320 - (p.totalCost / maxCost) * 300;
                    const r = Math.min(4 + p.taskCount * 1.5, 16);
                    return (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r={r} className={styles.scatterDot} />
                        <title>{`${p.plateNumber}: ${p.ageYears} yrs, ${p.totalCost.toLocaleString()} cost, ${p.taskCount} tasks`}</title>
                      </g>
                    );
                  })}
                </svg>
                <div className={styles.scatterLegend}>
                  <span><span className={styles.legendDot} /> Dot size = number of tasks</span>
                  <span>X: bus age (years) · Y: lifetime maintenance cost</span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}