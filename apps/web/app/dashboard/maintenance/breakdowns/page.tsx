"use client";
import { useState, useEffect, useCallback } from "react";
import { List, Plus, Map as MapIcon, AlertTriangle, Wrench, MapPin, Truck, User2, DollarSign, CheckCircle2, Send } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const BREAKDOWN_TYPES: Record<string, string> = {
  engine_failure: "Engine Failure", transmission: "Transmission", electrical: "Electrical",
  tire_blowout: "Tire Blowout", brake_failure: "Brake Failure", suspension: "Suspension",
  fuel_system: "Fuel System", cooling_system: "Cooling System", clutch: "Clutch",
  body_damage: "Body Damage", accident: "Accident", mechanical: "Mechanical", other: "Other",
};
const SEVERITY_COLORS: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#dc2626",
};
const STATUS_COLORS: Record<string, string> = {
  reported: "#dc2626", dispatched: "#f59e0b", in_progress: "#8b5cf6", resolved: "#059669",
};
const STATUS_LABELS: Record<string, string> = {
  reported: "Reported", dispatched: "Dispatched", in_progress: "In Progress", resolved: "Resolved",
};
const STATUS_ACTIONS: Record<string, string> = {
  reported: "Dispatch", dispatched: "Start Work", in_progress: "Resolve", resolved: "",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function heatColor(strength: number) {
  const hue = 0 - strength * 0.28;
  return `hsl(${hue}, 82%, ${52 - strength * 18}%)`;
}

export default function BreakdownsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "report" | "heatmap">("list");

  // List state
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busFilter, setBusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  // Report form state
  const [form, setForm] = useState({
    bus_id: "", trip_id: "", breakdown_type: "mechanical", severity: "medium",
    location: "", location_lat: "", location_lng: "", description: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Action modals
  const [actionRow, setActionRow] = useState<any>(null);
  const [actionType, setActionType] = useState<"dispatch" | "resolve" | null>(null);
  const [mechanicName, setMechanicName] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveCost, setResolveCost] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Heatmap state
  const [heatmap, setHeatmap] = useState<any>({ locations: [] });
  const [heatLoading, setHeatLoading] = useState(false);

  const fetchBuses = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setBuses((data.data || []).filter((b: any) => b.status !== "retired" && b.status !== "sold"));
        setForm((f) => ({ ...f, bus_id: data.data?.[0]?.id || "" }));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  async function fetchBreakdowns() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (busFilter) params.set("bus_id", busFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);
      const res = await fetch(`${API}/maintenance/breakdowns?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setBreakdowns(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchBreakdowns(); }, [activeTab, busFilter, statusFilter, severityFilter]);

  async function fetchHeatmap() {
    setHeatLoading(true);
    const token = getToken();
    if (!token) { setHeatLoading(false); return; }
    try {
      const res = await fetch(`${API}/maintenance/breakdowns/heatmap`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setHeatmap(data.data);
    } catch {}
    setHeatLoading(false);
  }

  useEffect(() => { if (activeTab === "heatmap") fetchHeatmap(); }, [activeTab]);

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/breakdowns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bus_id: form.bus_id,
          trip_id: form.trip_id || undefined,
          breakdown_type: form.breakdown_type,
          severity: form.severity,
          location: form.location,
          location_lat: form.location_lat ? Number(form.location_lat) : undefined,
          location_lng: form.location_lng ? Number(form.location_lng) : undefined,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSubmitError(data.error?.message || "Failed to report breakdown"); return; }
      setForm((f) => ({ ...f, trip_id: "", breakdown_type: "mechanical", severity: "medium", location: "", location_lat: "", location_lng: "", description: "" }));
      setActiveTab("list");
      fetchBreakdowns();
    } catch { setSubmitError("Network error"); }
    setSubmitting(false);
  }

  function openDispatch(row: any) {
    setActionRow(row);
    setActionType("dispatch");
    setMechanicName("");
    setActionError("");
  }

  function openResolve(row: any) {
    setActionRow(row);
    setActionType("resolve");
    setResolveNotes("");
    setResolveCost("");
    setActionError("");
  }

  async function runAction() {
    if (!actionRow) return;
    setActionLoading(true);
    setActionError("");
    const token = getToken();
    try {
      const body =
        actionType === "dispatch" ? { mechanic: mechanicName }
        : { notes: resolveNotes || undefined, cost: resolveCost ? Number(resolveCost) : undefined };
      const res = await fetch(`${API}/maintenance/breakdowns/${actionRow.id}/${actionType === "dispatch" ? "dispatch" : "resolve"}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setActionError(data.error?.message || "Action failed"); return; }
      setActionRow(null);
      setActionType(null);
      fetchBreakdowns();
    } catch { setActionError("Network error"); }
    setActionLoading(false);
  }

  async function handleStart(row: any) {
    setActionLoading(true);
    const token = getToken();
    try {
      await fetch(`${API}/maintenance/breakdowns/${row.id}/start`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      fetchBreakdowns();
    } catch {}
    setActionLoading(false);
  }

  // Heatmap layout: cluster blocks by location
  const maxCount = heatmap.locations.reduce((m: number, l: any) => Math.max(m, l.count), 1);
  const gridCols = Math.max(2, Math.ceil(Math.sqrt(heatmap.locations.length || 1)));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Breakdowns & Emergency Repair</h1>
          <p className={styles.subtitle}>Report, dispatch and resolve on-road breakdowns across the fleet.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}><List size={14} /> Breakdowns</button>
        <button className={`${styles.tab} ${activeTab === "report" ? styles.tabActive : ""}`} onClick={() => setActiveTab("report")}><Plus size={14} /> Report Breakdown</button>
        <button className={`${styles.tab} ${activeTab === "heatmap" ? styles.tabActive : ""}`} onClick={() => setActiveTab("heatmap")}><MapIcon size={14} /> Heat Map</button>
      </div>

      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All buses</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All severities</option>
              {Object.keys(SEVERITY_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loading ? <div className={styles.loading}>Loading breakdowns...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Bus</th><th>Type</th><th>Severity</th><th>Location</th><th>Reported</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdowns.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <span className={styles.plateLink}>{b.bus?.plateNumber || "—"}</span>
                        <div className={styles.cellSub}>{b.bus?.make} {b.bus?.model}</div>
                        {b.route && <div className={styles.cellSub}>{b.route.name}</div>}
                      </td>
                      <td>
                        <span className={styles.typeLabel}>{BREAKDOWN_TYPES[b.breakdownType] || b.breakdownType}</span>
                        {b.description && <div className={styles.cellSub}>{b.description.slice(0, 60)}</div>}
                      </td>
                      <td>
                        <span className={styles.severityBadge} style={{ background: (SEVERITY_COLORS[b.severity] || "#6b7280") + "18", color: SEVERITY_COLORS[b.severity] || "#6b7280" }}>
                          {b.severity}
                        </span>
                      </td>
                      <td>
                        <span className={styles.locCell}><MapPin size={12} /> {b.location}</span>
                      </td>
                      <td>{fmtDateTime(b.createdAt)}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[b.status] || "#6b7280") + "18", color: STATUS_COLORS[b.status] || "#6b7280" }}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                        {b.dispatchedMechanic && <div className={styles.cellSub}><User2 size={10} /> {b.dispatchedMechanic}</div>}
                        {b.cost != null && b.status === "resolved" && <div className={styles.cellSub}><DollarSign size={10} /> {Number(b.cost).toLocaleString()}</div>}
                      </td>
                      <td>
                        {b.status === "reported" && (
                          <button className={styles.dispatchBtn} onClick={() => openDispatch(b)} disabled={actionLoading !== null}>
                            <Send size={12} /> Dispatch
                          </button>
                        )}
                        {b.status === "dispatched" && (
                          <button className={styles.startBtn} onClick={() => handleStart(b)} disabled={actionLoading !== null}>
                            <Wrench size={12} /> Start Work
                          </button>
                        )}
                        {b.status === "in_progress" && (
                          <button className={styles.resolveBtn} onClick={() => openResolve(b)} disabled={actionLoading !== null}>
                            <CheckCircle2 size={12} /> Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {breakdowns.length === 0 && (
                    <tr><td colSpan={7} className={styles.emptyState}>No breakdown reports — report one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "report" && (
        <form className={styles.form} onSubmit={handleReport}>
          {submitError && <div className={styles.error}>{submitError}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Bus *</label>
              <select value={form.bus_id} onChange={(e) => setForm({ ...form, bus_id: e.target.value })}>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.make} {b.model}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Trip (optional)</label>
              <input type="text" value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} placeholder="Trip UUID if on a trip" />
            </div>
            <div className={styles.field}>
              <label>Breakdown Type *</label>
              <select value={form.breakdown_type} onChange={(e) => setForm({ ...form, breakdown_type: e.target.value })}>
                {Object.entries(BREAKDOWN_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fieldHalf}`}>
              <label>Location *</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Route 40 — KM 210" required />
            </div>
            <div className={styles.field}>
              <label>Latitude</label>
              <input type="number" step="any" min="-90" max="90" value={form.location_lat} onChange={(e) => setForm({ ...form, location_lat: e.target.value })} placeholder="24.7136" />
            </div>
            <div className={styles.field}>
              <label>Longitude</label>
              <input type="number" step="any" min="-180" max="180" value={form.location_lng} onChange={(e) => setForm({ ...form, location_lng: e.target.value })} placeholder="46.6753" />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What happened? What was the engine doing?" />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.bus_id || !form.location.trim()}>
              {submitting ? "Reporting..." : "Report Breakdown"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "heatmap" && (
        <div className={styles.heatWrap}>
          <div className={styles.heatHeader}>
            <div>
              <h3><MapIcon size={14} /> Breakdown Heat Map</h3>
              <p className={styles.cellSub}>Where do breakdowns happen most? Cell size and colour = total reports at that location.</p>
            </div>
            {!heatLoading && heatmap.locations.length > 0 && (
              <div className={styles.heatStats}>
                <span className={styles.heatStat}><strong>{heatmap.total}</strong> total</span>
                <span className={styles.heatStatOpen}><strong>{heatmap.open}</strong> open</span>
                <span className={styles.heatStatLoc}><strong>{heatmap.locations.length}</strong> locations</span>
              </div>
            )}
          </div>
          {heatLoading ? <div className={styles.loading}>Building heat map...</div> : (
            heatmap.locations.length === 0 ? (
              <div className={styles.emptyState}>No breakdowns yet — report one to grow the heat map.</div>
            ) : (
              <div className={styles.heatGrid} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                {heatmap.locations.map((l: any, i: number) => {
                  const strength = maxCount > 0 ? l.count / maxCount : 0;
                  return (
                    <div key={`${l.location}-${i}`} className={styles.heatCell} style={{ background: heatColor(strength), opacity: 0.75 + strength * 0.25 }}>
                      <div className={styles.heatNum}>{l.count}</div>
                      <div className={styles.heatLoc}>{l.location}</div>
                      <div className={styles.heatMeta}>
                        {l.openCount > 0 && <span className={styles.heatOpen}>{l.openCount} open</span>}
                        {l.avgCost != null && <span>{Number(l.avgCost).toLocaleString()} avg cost</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {actionRow && actionType === "dispatch" && (
        <div className={styles.overlay} onClick={() => setActionRow(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Dispatch Mechanic</h2>
            <p className={styles.modalSub}>
              <Truck size={12} /> {actionRow.bus?.plateNumber} — {actionRow.location}
            </p>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.field}>
              <label>Mechanic / Workshop *</label>
              <input type="text" value={mechanicName} onChange={(e) => setMechanicName(e.target.value)} placeholder="e.g. Ali — Al Wadi Garage" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setActionRow(null)}>Back</button>
              <button className={styles.dispatchBtn} onClick={runAction} disabled={actionLoading || !mechanicName.trim()}>
                <Send size={14} /> {actionLoading ? "Dispatching..." : "Confirm Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionRow && actionType === "resolve" && (
        <div className={styles.overlay} onClick={() => setActionRow(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Resolve Breakdown</h2>
            <p className={styles.modalSub}>
              <Truck size={12} /> {actionRow.bus?.plateNumber} — {actionRow.location}
            </p>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.field}>
              <label>Resolution Notes</label>
              <textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} rows={3} placeholder="What was the fix?" />
            </div>
            <div className={styles.field}>
              <label>Cost</label>
              <input type="number" min="0" step="0.01" value={resolveCost} onChange={(e) => setResolveCost(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setActionRow(null)}>Back</button>
              <button className={styles.resolveBtn} onClick={runAction} disabled={actionLoading}>
                {actionLoading ? "Resolving..." : "Confirm Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}