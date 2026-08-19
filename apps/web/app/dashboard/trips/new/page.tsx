"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Users, Plane, Hotel } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TRIP_TYPES = [
  { value: "single", label: "Single Trip" },
  { value: "round", label: "Round Trip (Multi-Stop / Multi-Date)" },
];

function emptyLeg() {
  return { origin: "", destination: "", legDate: "", departureTime: "", arrivalTime: "", overnight: false };
}

function emptyFlight() {
  return { flightNo: "", airline: "", from: "", to: "", date: "", time: "" };
}

function emptyHotel() {
  return { city: "", hotel: "", from: "", to: "" };
}

export default function NewTripPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({
    routeId: "", busId: "", driverId: "", tripType: "single",
    scheduledDate: "", scheduledStartTime: "", scheduledEndTime: "", notes: "",
    tripTitle: "", vehicleType: "", groupLeader: "", groupLeaderNo: "",
    nationality: "", agent: "", groupNo: "", noOfPax: "",
    legs: [emptyLeg(), emptyLeg()],
    flights: [], hotels: [],
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

  function setLeg(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, legs: f.legs.map((l: any, i: number) => i === idx ? { ...l, [key]: value } : l) }));
  }

  function setFlight(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, flights: f.flights.map((x: any, i: number) => i === idx ? { ...x, [key]: value } : x) }));
  }

  function setHotel(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, hotels: f.hotels.map((x: any, i: number) => i === idx ? { ...x, [key]: value } : x) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.tripType === "round") {
      const filled = form.legs.filter((l: any) => l.origin && l.destination && l.legDate);
      if (filled.length < 2) { setError("Round trips need at least 2 legs with origin, destination and date"); return; }
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const legs = form.tripType === "round"
        ? form.legs.filter((l: any) => l.origin && l.destination && l.legDate).map((l: any) => ({
            origin: l.origin, destination: l.destination, legDate: l.legDate,
            departureTime: l.departureTime || undefined, arrivalTime: l.arrivalTime || undefined,
            overnightFlag: l.overnight,
          }))
        : undefined;
      const body: any = {
        routeId: form.tripType === "single" ? form.routeId : (form.routeId || undefined),
        busId: form.busId ? form.busId : undefined,
        driverId: form.driverId ? form.driverId : undefined,
        tripType: form.tripType,
        scheduledDate: form.scheduledDate,
        scheduledStartTime: form.scheduledStartTime,
        scheduledEndTime: form.scheduledEndTime || undefined,
        notes: form.notes || undefined,
        legs,
      };
      ["tripTitle", "vehicleType", "groupLeader", "groupLeaderNo", "nationality", "agent", "groupNo"].forEach(k => {
        if (form[k]) body[k] = form[k];
      });
      if (form.noOfPax) body.noOfPax = Number(form.noOfPax);
      if (form.flights.length > 0) body.flights = form.flights.filter((x: any) => x.flightNo || x.airline || x.from);
      if (form.hotels.length > 0) body.hotels = form.hotels.filter((x: any) => x.hotel || x.city);

      const res = await fetch(`${API}/operations/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to create trip"); return; }
      router.push(`/dashboard/trips/${json.data.id}`);
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>Loading...</p></div>;

  const isRound = form.tripType === "round";

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Trips
      </Link>
      <h1 className={styles.pageTitle}>New Trip</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.label}>Trip Type *</label>
            <div className={styles.typeToggle}>
              {TRIP_TYPES.map(tt => (
                <button key={tt.value} type="button"
                  className={`${styles.typeBtn} ${form.tripType === tt.value ? styles.typeBtnActive : ""}`}
                  onClick={() => setForm((f: any) => ({ ...f, tripType: tt.value }))}>
                  {tt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Route {!isRound && "*"}</label>
            <select value={form.routeId} onChange={(e) => setForm((f: any) => ({ ...f, routeId: e.target.value }))} required={!isRound}>
              <option value="">{isRound ? "Optional for round trips" : "Select route"}</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bus</label>
            <select value={form.busId} onChange={(e) => setForm((f: any) => ({ ...f, busId: e.target.value }))}>
              <option value="">Select bus (optional)</option>
              {buses.filter(b => b.status === "active").map(b => (
                <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Driver</label>
            <select value={form.driverId} onChange={(e) => setForm((f: any) => ({ ...f, driverId: e.target.value }))}>
              <option value="">Select driver (optional)</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{isRound ? "Departure Date *" : "Date *"}</label>
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f: any) => ({ ...f, scheduledDate: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{isRound ? "Departure Time *" : "Start Time *"}</label>
            <input type="time" value={form.scheduledStartTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledStartTime: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Time</label>
            <input type="time" value={form.scheduledEndTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledEndTime: e.target.value }))} />
          </div>
        </div>

        {isRound && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Trip Legs (stops with dates)</h3>
            {form.legs.map((leg: any, idx: number) => (
              <div key={idx} className={styles.legRow}>
                <div className={styles.legNo}>{idx + 1}</div>
                <div className={styles.legFields}>
                  <input placeholder="From" value={leg.origin} onChange={(e) => setLeg(idx, "origin", e.target.value)} />
                  <input placeholder="To" value={leg.destination} onChange={(e) => setLeg(idx, "destination", e.target.value)} />
                  <input type="date" title="Date" value={leg.legDate} onChange={(e) => setLeg(idx, "legDate", e.target.value)} />
                  <input type="time" title="Departure" value={leg.departureTime} onChange={(e) => setLeg(idx, "departureTime", e.target.value)} />
                  <input type="time" title="Arrival" value={leg.arrivalTime} onChange={(e) => setLeg(idx, "arrivalTime", e.target.value)} />
                  <label className={styles.overnightLabel}>
                    <input type="checkbox" checked={leg.overnight} onChange={(e) => setLeg(idx, "overnight", e.target.checked)} />
                    Overnight
                  </label>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, legs: f.legs.filter((_: any, i: number) => i !== idx) }))} disabled={form.legs.length <= 2}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, legs: [...f.legs, emptyLeg()] }))}>
              <Plus size={13} /> Add Leg
            </button>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Users size={14} /> Manifest Info</h3>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>Trip Title</label>
              <input value={form.tripTitle} onChange={(e) => setForm((f: any) => ({ ...f, tripTitle: e.target.value }))} placeholder="e.g. Hajj Group 12 - Makkah Package" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Vehicle Type</label>
              <input value={form.vehicleType} onChange={(e) => setForm((f: any) => ({ ...f, vehicleType: e.target.value }))} placeholder="e.g. 50-seater bus" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Group Leader</label>
              <input value={form.groupLeader} onChange={(e) => setForm((f: any) => ({ ...f, groupLeader: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Group Leader No</label>
              <input value={form.groupLeaderNo} onChange={(e) => setForm((f: any) => ({ ...f, groupLeaderNo: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nationality</label>
              <input value={form.nationality} onChange={(e) => setForm((f: any) => ({ ...f, nationality: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Agent</label>
              <input value={form.agent} onChange={(e) => setForm((f: any) => ({ ...f, agent: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Group No</label>
              <input value={form.groupNo} onChange={(e) => setForm((f: any) => ({ ...f, groupNo: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>No of Pax</label>
              <input type="number" min="0" value={form.noOfPax} onChange={(e) => setForm((f: any) => ({ ...f, noOfPax: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Plane size={14} /> Flights</h3>
          {form.flights.map((fl: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <input placeholder="Flight No" value={fl.flightNo} onChange={(e) => setFlight(idx, "flightNo", e.target.value)} />
                <input placeholder="Airline" value={fl.airline} onChange={(e) => setFlight(idx, "airline", e.target.value)} />
                <input placeholder="From" value={fl.from} onChange={(e) => setFlight(idx, "from", e.target.value)} />
                <input placeholder="To" value={fl.to} onChange={(e) => setFlight(idx, "to", e.target.value)} />
                <input type="date" title="Date" value={fl.date} onChange={(e) => setFlight(idx, "date", e.target.value)} />
                <input type="time" title="Time" value={fl.time} onChange={(e) => setFlight(idx, "time", e.target.value)} />
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, flights: f.flights.filter((_: any, i: number) => i !== idx) }))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, flights: [...f.flights, emptyFlight()] }))}>
            <Plus size={13} /> Add Flight
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Hotel size={14} /> Hotels</h3>
          {form.hotels.map((ht: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <input placeholder="City" value={ht.city} onChange={(e) => setHotel(idx, "city", e.target.value)} />
                <input placeholder="Hotel" value={ht.hotel} onChange={(e) => setHotel(idx, "hotel", e.target.value)} />
                <input type="date" title="Check-in" value={ht.from} onChange={(e) => setHotel(idx, "from", e.target.value)} />
                <input type="date" title="Check-out" value={ht.to} onChange={(e) => setHotel(idx, "to", e.target.value)} />
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, hotels: f.hotels.filter((_: any, i: number) => i !== idx) }))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, hotels: [...f.hotels, emptyHotel()] }))}>
            <Plus size={13} /> Add Hotel
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !form.scheduledDate || !form.scheduledStartTime}>
            <Save size={14} /> {submitting ? "Creating..." : "Create Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
