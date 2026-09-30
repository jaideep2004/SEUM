"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ROUTE_TYPES = ["regular", "hajj", "umrah", "charter", "shuttle"] as const;
const STATUS_OPTIONS = ["active", "inactive", "discontinued"] as const;

const ROUTE_TYPE_KEYS: Record<string, string> = {
  regular: "routes.edit.typeRegular",
  hajj: "routes.edit.typeHajj",
  umrah: "routes.edit.typeUmrah",
  charter: "routes.edit.typeCharter",
  shuttle: "routes.edit.typeShuttle",
};

const STATUS_KEYS: Record<string, string> = {
  active: "routes.edit.stActive",
  inactive: "routes.edit.stInactive",
  discontinued: "routes.edit.stDiscontinued",
};

export default function EditRoutePage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    code: "",
    origin: "",
    destination: "",
    distanceKm: "",
    estimatedDurationMinutes: "",
    description: "",
    routeType: "regular",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/operations/routes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          const r = json.data;
          setForm({
            name: r.name || "",
            code: r.code || "",
            origin: r.origin || "",
            destination: r.destination || "",
            distanceKm: r.distanceKm ? String(r.distanceKm) : "",
            estimatedDurationMinutes: r.estimatedDurationMinutes ? String(r.estimatedDurationMinutes) : "",
            description: r.description || "",
            routeType: r.routeType || "regular",
            status: r.status || "active",
          });
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const body: Record<string, any> = {};
      if (form.name) body.name = form.name;
      if (form.code) body.code = form.code;
      if (form.origin) body.origin = form.origin;
      if (form.destination) body.destination = form.destination;
      if (form.distanceKm) body.distanceKm = parseFloat(form.distanceKm);
      if (form.estimatedDurationMinutes) body.estimatedDurationMinutes = parseInt(form.estimatedDurationMinutes);
      body.description = form.description || null;
      body.routeType = form.routeType;
      body.status = form.status;

      const res = await fetch(`${API}/operations/routes/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/dashboard/routes/${id}`);
      } else {
        setError(json.error?.message || t("routes.edit.failedUpdate"));
      }
    } catch {
      setError(t("routes.edit.networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}><div className={styles.spinner} /> {t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push(`/dashboard/routes/${id}`)}>
        <ArrowLeft size={14} /> {t("routes.edit.back")}
      </button>

      <h1 className={styles.pageTitle}>{t("routes.edit.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>{t("routes.edit.nameLabel")}</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.codeLabel")}</label>
            <input value={form.code} onChange={(e) => update("code", e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.originLabel")}</label>
            <input value={form.origin} onChange={(e) => update("origin", e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.destLabel")}</label>
            <input value={form.destination} onChange={(e) => update("destination", e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.distLabel")}</label>
            <input type="number" value={form.distanceKm} onChange={(e) => update("distanceKm", e.target.value)} min={0} step="0.1" />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.durLabel")}</label>
            <input type="number" value={form.estimatedDurationMinutes} onChange={(e) => update("estimatedDurationMinutes", e.target.value)} min={1} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.typeLabel")}</label>
            <select value={form.routeType} onChange={(e) => update("routeType", e.target.value)}>
              {ROUTE_TYPES.map((rt) => <option key={rt} value={rt}>{ROUTE_TYPE_KEYS[rt] ? t(ROUTE_TYPE_KEYS[rt]) : rt}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>{t("routes.edit.statusLabel")}</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_KEYS[s] ? t(STATUS_KEYS[s]) : s}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label>{t("routes.edit.descLabel")}</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push(`/dashboard/routes/${id}`)}>{t("common.cancel")}</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? t("routes.edit.saving") : t("routes.edit.saveChanges")}</button>
        </div>
      </form>
    </div>
  );
}
