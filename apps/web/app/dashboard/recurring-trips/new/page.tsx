"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TRIP_TYPES = ["regular", "hajj", "umrah", "charter", "shuttle"];
const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekends", label: "Weekends (Sat–Sun)" },
  { value: "custom_days", label: "Custom Days" },
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function NewRecurringTripPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({
    routeId: "", busId: "", driverId: "", tripType: "regular",
    frequency: "daily", daysOfWeek: [] as number[],
    scheduledStartTime: "", scheduledEndTime: "",
    startDate: "", endDate: "", specificDates: "", notes: "", isActive: true,
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

  function toggleDay(day: number) {
    setForm((f: any) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d: number) => d !== day)
        : [...f.daysOfWeek, day],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const body: any = {
        routeId: form.routeId, tripType: form.tripType,
        frequency: form.frequency, scheduledStartTime: form.scheduledStartTime,
        startDate: form.startDate, isActive: form.isActive,
      };
      if (form.busId) body.busId = form.busId;
      if (form.driverId) body.driverId = form.driverId;
      if (form.frequency === "custom_days") body.daysOfWeek = form.daysOfWeek;
      if (form.scheduledEndTime) body.scheduledEndTime = form.scheduledEndTime;
      if (form.endDate) body.endDate = form.endDate;
      if (form.specificDates) body.specificDates = form.specificDates.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (form.notes) body.notes = form.notes;

      const res = await fetch(`${API}/operations/recurring-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message || "Failed to create pattern"); return; }
      router.push(`/dashboard/recurring-trips/${json.data.id}`);
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/recurring-trips" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Recurring Trips
      </Link>
      <h1 className={styles.pageTitle}>New Recurring Pattern</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Route *</label>
            <select value={form.routeId} onChange={(e) => setForm((f: any) => ({ ...f, routeId: e.target.value }))} required>
              <option value="">Select route</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bus</label>
            <select value={form.busId} onChange={(e) => setForm((f: any) => ({ ...f, busId: e.target.value }))}>
              <option value="">Optional</option>
              {buses.filter((b: any) => b.status === "active").map((b: any) => (
                <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Driver</label>
            <select value={form.driverId} onChange={(e) => setForm((f: any) => ({ ...f, driverId: e.target.value }))}>
              <option value="">Optional</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Trip Type *</label>
            <select value={form.tripType} onChange={(e) => setForm((f: any) => ({ ...f, tripType: e.target.value }))} required>
              {TRIP_TYPES.map(tt => <option key={tt} value={tt}>{tt.charAt(0).toUpperCase() + tt.slice(1)}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Frequency *</label>
            <select value={form.frequency} onChange={(e) => setForm((f: any) => ({ ...f, frequency: e.target.value }))} required>
              {FREQUENCIES.map(fq => <option key={fq.value} value={fq.value}>{fq.label}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Start Time *</label>
            <input type="time" value={form.scheduledStartTime}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduledStartTime: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Time</label>
            <input type="time" value={form.scheduledEndTime}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduledEndTime: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Start Date *</label>
            <input type="date" value={form.startDate}
              onChange={(e) => setForm((f: any) => ({ ...f, startDate: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Date</label>
            <input type="date" value={form.endDate}
              onChange={(e) => setForm((f: any) => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>

        {form.frequency === "custom_days" && (
          <div className={styles.field} style={{ marginBottom: 16 }}>
            <label className={styles.label}>Days of Week</label>
            <div className={styles.dayCheckboxes}>
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button"
                  className={`${styles.dayBtn} ${form.daysOfWeek.includes(i) ? styles.dayBtnActive : ""}`}
                  onClick={() => toggleDay(i)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field} style={{ marginBottom: 16 }}>
          <label className={styles.label}>Specific Dates (comma-separated YYYY-MM-DD)</label>
          <input type="text" value={form.specificDates}
            onChange={(e) => setForm((f: any) => ({ ...f, specificDates: e.target.value }))}
            placeholder="2026-09-01, 2026-09-15" />
        </div>

        <div className={styles.field} style={{ marginBottom: 16 }}>
          <label className={styles.label}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !form.routeId || !form.scheduledStartTime || !form.startDate}>
            <Save size={14} /> {submitting ? "Creating..." : "Create Pattern"}
          </button>
        </div>
      </form>
    </div>
  );
}
