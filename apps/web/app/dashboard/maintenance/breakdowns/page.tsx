"use client";
import { useState, useEffect, useCallback } from "react";
import { List, Plus, Map as MapIcon, AlertTriangle, Wrench, MapPin, Truck, User2, DollarSign, CheckCircle2, Send } from "lucide-react";
import { useLanguage, formatNumber, localeOf } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const BREAKDOWN_KEYS: Record<string, string> = {
  engine_failure: "maintenance.breakdowns.ty.engine", transmission: "maintenance.breakdowns.ty.transmission", electrical: "maintenance.taskTypes.electrical",
  tire_blowout: "maintenance.breakdowns.ty.tire", brake_failure: "maintenance.breakdowns.ty.brake", suspension: "maintenance.breakdowns.ty.suspension",
  fuel_system: "maintenance.breakdowns.ty.fuel", cooling_system: "maintenance.breakdowns.ty.cooling", clutch: "maintenance.breakdowns.ty.clutch",
  body_damage: "maintenance.breakdowns.ty.body", accident: "maintenance.breakdowns.ty.accident", mechanical: "maintenance.breakdowns.ty.mechanical", other: "maintenance.breakdowns.ty.other",
};
const SEVERITY_COLORS: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#dc2626",
};
const SEVERITY_KEYS: Record<string, string> = {
  low: "maintenance.priority.low", medium: "maintenance.priority.medium", high: "maintenance.priority.high", critical: "maintenance.priority.critical",
};
const STATUS_COLORS: Record<string, string> = {
  reported: "#dc2626", dispatched: "#f59e0b", in_progress: "#8b5cf6", resolved: "#059669",
};
const STATUS_KEYS: Record<string, string> = {
  reported: "maintenance.breakdowns.st.reported", dispatched: "maintenance.breakdowns.st.dispatched", in_progress: "maintenance.status.inProgress", resolved: "maintenance.breakdowns.st.resolved",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function heatColor(strength: number) {
  const hue = 0 - strength * 0.28;
  return `hsl(${hue}, 82%, ${52 - strength * 18}%)`;
}

export default function BreakdownsPage() {
  const { lang, t } = useLanguage();
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

  function fmtDateTime(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString(localeOf(lang), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const fetchBuses = useCallback(async () => {
    const token = getToken();
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
      if (!data.success) { setSubmitError(data.error?.message || t("maintenance.breakdowns.reportFailed")); return; }
      setForm((f) => ({ ...f, trip_id: "", breakdown_type: "mechanical", severity: "medium", location: "", location_lat: "", location_lng: "", description: "" }));
      setActiveTab("list");
      fetchBreakdowns();
    } catch { setSubmitError(t("maintenance.common.networkError")); }
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
      if (!data.success) { setActionError(data.error?.message || t("maintenance.taskDetail.actionFailed")); return; }
      setActionRow(null);
      setActionType(null);
      fetchBreakdowns();
    } catch { setActionError(t("maintenance.common.networkError")); }
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
          <h1>{t("maintenance.breakdowns.title")}</h1>
          <p className={styles.subtitle}>{t("maintenance.breakdowns.sub")}</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}><List size={14} /> {t("maintenance.breakdowns.tabList")}</button>
        <button className={`${styles.tab} ${activeTab === "report" ? styles.tabActive : ""}`} onClick={() => setActiveTab("report")}><Plus size={14} /> {t("maintenance.breakdowns.tabReport")}</button>
        <button className={`${styles.tab} ${activeTab === "heatmap" ? styles.tabActive : ""}`} onClick={() => setActiveTab("heatmap")}><MapIcon size={14} /> {t("maintenance.breakdowns.tabHeat")}</button>
      </div>

      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{t("maintenance.breakdowns.filterBus")}</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{t("maintenance.breakdowns.filterStatus")}</option>
              {Object.entries(STATUS_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{t("maintenance.breakdowns.filterSeverity")}</option>
              {Object.keys(SEVERITY_COLORS).map((s) => <option key={s} value={s}>{t(SEVERITY_KEYS[s] || s)}</option>)}
            </select>
          </div>

          {loading ? <div className={styles.loading}>{t("maintenance.breakdowns.loading")}</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("maintenance.breakdowns.colBus")}</th><th>{t("maintenance.breakdowns.colType")}</th><th>{t("maintenance.breakdowns.colSeverity")}</th><th>{t("maintenance.breakdowns.colLocation")}</th><th>{t("maintenance.breakdowns.colReported")}</th><th>{t("maintenance.breakdowns.colStatus")}</th><th>{t("maintenance.breakdowns.colAction")}</th>
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
                        <span className={styles.typeLabel}>{t(BREAKDOWN_KEYS[b.breakdownType] || b.breakdownType)}</span>
                        {b.description && <div className={styles.cellSub}>{b.description.slice(0, 60)}</div>}
                      </td>
                      <td>
                        <span className={styles.severityBadge} style={{ background: (SEVERITY_COLORS[b.severity] || "#6b7280") + "18", color: SEVERITY_COLORS[b.severity] || "#6b7280" }}>
                          {t(SEVERITY_KEYS[b.severity] || b.severity)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.locCell}><MapPin size={12} /> {b.location}</span>
                      </td>
                      <td>{fmtDateTime(b.createdAt)}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[b.status] || "#6b7280") + "18", color: STATUS_COLORS[b.status] || "#6b7280" }}>
                          {t(STATUS_KEYS[b.status] || b.status)}
                        </span>
                        {b.dispatchedMechanic && <div className={styles.cellSub}><User2 size={10} /> {b.dispatchedMechanic}</div>}
                        {b.cost != null && b.status === "resolved" && <div className={styles.cellSub}><DollarSign size={10} /> {formatNumber(Number(b.cost), lang)}</div>}
                      </td>
                      <td>
                        {b.status === "reported" && (
                          <button className={styles.dispatchBtn} onClick={() => openDispatch(b)} disabled={actionLoading !== null}>
                            <Send size={12} /> {t("maintenance.breakdowns.actDispatch")}
                          </button>
                        )}
                        {b.status === "dispatched" && (
                          <button className={styles.startBtn} onClick={() => handleStart(b)} disabled={actionLoading !== null}>
                            <Wrench size={12} /> {t("maintenance.taskDetail.start")}
                          </button>
                        )}
                        {b.status === "in_progress" && (
                          <button className={styles.resolveBtn} onClick={() => openResolve(b)} disabled={actionLoading !== null}>
                            <CheckCircle2 size={12} /> {t("maintenance.breakdowns.actResolve")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {breakdowns.length === 0 && (
                    <tr><td colSpan={7} className={styles.emptyState}>{t("maintenance.breakdowns.empty")}</td></tr>
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
              <label>{t("maintenance.breakdowns.formBus")}</label>
              <select value={form.bus_id} onChange={(e) => setForm({ ...form, bus_id: e.target.value })}>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.make} {b.model}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.formTrip")}</label>
              <input type="text" value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} placeholder={t("maintenance.breakdowns.phTrip")} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.formType")}</label>
              <select value={form.breakdown_type} onChange={(e) => setForm({ ...form, breakdown_type: e.target.value })}>
                {Object.entries(BREAKDOWN_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.colSeverity")}</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{t(SEVERITY_KEYS[s])}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fieldHalf}`}>
              <label>{t("maintenance.breakdowns.formLocation")}</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("maintenance.breakdowns.phLocation")} required />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.formLat")}</label>
              <input type="number" step="any" min="-90" max="90" value={form.location_lat} onChange={(e) => setForm({ ...form, location_lat: e.target.value })} placeholder="24.7136" />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.formLng")}</label>
              <input type="number" step="any" min="-180" max="180" value={form.location_lng} onChange={(e) => setForm({ ...form, location_lng: e.target.value })} placeholder="46.6753" />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>{t("common.description")}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder={t("maintenance.breakdowns.phDesc")} />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.bus_id || !form.location.trim()}>
              {submitting ? t("maintenance.breakdowns.reporting") : t("maintenance.breakdowns.tabReport")}
            </button>
          </div>
        </form>
      )}

      {activeTab === "heatmap" && (
        <div className={styles.heatWrap}>
          <div className={styles.heatHeader}>
            <div>
              <h3><MapIcon size={14} /> {t("maintenance.breakdowns.heatTitle")}</h3>
              <p className={styles.cellSub}>{t("maintenance.breakdowns.heatSub")}</p>
            </div>
            {!heatLoading && heatmap.locations.length > 0 && (
              <div className={styles.heatStats}>
                <span className={styles.heatStat}><strong>{heatmap.total}</strong> {t("maintenance.breakdowns.heatTotal")}</span>
                <span className={styles.heatStatOpen}><strong>{heatmap.open}</strong> {t("maintenance.breakdowns.heatOpen")}</span>
                <span className={styles.heatStatLoc}><strong>{heatmap.locations.length}</strong> {t("maintenance.breakdowns.heatLocations")}</span>
              </div>
            )}
          </div>
          {heatLoading ? <div className={styles.loading}>{t("maintenance.breakdowns.heatLoading")}</div> : (
            heatmap.locations.length === 0 ? (
              <div className={styles.emptyState}>{t("maintenance.breakdowns.heatEmpty")}</div>
            ) : (
              <div className={styles.heatGrid} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                {heatmap.locations.map((l: any, i: number) => {
                  const strength = maxCount > 0 ? l.count / maxCount : 0;
                  return (
                    <div key={`${l.location}-${i}`} className={styles.heatCell} style={{ background: heatColor(strength), opacity: 0.75 + strength * 0.25 }}>
                      <div className={styles.heatNum}>{l.count}</div>
                      <div className={styles.heatLoc}>{l.location}</div>
                      <div className={styles.heatMeta}>
                        {l.openCount > 0 && <span className={styles.heatOpen}>{l.openCount} {t("maintenance.breakdowns.heatOpen")}</span>}
                        {l.avgCost != null && <span>{formatNumber(Number(l.avgCost), lang)} {t("maintenance.breakdowns.heatAvgCost")}</span>}
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
            <h2>{t("maintenance.breakdowns.modalDispatchTitle")}</h2>
            <p className={styles.modalSub}>
              <Truck size={12} /> {actionRow.bus?.plateNumber} — {actionRow.location}
            </p>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.modalMechanic")}</label>
              <input type="text" value={mechanicName} onChange={(e) => setMechanicName(e.target.value)} placeholder={t("maintenance.breakdowns.phMechanic")} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setActionRow(null)}>{t("common.back")}</button>
              <button className={styles.dispatchBtn} onClick={runAction} disabled={actionLoading || !mechanicName.trim()}>
                <Send size={14} /> {actionLoading ? t("maintenance.breakdowns.dispatching") : t("maintenance.breakdowns.confirmDispatch")}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionRow && actionType === "resolve" && (
        <div className={styles.overlay} onClick={() => setActionRow(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{t("maintenance.breakdowns.modalResolveTitle")}</h2>
            <p className={styles.modalSub}>
              <Truck size={12} /> {actionRow.bus?.plateNumber} — {actionRow.location}
            </p>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.modalNotes")}</label>
              <textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} rows={3} placeholder={t("maintenance.breakdowns.phNotes")} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.breakdowns.modalCost")}</label>
              <input type="number" min="0" step="0.01" value={resolveCost} onChange={(e) => setResolveCost(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setActionRow(null)}>{t("common.back")}</button>
              <button className={styles.resolveBtn} onClick={runAction} disabled={actionLoading}>
                {actionLoading ? t("maintenance.breakdowns.resolving") : t("maintenance.breakdowns.confirmResolve")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
