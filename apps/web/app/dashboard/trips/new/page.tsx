"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TRIP_TYPES = ["regular", "hajj", "umrah", "charter", "shuttle"];

export default function NewTripPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    routeId: "", busId: "", driverId: "", tripType: "regular",
    scheduledDate: "", scheduledStartTime: "", scheduledEndTime: "", notes: "",
  });

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("seum_access_token");
      try {
        const [routesRes, busesRes, driversRes] = await Promise.all([
          fetch(`${API}/operations/routes?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/users?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]);
        if (routesRes.success) setRoutes(routesRes.data);
        if (busesRes.success) setBuses(busesRes.data);
        if (driversRes.success) setDrivers(driversRes.data);
      } catch {} finally { setLoadingData(false); }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const body = {
        routeId: form.routeId, busId: form.busId ? form.busId : undefined,
        driverId: form.driverId ? form.driverId : undefined,
        tripType: form.tripType,
        scheduledDate: form.scheduledDate,
        scheduledStartTime: form.scheduledStartTime,
        scheduledEndTime: form.scheduledEndTime || undefined,
        notes: form.notes || undefined,
      };
      const res = await fetch(`${API}/operations/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message || "Failed to create trip"); return; }
      router.push(`/dashboard/trips/${json.data.id}`);
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Trips
      </Link>
      <h1 className={styles.pageTitle}>New Trip</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Route *</label>
            <select value={form.routeId} onChange={(e) => setForm(f => ({ ...f, routeId: e.target.value }))} required>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bus</label>
            <select value={form.busId} onChange={(e) => setForm(f => ({ ...f, busId: e.target.value }))}>
              <option value="">Select bus (optional)</option>
              {buses.filter(b => b.status === "active").map(b => (
                <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Driver</label>
            <select value={form.driverId} onChange={(e) => setForm(f => ({ ...f, driverId: e.target.value }))}>
              <option value="">Select driver (optional)</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Trip Type *</label>
            <select value={form.tripType} onChange={(e) => setForm(f => ({ ...f, tripType: e.target.value }))} required>
              {TRIP_TYPES.map(tt => <option key={tt} value={tt}>{tt.charAt(0).toUpperCase() + tt.slice(1)}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date *</label>
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Start Time *</label>
            <input type="time" value={form.scheduledStartTime} onChange={(e) => setForm(f => ({ ...f, scheduledStartTime: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Time</label>
            <input type="time" value={form.scheduledEndTime} onChange={(e) => setForm(f => ({ ...f, scheduledEndTime: e.target.value }))} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !form.routeId}>
            <Save size={14} /> {submitting ? "Creating..." : "Create Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
