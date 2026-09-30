"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ROUTE_TYPES = ["regular", "hajj", "umrah", "charter", "shuttle"] as const;
const STATUS_OPTIONS = ["active", "inactive", "discontinued"] as const;

const ROUTE_TYPE_KEYS: Record<string, string> = {
  regular: "routes.new.typeRegular",
  hajj: "routes.new.typeHajj",
  umrah: "routes.new.typeUmrah",
  charter: "routes.new.typeCharter",
  shuttle: "routes.new.typeShuttle",
};

const STATUS_KEYS: Record<string, string> = {
  active: "routes.new.stActive",
  inactive: "routes.new.stInactive",
  discontinued: "routes.new.stDiscontinued",
};

export default function NewRoutePage() {
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
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const body: Record<string, any> = {
        name: form.name,
        code: form.code,
        origin: form.origin,
        destination: form.destination,
        routeType: form.routeType,
        status: form.status,
      };
      if (form.distanceKm) body.distanceKm = parseFloat(form.distanceKm);
      if (form.estimatedDurationMinutes) body.estimatedDurationMinutes = parseInt(form.estimatedDurationMinutes);
      if (form.description) body.description = form.description;

      const res = await fetch(`${API}/operations/routes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/dashboard/routes/${json.data.id}`);
      } else {
        setError(json.error?.message || t("routes.new.failedCreate"));
      }
    } catch {
      setError(t("routes.new.networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push("/dashboard/routes")}>
        <ArrowLeft size={14} /> {t("routes.new.back")}
      </button>

      <h1 className={styles.pageTitle}>{t("routes.new.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>{t("routes.new.nameLabel")}</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder={t("routes.new.namePh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.codeLabel")}</label>
            <input value={form.code} onChange={(e) => update("code", e.target.value)} required placeholder={t("routes.new.codePh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.originLabel")}</label>
            <input value={form.origin} onChange={(e) => update("origin", e.target.value)} required placeholder={t("routes.new.originPh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.destLabel")}</label>
            <input value={form.destination} onChange={(e) => update("destination", e.target.value)} required placeholder={t("routes.new.destPh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.distLabel")}</label>
            <input type="number" value={form.distanceKm} onChange={(e) => update("distanceKm", e.target.value)} min={0} step="0.1" placeholder={t("routes.new.distPh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.durLabel")}</label>
            <input type="number" value={form.estimatedDurationMinutes} onChange={(e) => update("estimatedDurationMinutes", e.target.value)} min={1} placeholder={t("routes.new.durPh")} />
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.typeLabel")}</label>
            <select value={form.routeType} onChange={(e) => update("routeType", e.target.value)}>
              {ROUTE_TYPES.map((rt) => <option key={rt} value={rt}>{ROUTE_TYPE_KEYS[rt] ? t(ROUTE_TYPE_KEYS[rt]) : rt}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>{t("routes.new.statusLabel")}</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_KEYS[s] ? t(STATUS_KEYS[s]) : s}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label>{t("routes.new.descLabel")}</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder={t("routes.new.descPh")} />
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push("/dashboard/routes")}>{t("common.cancel")}</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? t("routes.new.saving") : t("routes.new.createRoute")}</button>
        </div>
      </form>
    </div>
  );
}
