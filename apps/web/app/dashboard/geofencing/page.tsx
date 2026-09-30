"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { GeofenceOverlay } from "@/components/LiveMap";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const FENCE_TYPES = ["depot", "terminal", "checkpoint", "restricted", "holy_site"] as const;

const FENCE_TYPE_KEYS: Record<string, string> = {
  depot: "tracking.geo.ftDepot",
  terminal: "tracking.geo.ftTerminal",
  checkpoint: "tracking.geo.ftCheckpoint",
  restricted: "tracking.geo.ftRestricted",
  holy_site: "tracking.geo.ftHolySite",
};

interface Geofence extends GeofenceOverlay {
  rules?: Record<string, unknown>;
}

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("seum_access_token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function unwrap<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function emptyForm() {
  return {
    name: "",
    type: "depot" as string,
    mode: "circle" as "circle" | "polygon",
    centerLat: "21.4225",
    centerLng: "39.8262",
    radiusMeters: "500",
    polygonJson: "",
    rulesJson: "",
  };
}

export default function GeofencingPage() {
  const { lang, t } = useLanguage();
  const [fences, setFences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [clickedPoints, setClickedPoints] = useState<[number, number][]>([]);

  const fetchFences = useCallback(async () => {
    try {
      const res = await fetch(`${API}/gps/geofences`, { headers: authHeaders() });
      const json = await res.json();
      setFences(unwrap<Geofence>(json));
      setError("");
    } catch {
      setError(t("tracking.geo.errLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFences();
  }, [fetchFences]);

  function startEdit(f: Geofence) {
    setEditingId(f.id);
    setNotice("");
    setError("");
    const isPolygon = !!f.coordinates && f.coordinates.length >= 3;
    setForm({
      name: f.name,
      type: f.type,
      mode: isPolygon ? "polygon" : "circle",
      centerLat: String(f.centerLat ?? "21.4225"),
      centerLng: String(f.centerLng ?? "39.8262"),
      radiusMeters: String(f.radiusMeters ?? "500"),
      polygonJson: isPolygon ? JSON.stringify(f.coordinates) : "",
      rulesJson: f.rules ? JSON.stringify(f.rules) : "",
    });
    setClickedPoints(
      isPolygon && f.coordinates ? f.coordinates.map((c) => [c[1], c[0]] as [number, number]) : []
    );
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setClickedPoints([]);
  }

  function handleMapClick(lat: number, lng: number) {
    if (form.mode !== "polygon") return;
    // Click-to-add is the usable path for drawing polygons without a plugin.
    setClickedPoints((prev) => [...prev, [lat, lng]]);
    setNotice(`${t("tracking.geo.pointWord")} ${clickedPoints.length + 1} ${t("tracking.geo.addedWord")} (${lat.toFixed(5)}, ${lng.toFixed(5)}). ${t("tracking.geo.need3")}`);
  }

  const draftOverlay: GeofenceOverlay[] = useMemo(() => {
    if (form.mode === "polygon" && clickedPoints.length >= 1) {
      return [
        {
          id: "__draft",
          name: form.name || t("tracking.geo.draftFence"),
          type: form.type,
          coordinates: clickedPoints.map(([lat, lng]) => [lng, lat]),
        },
      ];
    }
    if (form.mode === "circle") {
      const lat = Number(form.centerLat);
      const lng = Number(form.centerLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [
          {
            id: "__draft",
            name: form.name || t("tracking.geo.draftFence"),
            type: form.type,
            centerLat: lat,
            centerLng: lng,
            radiusMeters: Number(form.radiusMeters) || 500,
          },
        ];
      }
    }
    return [];
  }, [form, clickedPoints, t]);

  async function handleSave() {
    setError("");
    setNotice("");
    if (!form.name.trim()) {
      setError(t("tracking.geo.errName"));
      return;
    }
    let payload: Record<string, unknown>;
    try {
      if (form.mode === "circle") {
        const centerLat = Number(form.centerLat);
        const centerLng = Number(form.centerLng);
        const radiusMeters = Number(form.radiusMeters);
        if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
          setError(t("tracking.geo.errCircle"));
          return;
        }
        payload = { name: form.name.trim(), type: form.type, centerLat, centerLng, radiusMeters };
      } else {
        // Prefer clicked points; fall back to pasted JSON.
        let coords: number[][] | null = null;
        if (clickedPoints.length >= 3) {
          coords = clickedPoints.map(([lat, lng]) => [lng, lat]);
        } else if (form.polygonJson.trim()) {
          const parsed = JSON.parse(form.polygonJson);
          if (!Array.isArray(parsed) || parsed.length < 3) throw new Error("bad polygon");
          coords = parsed;
        } else {
          setError(t("tracking.geo.errPolygon"));
          return;
        }
        payload = { name: form.name.trim(), type: form.type, coordinates: coords };
      }
      if (form.rulesJson.trim()) payload.rules = JSON.parse(form.rulesJson);
    } catch {
      setError(t("tracking.geo.errJson"));
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `${API}/gps/geofences/${editingId}` : `${API}/gps/geofences`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || (json.success === false)) {
        setError(json.message || t("tracking.geo.errSave"));
        return;
      }
      setNotice(editingId ? t("tracking.geo.updated") : t("tracking.geo.created"));
      resetForm();
      await fetchFences();
    } catch {
      setError(t("tracking.geo.errNetwork"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("tracking.geo.confirmDelete"))) return;
    try {
      await fetch(`${API}/gps/geofences/${id}`, { method: "DELETE", headers: authHeaders() });
      await fetchFences();
    } catch {
      setError(t("tracking.geo.errDelete"));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("tracking.geo.title")}</h1>
          <p className={styles.pageDesc}>
            {t("tracking.geo.desc")}
          </p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.success}>{notice}</p>}

      <div className={styles.grid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.mapCard}>
            <LiveMap
              buses={[]}
              geofences={[...fences, ...draftOverlay]}
              showBuses={false}
              showGeofences
              showRoutes={false}
              height={420}
              onMapClick={handleMapClick}
            />
            <p className={styles.hint} style={{ marginTop: 8 }}>
              {t("tracking.geo.mapHint")}
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("tracking.geo.geofencesWord")} ({fences.length})</h2>
            {loading ? (
              <p className={styles.empty}>{t("tracking.geo.loading")}</p>
            ) : fences.length === 0 ? (
              <p className={styles.empty}>{t("tracking.geo.empty")}</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>{t("tracking.geo.colName")}</th><th>{t("tracking.geo.colType")}</th><th>{t("tracking.geo.colShape")}</th><th>{t("tracking.geo.colActions")}</th></tr>
                </thead>
                <tbody>
                  {fences.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td>
                      <td><span className={styles.typePill}>{FENCE_TYPE_KEYS[f.type] ? t(FENCE_TYPE_KEYS[f.type]) : f.type.replace("_", " ")}</span></td>
                      <td>
                        {f.coordinates && f.coordinates.length >= 3
                          ? `${t("tracking.geo.polygonWord")} (${f.coordinates.length} ${t("tracking.geo.ptsWord")})`
                          : `${t("tracking.geo.circleWord")} (${f.radiusMeters ?? "—"} ${t("tracking.geo.mUnit")})`}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.iconBtn} onClick={() => startEdit(f)} title={t("common.edit")}><Pencil size={13} /></button>
                          <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDelete(f.id)} title={t("common.delete")}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{editingId ? t("tracking.geo.editTitle") : t("tracking.geo.newTitle")}</h2>
            <div className={styles.form}>
              <div>
                <label className={styles.fieldLabel} htmlFor="gf-name">{t("tracking.geo.nameLabel")}</label>
                <input id="gf-name" className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("tracking.geo.namePh")} />
              </div>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.fieldLabel} htmlFor="gf-type">{t("tracking.geo.typeLabel")}</label>
                  <select id="gf-type" className={styles.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {FENCE_TYPES.map((ft) => <option key={ft} value={ft}>{FENCE_TYPE_KEYS[ft] ? t(FENCE_TYPE_KEYS[ft]) : ft}</option>)}
                  </select>
                </div>
                <div>
                  <label className={styles.fieldLabel} htmlFor="gf-mode">{t("tracking.geo.shapeLabel")}</label>
                  <select id="gf-mode" className={styles.select} value={form.mode} onChange={(e) => { setForm({ ...form, mode: e.target.value as "circle" | "polygon" }); setClickedPoints([]); }}>
                    <option value="circle">{t("tracking.geo.circleOpt")}</option>
                    <option value="polygon">{t("tracking.geo.polygonOpt")}</option>
                  </select>
                </div>
              </div>

              {form.mode === "circle" ? (
                <>
                  <div className={styles.formRow}>
                    <div>
                      <label className={styles.fieldLabel} htmlFor="gf-lat">{t("tracking.geo.latLabel")}</label>
                      <input id="gf-lat" className={styles.input} value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} inputMode="decimal" />
                    </div>
                    <div>
                      <label className={styles.fieldLabel} htmlFor="gf-lng">{t("tracking.geo.lngLabel")}</label>
                      <input id="gf-lng" className={styles.input} value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} inputMode="decimal" />
                    </div>
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor="gf-radius">{t("tracking.geo.radiusLabel")}</label>
                    <input id="gf-radius" className={styles.input} value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} inputMode="numeric" />
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.hint}>{t("tracking.geo.polyHintPre")} ({clickedPoints.length} {t("tracking.geo.polyHintMid")}</p>
                  {clickedPoints.length > 0 && (
                    <div className={styles.pointList}>
                      {clickedPoints.map(([lat, lng], i) => (
                        <div key={i} className={styles.pointItem}>
                          <span>{i + 1}. {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                          <button className={styles.iconBtn} onClick={() => setClickedPoints((p) => p.filter((_, j) => j !== i))} title={t("tracking.geo.removePoint")}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className={styles.fieldLabel} htmlFor="gf-poly">{t("tracking.geo.polyLabel")}</label>
                    <textarea id="gf-poly" className={styles.textarea} rows={3} value={form.polygonJson} onChange={(e) => setForm({ ...form, polygonJson: e.target.value })} placeholder='[[39.82,21.42],[39.83,21.43],[39.81,21.44]]' />
                  </div>
                  <button className={styles.ghostBtn} onClick={() => setClickedPoints([])} disabled={clickedPoints.length === 0}>{t("tracking.geo.clearPoints")}</button>
                </>
              )}

              <div>
                <label className={styles.fieldLabel} htmlFor="gf-rules">{t("tracking.geo.rulesLabel")}</label>
                <textarea id="gf-rules" className={styles.textarea} rows={2} value={form.rulesJson} onChange={(e) => setForm({ ...form, rulesJson: e.target.value })} placeholder='{"notifyOnEnter": true}' />
              </div>

              <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                {saving ? t("tracking.geo.saving") : editingId ? t("tracking.geo.saveChanges") : <><Plus size={14} /> {t("tracking.geo.createGeofence")}</>}
              </button>
              {editingId && <button className={styles.ghostBtn} onClick={resetForm}>{t("tracking.geo.cancelEdit")}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
