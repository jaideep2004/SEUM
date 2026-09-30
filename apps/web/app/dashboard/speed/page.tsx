"use client";

import { useCallback, useState } from "react";
import { Gauge, Save } from "lucide-react";
import { useLanguage, formatDate, formatDateTime, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("seum_access_token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function unwrapList(json: unknown): any[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") return [data];
  }
  return [];
}

function todayRange() {
  const d = new Date().toISOString().slice(0, 10);
  return { from: d, to: d };
}

export default function SpeedMonitorPage() {
  const { lang, t } = useLanguage();
  // Overspeed report state
  const [from, setFrom] = useState(todayRange().from);
  const [to, setTo] = useState(todayRange().to);
  const [busId, setBusId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Route settings state
  const [routeId, setRouteId] = useState("");
  const [routeSettings, setRouteSettings] = useState({
    deviation_tolerance_meters: "",
    deviation_tolerance_minutes: "",
    speed_threshold_kmh: "",
  });

  // Per-bus threshold state
  const [busThresholdId, setBusThresholdId] = useState("");
  const [busThreshold, setBusThreshold] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(new Date(to).getTime() + 24 * 3600 * 1000 - 1).toISOString());
      if (busId.trim()) params.set("busId", busId.trim());
      if (driverId.trim()) params.set("driverId", driverId.trim());
      const res = await fetch(`${API}/gps/overspeed-report?${params}`, { headers: authHeaders() });
      const json = await res.json();
      const data = (json && typeof json === "object" && "data" in (json as object)
        ? (json as { data: unknown }).data
        : json) as any;
      setReport(data);
      if (!data) setError(t("tracking.speed.errEmpty"));
    } catch {
      setError(t("tracking.speed.errReport"));
    } finally {
      setReportLoading(false);
    }
  }, [from, to, busId, driverId]);

  async function loadRouteSettings() {
    if (!routeId.trim()) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${API}/gps/route-settings/${routeId.trim()}`, { headers: authHeaders() });
      const json = await res.json();
      const data = ((json as { data?: unknown })?.data ?? json) as Record<string, unknown>;
      setRouteSettings({
        deviation_tolerance_meters: String(data.deviation_tolerance_meters ?? ""),
        deviation_tolerance_minutes: String(data.deviation_tolerance_minutes ?? ""),
        speed_threshold_kmh: String(data.speed_threshold_kmh ?? ""),
      });
    } catch {
      setError(t("tracking.speed.errRouteSettings"));
    }
  }

  async function saveRouteSettings() {
    if (!routeId.trim()) return;
    setError("");
    setNotice("");
    const payload = {
      deviation_tolerance_meters: Number(routeSettings.deviation_tolerance_meters),
      deviation_tolerance_minutes: Number(routeSettings.deviation_tolerance_minutes),
      speed_threshold_kmh: Number(routeSettings.speed_threshold_kmh),
    };
    if (Object.values(payload).some((v) => !Number.isFinite(v) || v < 0)) {
      setError(t("tracking.speed.errRouteNonNeg"));
      return;
    }
    try {
      const res = await fetch(`${API}/gps/route-settings/${routeId.trim()}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || (json as { success?: boolean }).success === false) {
        setError((json as { message?: string }).message || t("tracking.speed.errSave"));
        return;
      }
      setNotice(t("tracking.speed.routeSaved"));
    } catch {
      setError(t("tracking.speed.errRouteNetwork"));
    }
  }

  async function saveBusThreshold() {
    if (!busThresholdId.trim()) return;
    setError("");
    setNotice("");
    const value = Number(busThreshold);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("tracking.speed.errBusPositive"));
      return;
    }
    try {
      // Field name follows backend bus validation; server errors are surfaced below.
      const res = await fetch(`${API}/fleet/buses/${busThresholdId.trim()}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ speedThresholdKmh: value }),
      });
      const json = await res.json();
      if (!res.ok || (json as { success?: boolean }).success === false) {
        setError((json as { message?: string }).message || t("tracking.speed.errSave"));
        return;
      }
      setNotice(t("tracking.speed.busSaved"));
    } catch {
      setError(t("tracking.speed.errBusNetwork"));
    }
  }

  const byDriver = report?.byDriver && Array.isArray(report.byDriver) ? report.byDriver : null;
  const byTrip = report?.byTrip && Array.isArray(report.byTrip) ? report.byTrip : null;
  const eventRows: any[] = byDriver || byTrip
    ? []
    : report?.events && Array.isArray(report.events)
      ? report.events
      : Array.isArray(report)
        ? report
        : report
          ? unwrapList(report)
          : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("tracking.speed.title")}</h1>
          <p className={styles.pageDesc}>{t("tracking.speed.desc")}</p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.success}>{notice}</p>}

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Gauge size={16} /> {t("tracking.speed.reportTitle")}</h2>
            <div className={styles.filterRow}>
              <div className={styles.filterField}>
                <label className={styles.fieldLabel} htmlFor="sp-from">{t("common.from")}</label>
                <input id="sp-from" type="date" className={styles.input} value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className={styles.filterField}>
                <label className={styles.fieldLabel} htmlFor="sp-to">{t("common.to")}</label>
                <input id="sp-to" type="date" className={styles.input} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className={styles.filterField}>
                <label className={styles.fieldLabel} htmlFor="sp-bus">{t("tracking.speed.busId")}</label>
                <input id="sp-bus" className={styles.input} value={busId} onChange={(e) => setBusId(e.target.value)} placeholder={t("tracking.speed.optional")} />
              </div>
              <div className={styles.filterField}>
                <label className={styles.fieldLabel} htmlFor="sp-driver">{t("tracking.speed.driverId")}</label>
                <input id="sp-driver" className={styles.input} value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder={t("tracking.speed.optional")} />
              </div>
              <button className={styles.primaryBtn} onClick={loadReport} disabled={reportLoading}>
                {reportLoading ? t("tracking.speed.loadingEllipsis") : t("tracking.speed.runReport")}
              </button>
            </div>

            {report === null ? (
              <p className={styles.empty}>{t("tracking.speed.pickRange")}</p>
            ) : (
              <>
                {byDriver && (
                  <>
                    <h3 className={styles.sectionTitle}>{t("tracking.speed.byDriver")}</h3>
                    <table className={styles.table}>
                      <thead><tr><th>{t("roles.driver")}</th><th>{t("tracking.speed.colEvents")}</th><th>{t("tracking.speed.colMaxSpeed")}</th></tr></thead>
                      <tbody>
                        {byDriver.map((r: any, i: number) => (
                          <tr key={i}>
                            <td>{r.driverName || r.driverId || "—"}</td>
                            <td>{r.count ?? r.eventCount ?? "—"}</td>
                            <td className={styles.maxSpeed}>{r.maxSpeed ?? r.maxSpeedKmh ?? "—"}{r.maxSpeed || r.maxSpeedKmh ? ` ${t("tracking.speed.speedUnit")}` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {byTrip && (
                  <>
                    <h3 className={styles.sectionTitle}>{t("tracking.speed.byTrip")}</h3>
                    <table className={styles.table}>
                      <thead><tr><th>{t("tracking.speed.colTrip")}</th><th>{t("tracking.speed.colEvents")}</th><th>{t("tracking.speed.colMaxSpeed")}</th></tr></thead>
                      <tbody>
                        {byTrip.map((r: any, i: number) => (
                          <tr key={i}>
                            <td>{r.tripName || r.tripId || "—"}</td>
                            <td>{r.count ?? r.eventCount ?? "—"}</td>
                            <td className={styles.maxSpeed}>{r.maxSpeed ?? r.maxSpeedKmh ?? "—"}{r.maxSpeed || r.maxSpeedKmh ? ` ${t("tracking.speed.speedUnit")}` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {eventRows.length > 0 && (
                  <>
                    <h3 className={styles.sectionTitle}>{t("tracking.speed.eventsWord")} ({eventRows.length})</h3>
                    <table className={styles.table}>
                      <thead><tr><th>{t("roles.driver")}</th><th>{t("tracking.speed.colTrip")}</th><th>{t("tracking.speed.colSpeed")}</th><th>{t("tracking.speed.colAt")}</th></tr></thead>
                      <tbody>
                        {eventRows.map((r: any, i: number) => (
                          <tr key={r.id || i}>
                            <td>{r.driverName || r.driverId || "—"}</td>
                            <td>{r.tripName || r.tripId || "—"}</td>
                            <td className={styles.maxSpeed}>{r.speedKmh ?? r.speed ?? "—"} {t("tracking.speed.speedUnit")}</td>
                            <td>{r.recordedAt ? formatDateTime(r.recordedAt, lang) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {!byDriver && !byTrip && eventRows.length === 0 && (
                  <p className={styles.empty}>{t("tracking.speed.noEvents")}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("tracking.speed.routeThresholds")}</h2>
            <div className={styles.form}>
              <div>
                <label className={styles.fieldLabel} htmlFor="sp-route">{t("tracking.speed.routeId")}</label>
                <input id="sp-route" className={styles.input} value={routeId} onChange={(e) => setRouteId(e.target.value)} placeholder={t("tracking.speed.routeUuid")} />
              </div>
              <button className={styles.primaryBtn} onClick={loadRouteSettings} disabled={!routeId.trim()}>{t("tracking.speed.loadSettings")}</button>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.fieldLabel} htmlFor="sp-dev-m">{t("tracking.speed.devM")}</label>
                  <input id="sp-dev-m" className={styles.input} value={routeSettings.deviation_tolerance_meters} onChange={(e) => setRouteSettings({ ...routeSettings, deviation_tolerance_meters: e.target.value })} inputMode="numeric" />
                </div>
                <div>
                  <label className={styles.fieldLabel} htmlFor="sp-dev-min">{t("tracking.speed.devMin")}</label>
                  <input id="sp-dev-min" className={styles.input} value={routeSettings.deviation_tolerance_minutes} onChange={(e) => setRouteSettings({ ...routeSettings, deviation_tolerance_minutes: e.target.value })} inputMode="numeric" />
                </div>
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="sp-limit">{t("tracking.speed.speedLimit")}</label>
                <input id="sp-limit" className={styles.input} value={routeSettings.speed_threshold_kmh} onChange={(e) => setRouteSettings({ ...routeSettings, speed_threshold_kmh: e.target.value })} inputMode="numeric" />
              </div>
              <button className={styles.primaryBtn} onClick={saveRouteSettings} disabled={!routeId.trim()}>
                <Save size={14} /> {t("tracking.speed.saveRoute")}
              </button>
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.cardTitle}>{t("tracking.speed.busThreshold")}</h2>
            <div className={styles.form}>
              <div>
                <label className={styles.fieldLabel} htmlFor="sp-busid">{t("tracking.speed.busIdLabel")}</label>
                <input id="sp-busid" className={styles.input} value={busThresholdId} onChange={(e) => setBusThresholdId(e.target.value)} placeholder={t("tracking.speed.busUuid")} />
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="sp-busth">{t("tracking.speed.speedLimit")}</label>
                <input id="sp-busth" className={styles.input} value={busThreshold} onChange={(e) => setBusThreshold(e.target.value)} inputMode="numeric" />
              </div>
              <button className={styles.primaryBtn} onClick={saveBusThreshold} disabled={!busThresholdId.trim()}>
                <Save size={14} /> {t("tracking.speed.saveBus")}
              </button>
              <p className={styles.hint}>{t("tracking.speed.busHint")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
