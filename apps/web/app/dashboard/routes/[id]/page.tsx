"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Ruler, Plus, Trash2, AlertTriangle } from "lucide-react";
import RouteMap from "@/components/RouteMap";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function RouteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stopName, setStopName] = useState("");
  const [stopOrder, setStopOrder] = useState(0);
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");
  const [stopEta, setStopEta] = useState("");

  async function fetchRoute() {
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/routes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setRoute(json.data);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRoute(); }, [id]);

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("seum_access_token");
      const body: any = { stopName, stopOrder: Number(stopOrder) };
      if (stopLat) body.latitude = parseFloat(stopLat);
      if (stopLng) body.longitude = parseFloat(stopLng);
      if (stopEta) body.estimatedArrivalMinutes = parseInt(stopEta);
      const res = await fetch(`${API}/operations/routes/${id}/stops`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setStopName(""); setStopOrder(route?.stops?.length || 0); setStopLat(""); setStopLng(""); setStopEta("");
        fetchRoute();
      }
    } catch {}
  }

  async function handleRemoveStop(stopId: string) {
    if (!confirm(t("routes.detail.confirmRemove"))) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API}/operations/routes/${id}/stops/${stopId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRoute();
    } catch {}
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}><div className={styles.spinner} /> {t("routes.detail.loading")}</div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <MapPin size={48} style={{ opacity: 0.3 }} />
          <p>{t("routes.detail.notFound")}</p>
          <button className={styles.backBtn} onClick={() => router.push("/dashboard/routes")}>{t("routes.detail.backToRoutes")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/routes")}>
          <ArrowLeft size={14} /> {t("routes.detail.back")}
        </button>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => router.push(`/dashboard/routes/${id}/edit`)}>{t("routes.detail.editRoute")}</button>
        </div>
      </div>

      {/* Title + Meta */}
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.pageTitle}>{route.name}</h1>
          <span className={styles.code}>{route.code}</span>
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <MapPin size={14} /> {route.origin} → {route.destination}
          </div>
          {route.distanceKm && (
            <div className={styles.metaItem}>
              <Ruler size={14} /> {route.distanceKm} {t("routes.detail.km")}
            </div>
          )}
          {route.estimatedDurationMinutes && (
            <div className={styles.metaItem}>
              <Clock size={14} /> {route.estimatedDurationMinutes} {t("routes.detail.min")}
            </div>
          )}
        </div>
        {route.description && <p className={styles.description}>{route.description}</p>}
      </div>

      {/* Map */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t("routes.detail.mapTitle")}</h3>
        <RouteMap
          origin={route.origin}
          destination={route.destination}
          stops={route.stops || []}
        />
      </div>

      {/* Stops Management */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t("routes.detail.stopsTitle")}</h3>
        <div className={styles.stopsGrid}>
          {/* Current stops */}
          <div className={styles.stopList}>
            <div className={styles.stopItem}>
              <span className={styles.stopIndex}>O</span>
              <span className={styles.stopName}>{route.origin}</span>
              <span className={styles.stopEta}>{t("routes.detail.start")}</span>
            </div>
            {(route.stops || []).map((s: any) => (
              <div key={s.id} className={styles.stopItem}>
                <span className={styles.stopIndex}>{s.stopOrder}</span>
                <span className={styles.stopName}>{s.stopName}</span>
                <span className={styles.stopEta}>
                  {s.estimatedArrivalMinutes ? `${s.estimatedArrivalMinutes} ${t("routes.detail.min")}` : "—"}
                </span>
                <button className={styles.removeBtn} onClick={() => handleRemoveStop(s.id)} title={t("routes.detail.removeTitle")}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className={styles.stopItem}>
              <span className={styles.stopIndex} style={{ background: "var(--color-danger)" }}>D</span>
              <span className={styles.stopName}>{route.destination}</span>
              <span className={styles.stopEta}>{t("routes.detail.end")}</span>
            </div>
          </div>

          {/* Add stop form */}
          <form className={styles.addStopForm} onSubmit={handleAddStop}>
            <h4 className={styles.formTitle}><Plus size={14} /> {t("routes.detail.addStopTitle")}</h4>
            <div className={styles.formRow}>
              <label>{t("routes.detail.stopNameLabel")}</label>
              <input value={stopName} onChange={(e) => setStopName(e.target.value)} required placeholder={t("routes.detail.stopNamePh")} />
            </div>
            <div className={styles.formRow}>
              <label>{t("routes.detail.orderLabel")}</label>
              <input type="number" value={stopOrder} onChange={(e) => setStopOrder(parseInt(e.target.value))} required min={0} />
            </div>
            <div className={styles.formRow2}>
              <div className={styles.formRow}>
                <label>{t("routes.detail.latLabel")}</label>
                <input value={stopLat} onChange={(e) => setStopLat(e.target.value)} placeholder="21.4858" />
              </div>
              <div className={styles.formRow}>
                <label>{t("routes.detail.lngLabel")}</label>
                <input value={stopLng} onChange={(e) => setStopLng(e.target.value)} placeholder="39.1925" />
              </div>
            </div>
            <div className={styles.formRow}>
              <label>{t("routes.detail.etaLabel")}</label>
              <input type="number" value={stopEta} onChange={(e) => setStopEta(e.target.value)} min={1} />
            </div>
            <button type="submit" className={styles.addBtn}>{t("routes.detail.addStopBtn")}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
