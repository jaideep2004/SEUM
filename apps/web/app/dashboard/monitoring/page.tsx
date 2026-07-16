"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bus, Clock, AlertTriangle, Play, CheckCircle, XCircle, RefreshCw, Search,
  Navigation, MapPin, Filter, ExternalLink, Radio,
} from "lucide-react";
import TimelineComparison from "@/components/TimelineComparison";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280",
  cancelled: "#ef4444", delayed: "#f59e0b",
};

export default function MonitoringDashboard() {
  const router = useRouter();
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
      if (!json.success) { alert(json.message || "Override failed"); return; }
      setShowOverrideModal(false);
      setOverrideTrip(null);
      setOverrideNotes("");
      await fetchDashboard();
    } catch { alert("Network error"); } finally { setActionLoading(null); }
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
          <h1 className={styles.pageTitle}>Trip Monitoring</h1>
          <p className={styles.pageDesc}>
            Control room. Active trips, status overrides, and delay management.
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.refreshBtn} ${autoRefresh ? styles.refreshActive : ""}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} /> {autoRefresh ? "Auto" : "Manual"}
          </button>
          <button className={styles.refreshBtn} onClick={fetchDashboard} disabled={loading}>
            <RefreshCw size={14} className={loading ? styles.spin : ""} /> Refresh
          </button>
          <Link href="/dashboard/delays" className={styles.delaysBtn}>
            <AlertTriangle size={14} /> Delay Dashboard
          </Link>
        </div>
      </div>

      {/* Status Summary Strip */}
      <div className={styles.statusStrip}>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #3b82f6" }}>
          <span className={styles.stripValue}>{stats.scheduled || 0}</span>
          <span className={styles.stripLabel}>Scheduled</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #10b981" }}>
          <span className={styles.stripValue}>{stats.en_route || 0}</span>
          <span className={styles.stripLabel}>En Route</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #f59e0b" }}>
          <span className={styles.stripValue}>{stats.delayed || 0}</span>
          <span className={styles.stripLabel}>Delayed</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #6b7280" }}>
          <span className={styles.stripValue}>{stats.completed || 0}</span>
          <span className={styles.stripLabel}>Completed</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #ef4444" }}>
          <span className={styles.stripValue}>{stats.cancelled || 0}</span>
          <span className={styles.stripLabel}>Cancelled</span>
        </div>
        <div className={styles.stripItem} style={{ borderLeft: "3px solid #8b5cf6" }}>
          <span className={styles.stripValue}>{stats.total_trips || 0}</span>
          <span className={styles.stripLabel}>Total Today</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Active Trips */}
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><Radio size={16} /> Active Trips</h2>
              <div className={styles.searchWrap}>
                <Search size={13} className={styles.searchIcon} />
                <input className={styles.searchInput} placeholder="Search trips..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <p className={styles.loading}>Loading active trips...</p>
            ) : filteredActive.length === 0 ? (
              <p className={styles.empty}>No active trips for today</p>
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
                          <AlertTriangle size={12} /> +{trip.delayMinutes} min
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
                          <Play size={18} /> Start Trip
                        </button>
                      )}
                      {trip.status === "en_route" && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideComplete}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("completed"); setShowOverrideModal(true); }}
                        >
                          <CheckCircle size={18} /> Complete
                        </button>
                      )}
                      {(trip.status === "scheduled" || trip.status === "en_route") && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideDelay}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("delayed"); setShowOverrideModal(true); }}
                        >
                          <AlertTriangle size={18} /> Mark Delayed
                        </button>
                      )}
                      {(trip.status === "scheduled" || trip.status === "delayed") && (
                        <button
                          className={`${styles.overrideBtn} ${styles.overrideCancel}`}
                          onClick={() => { setOverrideTrip(trip); setOverrideStatus("cancelled"); setShowOverrideModal(true); }}
                        >
                          <XCircle size={18} /> Cancel Trip
                        </button>
                      )}
                      <button className={styles.timelineBtn} onClick={() => openTimeline(trip.id)}>
                        <Clock size={14} /> Timeline
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
              <h2 className={styles.cardTitle}><AlertTriangle size={16} /> Currently Delayed</h2>
            </div>
            {delayedTrips.length === 0 ? (
              <p className={styles.empty}>No delayed trips</p>
            ) : (
              <div className={styles.delayedList}>
                {delayedTrips.map((t) => (
                  <div key={t.id} className={styles.delayedItem}>
                    <div className={styles.delayedHeader}>
                      <span className={styles.delayedRoute}>{t.routeName || "—"}</span>
                      <span className={styles.delayedMin}>{t.delayMinutes || "?"} min</span>
                    </div>
                    <span className={styles.delayedBus}>{t.busPlate || "—"} · {t.driverName || "—"}</span>
                    {t.delayReason && <span className={styles.delayedReason}>{t.delayReason}</span>}
                    {t.estimatedResolutionTime && (
                      <span className={styles.estResolution}>
                        Est. resolution: {new Date(t.estimatedResolutionTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/delays" className={styles.viewAllLink}>
              View All Delays →
            </Link>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && overrideTrip && (
        <div className={styles.overlay} onClick={() => setShowOverrideModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Manual Status Override</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Trip</label>
                <span>{overrideTrip.routeName || overrideTrip.id?.slice(0, 8)}</span>
              </div>
              <div className={styles.modalField}>
                <label>New Status</label>
                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className={styles.modalSelect}>
                  <option value="scheduled">Scheduled</option>
                  <option value="en_route">En Route</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>Notes (optional)</label>
                <textarea value={overrideNotes} onChange={(e) => setOverrideNotes(e.target.value)} placeholder="Reason for override..." className={styles.modalTextarea} rows={3} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowOverrideModal(false)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={() => handleOverride(overrideTrip.id)} disabled={actionLoading === overrideTrip.id}>
                {actionLoading === overrideTrip.id ? "Applying..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
