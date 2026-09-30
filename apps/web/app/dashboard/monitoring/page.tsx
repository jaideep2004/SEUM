"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bus, Clock, AlertTriangle, Play, CheckCircle, XCircle, RefreshCw, Search,
  Navigation, MapPin, Filter, ExternalLink, Radio,
} from "lucide-react";
import TimelineComparison from "@/components/TimelineComparison";
import { useSocket, useSocketEvent } from "@/components/SocketProvider";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280",
  cancelled: "#ef4444", delayed: "#f59e0b",
};

export default function MonitoringDashboard() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [delayedTrips, setDelayedTrips] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [overrideTrip, setOverrideTrip] = useState<any>(null);
  const [overrideStatus, setOverrideStatus] = useState("en_route");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [timelineTrip, setTimelineTrip] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [liveFeed, setLiveFeed] = useState<Array<{ kind: string; title: string; at: string }>>([]);
  const { connected } = useSocket();

  function pushFeed(kind: string, title: string) {
    setLiveFeed((prev) => [{ kind, title, at: new Date().toISOString() }, ...prev].slice(0, 20));
  }

  useSocketEvent<any>("geofence:triggered", (p) => {
    pushFeed(
      "geofence",
      `Geofence ${p?.event || p?.type || "triggered"}: ${p?.geofenceName || p?.geofenceId || "zone"} · ${p?.plateNumber || p?.busId || "bus"}`
    );
  });
  useSocketEvent<any>("trip:delayed", (p) => {
    pushFeed(
      "delay",
      `Trip delayed: ${p?.routeName || p?.tripId || "trip"}${p?.delayMinutes ? ` (+${p.delayMinutes} min)` : ""}`
    );
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem("seum_access_token");
      const date = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API}/operations/monitoring/dashboard?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setActiveTrips(json.data.activeTrips);
        setDelayedTrips(json.data.delayedTrips);
        setStats(json.data.stats);
        setLastUpdated(new Date());
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  async function handleOverride(tripId: string) {
    setActionLoading(tripId);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/monitoring/trips/${tripId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: overrideStatus, notes: overrideNotes }),
      });
      const json = await res.json();
      if (!json.success) { alert(json.message || t("tracking.mon.overrideFailed")); return; }
      setShowOverrideModal(false);
      setOverrideTrip(null);
      setOverrideNotes("");
      await fetchDashboard();
    } catch { alert(t("tracking.mon.networkError")); } finally { setActionLoading(null); }
  }

  async function openTimeline(tripId: string) {
    setTimelineTrip(tripId);
    setTimelineLoading(true);
    setTimelineData(null);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/monitoring/trips/${tripId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setTimelineData(json.data);
    } catch {} finally { setTimelineLoading(false); }
  }

  const filteredActive = activeTrips.filter(t =>
    !search || t.routeName?.toLowerCase().includes(search.toLowerCase()) ||
    t.busPlate?.toLowerCase().includes(search.toLowerCase()) ||
    t.driverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("tracking.mon.title")}</h1>
          <p className={styles.pageDesc}>
            {t("tracking.mon.desc")}
            {t("tracking.mon.lastUpdated")} {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.refreshBtn} ${autoRefresh ? styles.refreshActive : ""}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} /> {autoRefresh ? t("tracking.mon.auto") : t("tracking.mon.manual")}
          </button>
          <button className={styles.refreshBtn} onClick={fetchDashboard} disabled={loading}>
            <RefreshCw size={14} className={loading ? styles.spin : ""} /> {t("tracking.mon.refresh")}
          </button>
          <Link href="/dashboard/delays" className={styles.delaysBtn}>
            <AlertTriangle size={14} /> {t("tracking.mon.delayDash")}
          </Link>
        </div>
      </div>

      {/* Status Summary Strip */}
      <div className={styles.statusStrip}>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #3b82f6" }}>
          <span className={styles.stripValue}>{stats.scheduled || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.scheduled")}</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #10b981" }}>
          <span className={styles.stripValue}>{stats.en_route || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.enRoute")}</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #f59e0b" }}>
          <span className={styles.stripValue}>{stats.delayed || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.delayed")}</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #6b7280" }}>
          <span className={styles.stripValue}>{stats.completed || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.completed")}</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #ef4444" }}>
          <span className={styles.stripValue}>{stats.cancelled || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.cancelled")}</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #8b5cf6" }}>
          <span className={styles.stripValue}>{stats.total_trips || 0}</span>
          <span className={styles.stripLabel}>{t("tracking.mon.totalToday")}</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Active Trips */}
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><Radio size={16} /> {t("tracking.mon.activeTrips")}</h2>
              <div className={styles.searchWrap}>
                <Search size={13} className={styles.searchIcon} />
                <input className={styles.searchInput} placeholder={t("tracking.mon.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <p className={styles.loading}>{t("tracking.mon.loadingActive")}</p>
            ) : filteredActive.length === 0 ? (
              <p className={styles.empty}>{t("tracking.mon.emptyActive")}</p>
            ) : (
              <div className={styles.tripList}>
                {filteredActive.map((trip) => (
                  <div key={trip.id} className={`${styles.tripCard} ${styles[`trip_${trip.status}`]}`}>
                    <div className={styles.tripHeader}>
                      <div className={styles.tripRoute}>
                        <MapPin size={13} />
                        <span className={styles.routeName}>{trip.routeName || "—"}</span>
                      </div>
                      <span className={styles.statusBadge} style={{ background: STATUS_COLORS[trip.status] + "20", color: STATUS_COLORS[trip.status] }}>
                        {trip.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className={styles.tripMeta}>
                      <span><Bus size={12} /> {trip.busPlate || "—"}</span>
                      <span><Clock size={12} /> {trip.scheduledStartTime?.slice(0, 5) || "—"}</span>
                      {trip.delayMinutes && (
                        <span className={styles.delayChip}>
                          <AlertTriangle size={12} /> +{trip.delayMinutes} {t("tracking.mon.min")}
                        </span>
                      )}
                    </div>

                    {trip.driverName && (
                      <span className={styles.driverName}>{trip.driverName}</span>
                    )}

                    {/* Large Status Override Buttons */}
                    <div className={styles.overrideRow}>
                      {trip.status === "scheduled" && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideStart}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("en_route"); setShowOverrideModal(true); }}
                        >
                          <Play size={18} /> {t("tracking.mon.startTrip")}
                        </button>
                      )}
                      {trip.status === "en_route" && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideComplete}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("completed"); setShowOverrideModal(true); }}
                        >
                          <CheckCircle size={18} /> {t("tracking.mon.complete")}
                        </button>
                      )}
                      {(trip.status === "scheduled" || trip.status === "en_route") && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideDelay}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("delayed"); setShowOverrideModal(true); }}
                        >
                          <AlertTriangle size={18} /> {t("tracking.mon.markDelayed")}
                        </button>
                      )}
                      {(trip.status === "scheduled" || trip.status === "delayed") && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideCancel}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("cancelled"); setShowOverrideModal(true); }}
                        >
                          <XCircle size={18} /> {t("tracking.mon.cancelTrip")}
                        </button>
                      )}
                      <button className={styles.timelineBtn} onClick={() => openTimeline(trip.id)}>
                        <Clock size={14} /> {t("tracking.mon.timeline")}
                      </button>
                      <Link href={`/dashboard/trips/${trip.id}`} className={styles.viewBtn}>
                        <ExternalLink size={14} />
                      </Link>
                    </div>

                    {/* Inline Timeline */}
                    {timelineTrip === trip.id && (
                      <div className={styles.inlineTimeline}>
                        <TimelineComparison data={timelineData} loading={timelineLoading} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delayed Sidebar */}
        <div className={styles.sideCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><AlertTriangle size={16} /> {t("tracking.mon.delayedNow")}</h2>
            </div>
            {delayedTrips.length === 0 ? (
              <p className={styles.empty}>{t("tracking.mon.emptyDelayed")}</p>
            ) : (
              <div className={styles.delayedList}>
                {delayedTrips.map((d) => (
                  <div key={d.id} className={styles.delayedItem}>
                    <div className={styles.delayedHeader}>
                      <span className={styles.delayedRoute}>{d.routeName || "—"}</span>
                      <span className={styles.delayedMin}>{d.delayMinutes || "?"} {t("tracking.mon.min")}</span>
                    </div>
                    <span className={styles.delayedBus}>{d.busPlate || "—"} · {d.driverName || "—"}</span>
                    {d.delayReason && <span className={styles.delayedReason}>{d.delayReason}</span>}
                    {d.estimatedResolutionTime && (
                      <span className={styles.estResolution}>
                        {t("tracking.mon.estResolution")} {new Date(d.estimatedResolutionTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/delays" className={styles.viewAllLink}>
              {t("tracking.mon.viewAllDelays")}
            </Link>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><Radio size={16} /> {t("tracking.mon.liveAlerts")}</h2>
              <span className={`${styles.connDot} ${connected ? styles.connOn : ""}`} title={connected ? t("tracking.mon.rtConnected") : t("tracking.mon.rtDisconnected")}>
                {connected ? t("tracking.mon.live") : t("tracking.mon.off")}
              </span>
            </div>
            {liveFeed.length === 0 ? (
              <p className={styles.empty}>
                {connected
                  ? t("tracking.mon.listening")
                  : t("tracking.mon.feedUnavailable")}
              </p>
            ) : (
              <div className={styles.feedList}>
                {liveFeed.map((f, i) => (
                  <div key={`${f.at}-${i}`} className={`${styles.feedItem} ${f.kind === "geofence" ? styles.feedGeofence : styles.feedDelay}`}>
                    <span className={styles.feedTitle}>{f.title}</span>
                    <span className={styles.feedTime}>{new Date(f.at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && overrideTrip && (
        <div className={styles.overlay} onClick={() => setShowOverrideModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t("tracking.mon.overrideTitle")}</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>{t("tracking.mon.tripLabel")}</label>
                <span>{overrideTrip.routeName || overrideTrip.id?.slice(0, 8)}</span>
              </div>
              <div className={styles.modalField}>
                <label>{t("tracking.mon.newStatus")}</label>
                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className={styles.modalSelect}>
                  <option value="scheduled">{t("tracking.mon.scheduled")}</option>
                  <option value="en_route">{t("tracking.mon.enRoute")}</option>
                  <option value="completed">{t("tracking.mon.completed")}</option>
                  <option value="delayed">{t("tracking.mon.delayed")}</option>
                  <option value="cancelled">{t("tracking.mon.cancelled")}</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>{t("tracking.mon.notesLabel")}</label>
                <textarea value={overrideNotes} onChange={(e) => setOverrideNotes(e.target.value)} placeholder={t("tracking.mon.notesPh")} className={styles.modalTextarea} rows={3} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowOverrideModal(false)}>{t("common.cancel")}</button>
              <button className={styles.modalConfirm} onClick={() => handleOverride(overrideTrip.id)} disabled={actionLoading === overrideTrip.id}>
                {actionLoading === overrideTrip.id ? t("tracking.mon.applying") : t("tracking.mon.applyOverride")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
