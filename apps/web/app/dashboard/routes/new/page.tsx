"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ROUTE_TYPES = ["regular", "hajj", "umrah", "charter", "shuttle"] as const;
const STATUS_OPTIONS = ["active", "inactive", "discontinued"] as const;

export default function NewRoutePage() {
  const router = useRouter();
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
        setError(json.error?.message || "Failed to create route");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push("/dashboard/routes")}>
        <ArrowLeft size={14} /> Routes
      </button>

      <h1 className={styles.pageTitle}>New Route</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Route Name *</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Makkah-Madinah Express" />
          </div>
          <div className={styles.field}>
            <label>Route Code *</label>
            <input value={form.code} onChange={(e) => update("code", e.target.value)} required placeholder="e.g. MM-001" />
          </div>
          <div className={styles.field}>
            <label>Origin *</label>
            <input value={form.origin} onChange={(e) => update("origin", e.target.value)} required placeholder="e.g. Makkah" />
          </div>
          <div className={styles.field}>
            <label>Destination *</label>
            <input value={form.destination} onChange={(e) => update("destination", e.target.value)} required placeholder="e.g. Madinah" />
          </div>
          <div className={styles.field}>
            <label>Distance (km)</label>
            <input type="number" value={form.distanceKm} onChange={(e) => update("distanceKm", e.target.value)} min={0} step="0.1" placeholder="450" />
          </div>
          <div className={styles.field}>
            <label>Duration (min)</label>
            <input type="number" value={form.estimatedDurationMinutes} onChange={(e) => update("estimatedDurationMinutes", e.target.value)} min={1} placeholder="300" />
          </div>
          <div className={styles.field}>
            <label>Route Type</label>
            <select value={form.routeType} onChange={(e) => update("routeType", e.target.value)}>
              {ROUTE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="Route description..." />
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push("/dashboard/routes")}>Cancel</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? "Saving..." : "Create Route"}</button>
        </div>
      </form>
    </div>
  );
}
