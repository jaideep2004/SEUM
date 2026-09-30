"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Pause, Play, RefreshCw } from "lucide-react";
import { useSocketEvent } from "@/components/SocketProvider";
import {
  BUS_MARKER_COLORS,
  getBusMarkerStatus,
  type BusMarkerStatus,
} from "@/lib/busStatus";
import { busPopupHtml, type GeofenceOverlay } from "@/components/LiveMap";
import { useLanguage, formatDate, formatDateTime, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const POLL_MS = 15000;

interface BusPosition {
  busId: string;
  plateNumber?: string;
  driverName?: string;
  tripId?: string;
  tripName?: string;
  status?: string;
  tripStatus?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number | null;
  heading?: number | null;
  recordedAt?: string | null;
}

interface TrailPoint {
  latitude: number;
  longitude: number;
  speedKmh?: number | null;
  recordedAt?: string | null;
}

type Filter = "all" | "active" | "delayed";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("seum_access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function unwrap<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export default function LiveTripsPage() {
  const { lang, t } = useLanguage();
  const [buses, setBuses] = useState<BusPosition[]>([]);
  const [geofences, setGeofences] = useState<GeofenceOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showBuses, setShowBuses] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Playback state
  const [playbackTripId, setPlaybackTripId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scrub, setScrub] = useState(0);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/gps/current-positions`, { headers: authHeaders() });
      const json = await res.json();
      const rows = unwrap<BusPosition>(json).filter(
        (b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude)
      );
      setBuses(rows);
      setLastUpdated(new Date());
      setError("");
    } catch {
      setError(t("tracking.live.errPositions"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGeofences = useCallback(async () => {
    try {
      const res = await fetch(`${API}/gps/geofences`, { headers: authHeaders() });
      const json = await res.json();
      setGeofences(unwrap<GeofenceOverlay>(json));
    } catch {
      /* geofence overlay is best-effort */
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    fetchGeofences();
    const t = setInterval(fetchPositions, POLL_MS);
    return () => clearInterval(t);
  }, [fetchPositions, fetchGeofences]);

  // Live position pushes from the socket (shared provider in dashboard layout).
  useSocketEvent<Partial<BusPosition>>("trip:position_updated", (p) => {
    if (!p || (!p.busId && p.latitude === undefined)) return;
    setBuses((prev) => {
      const key = p.busId as string;
      const idx = prev.findIndex((b) => b.busId === key);
      if (idx === -1) {
        if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return prev;
        return [...prev, p as BusPosition];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...p };
      return next;
    });
    setLastUpdated(new Date());
  });

  // Playback: advance the scrub position on a timer.
  useEffect(() => {
    if (!playing || trail.length === 0) return;
    playTimer.current = setInterval(() => {
      setScrub((s) => {
        if (s >= trail.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 500);
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [playing, trail.length]);

  async function loadTrail() {
    if (!playbackTripId) return;
    setTrailLoading(true);
    setPlaying(false);
    setScrub(0);
    try {
      const params = new URLSearchParams({
        tripId: playbackTripId,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      });
      const res = await fetch(`${API}/gps/trip-history?${params}`, { headers: authHeaders() });
      const json = await res.json();
      const pts = unwrap<TrailPoint>(json).filter(
        (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      );
      setTrail(pts);
      if (pts.length === 0) setError(t("tracking.live.errNoHistory"));
      else setError("");
    } catch {
      setError(t("tracking.live.errTrail"));
    } finally {
      setTrailLoading(false);
    }
  }

  const busesWithStatus = useMemo(
    () =>
      buses.map((b) => ({
        ...b,
        markerStatus: getBusMarkerStatus({
          speedKmh: b.speedKmh,
          status: b.status,
          tripStatus: b.tripStatus,
          recordedAt: b.recordedAt,
        }) as BusMarkerStatus,
      })),
    [buses]
  );

  const filtered = useMemo(() => {
    if (filter === "active")
      return busesWithStatus.filter((b) => b.markerStatus === "on_time");
    if (filter === "delayed")
      return busesWithStatus.filter((b) => b.markerStatus === "delayed");
    return busesWithStatus;
  }, [busesWithStatus, filter]);

  const markers = useMemo(
    () =>
      filtered.map((b) => ({
        id: b.busId,
        lat: b.latitude,
        lng: b.longitude,
        color: BUS_MARKER_COLORS[b.markerStatus],
        popupHtml: busPopupHtml(b),
      })),
    [filtered]
  );

  const trailLatLng = useMemo(
    () => trail.map((p) => [p.latitude, p.longitude] as [number, number]),
    [trail]
  );
  const playbackPos: [number, number] | null =
    trail.length > 0 ? trailLatLng[Math.min(scrub, trailLatLng.length - 1)] : null;

  const counts = useMemo(() => {
    const c: Record<BusMarkerStatus, number> = { on_time: 0, delayed: 0, stopped: 0, offline: 0 };
    busesWithStatus.forEach((b) => {
      c[b.markerStatus] += 1;
    });
    return c;
  }, [busesWithStatus]);

  const tripOptions = useMemo(() => {
    const seen = new Map<string, string>();
    buses.forEach((b) => {
      if (b.tripId && !seen.has(b.tripId)) seen.set(b.tripId, b.tripName || b.plateNumber || b.tripId);
    });
    return [...seen.entries()];
  }, [buses]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("tracking.live.title")}</h1>
          <p className={styles.pageDesc}>
            <span className={styles.liveDot} data-on={showBuses} />
            {buses.length} {t("tracking.live.busesTracked")}
            {lastUpdated ? ` · ${t("tracking.live.updatedWord")} ${lastUpdated.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button className={styles.playBtn} onClick={fetchPositions} disabled={loading}>
          <RefreshCw size={14} /> {t("tracking.live.refresh")}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup} role="tablist" aria-label={t("tracking.live.filterLabel")}>
          {(["all", "active", "delayed"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `${t("tracking.live.allWord")} (${buses.length})` : f === "active" ? `${t("tracking.live.activeWord")} (${counts.on_time})` : `${t("tracking.live.delayedWord")} (${counts.delayed})`}
            </button>
          ))}
        </div>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${showBuses ? "" : styles.toggleOff}`} onClick={() => setShowBuses(!showBuses)}>
            <span className={styles.toggleSwatch} style={{ background: "#10b981" }} /> {t("tracking.live.buses")}
          </button>
          <button className={`${styles.toggle} ${showGeofences ? "" : styles.toggleOff}`} onClick={() => setShowGeofences(!showGeofences)}>
            <span className={styles.toggleSwatch} style={{ background: "#2563eb" }} /> {t("tracking.live.geofences")}
          </button>
          <button className={`${styles.toggle} ${showRoutes ? "" : styles.toggleOff}`} onClick={() => setShowRoutes(!showRoutes)}>
            <span className={styles.toggleSwatch} style={{ background: "#7c3aed" }} /> {t("tracking.live.routes")}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <div className={styles.mapCard}>
          <LiveMap
            buses={markers}
            geofences={geofences}
            showBuses={showBuses}
            showGeofences={showGeofences}
            showRoutes={showRoutes}
            trail={trailLatLng}
            playbackPos={playbackPos}
            height={520}
          />
          <div className={styles.legend}>
            {(Object.keys(BUS_MARKER_COLORS) as BusMarkerStatus[]).map((s) => (
              <span key={s} className={styles.legendItem}>
                <span className={styles.toggleSwatch} style={{ background: BUS_MARKER_COLORS[s] }} />
                {s === "on_time" ? `${t("tracking.live.onTime")} (${counts.on_time})` : `${s === "delayed" ? t("tracking.live.stDelayed") : s === "stopped" ? t("tracking.live.stStopped") : t("tracking.live.stOffline")} (${counts[s]})`}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("tracking.live.busesWord")} ({filtered.length})</h2>
            {loading ? (
              <p className={styles.empty}>{t("tracking.live.loadingPos")}</p>
            ) : filtered.length === 0 ? (
              <p className={styles.empty}>{t("tracking.live.emptyFilter")}</p>
            ) : (
              <div className={styles.busList}>
                {filtered.map((b) => (
                  <div
                    key={b.busId}
                    className={`${styles.busItem} ${b.tripId === playbackTripId ? styles.busItemSelected : ""}`}
                    onClick={() => b.tripId && setPlaybackTripId(b.tripId)}
                    title={b.tripId ? t("tracking.live.selectPlayback") : undefined}
                  >
                    <div className={styles.busItemHeader}>
                      <span className={styles.busPlate}>{b.plateNumber || b.busId.slice(0, 8)}</span>
                      <span className={styles.statusPill} style={{ background: BUS_MARKER_COLORS[b.markerStatus] }}>
                        {b.markerStatus.replace("_", " ")}
                      </span>
                    </div>
                    <div className={styles.busMeta}>
                      {b.driverName || t("tracking.live.unknownDriver")} · {b.speedKmh ?? "—"} {t("tracking.live.speedUnit")} · {b.tripName || t("tracking.live.noTrip")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("tracking.live.playback")}</h2>
            <div className={styles.playbackControls}>
              <label className={styles.fieldLabel} htmlFor="playback-trip">{t("tracking.live.tripLabel")}</label>
              <select
                id="playback-trip"
                className={styles.select}
                value={playbackTripId}
                onChange={(e) => setPlaybackTripId(e.target.value)}
              >
                <option value="">{t("tracking.live.selectTrip")}</option>
                {tripOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              <div className={styles.playbackRow}>
                <input type="datetime-local" className={styles.input} value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("common.from")} />
                <input type="datetime-local" className={styles.input} value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("common.to")} />
              </div>
              <div className={styles.playbackRow}>
                <button className={styles.playBtn} onClick={loadTrail} disabled={!playbackTripId || trailLoading}>
                  {trailLoading ? t("tracking.live.loadingTrail") : t("tracking.live.loadTrail")}
                </button>
                <button
                  className={styles.playBtn}
                  onClick={() => setPlaying(!playing)}
                  disabled={trail.length === 0}
                >
                  {playing ? <><Pause size={14} /> {t("tracking.live.pause")}</> : <><Play size={14} /> {t("tracking.live.play")}</>}
                </button>
              </div>
              {trail.length > 0 && (
                <>
                  <input
                    type="range"
                    className={styles.scrub}
                    min={0}
                    max={trail.length - 1}
                    value={Math.min(scrub, trail.length - 1)}
                    onChange={(e) => { setScrub(Number(e.target.value)); setPlaying(false); }}
                    aria-label={t("tracking.live.scrubLabel")}
                  />
                  <span className={styles.playbackMeta}>
                    {t("tracking.live.pointWord")} {Math.min(scrub + 1, trail.length)} {t("tracking.live.ofWord")} {trail.length}
                    {trail[Math.min(scrub, trail.length - 1)]?.recordedAt
                      ? ` · ${new Date(trail[Math.min(scrub, trail.length - 1)].recordedAt as string).toLocaleString()}`
                      : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
