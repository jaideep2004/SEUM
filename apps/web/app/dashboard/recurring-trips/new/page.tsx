"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Users } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import { COUNTRIES, countryLabel } from "@/lib/countries";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TRIP_TYPE_VALUES = ["single", "round"] as const;
const FREQUENCY_VALUES = ["daily", "weekdays", "weekends", "custom_days"] as const;

const TRIP_TYPE_KEYS: Record<string, string> = {
  single: "recurring.new.ttSingle",
  round: "recurring.new.ttRound",
};

const FREQUENCY_KEYS: Record<string, string> = {
  daily: "recurring.new.fqDaily",
  weekdays: "recurring.new.fqWeekdays",
  weekends: "recurring.new.fqWeekends",
  custom_days: "recurring.new.fqCustom",
};

const DAY_KEYS = [
  "recurring.new.daySun", "recurring.new.dayMon", "recurring.new.dayTue",
  "recurring.new.dayWed", "recurring.new.dayThu", "recurring.new.dayFri",
  "recurring.new.daySat",
];

function emptyLeg() {
  return { origin: "", destination: "", dayOffset: 0, departureTime: "", arrivalTime: "", overnight: false };
}

function emptyGroup() {
  return { groupNo: "", groupLeader: "", groupLeaderNo: "", nationality: "", noOfPax: "", nusukRef: "", nusukNotes: "" };
}

export default function NewRecurringTripPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({
    routeId: "", busId: "", driverId: "", tripType: "single",
    frequency: "daily", daysOfWeek: [] as number[],
    scheduledStartTime: "", scheduledEndTime: "",
    startDate: "", endDate: "", specificDates: "", notes: "", isActive: true,
    tripTitle: "", vehicleType: "", vehicleCount: "", agent: "",
    groups: [emptyGroup()],
    legs: [emptyLeg(), emptyLeg()],
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

  function setLeg(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, legs: f.legs.map((l: any, i: number) => i === idx ? { ...l, [key]: value } : l) }));
  }

  function setGroup(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, groups: f.groups.map((g: any, i: number) => i === idx ? { ...g, [key]: value } : g) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.tripType === "round") {
      const filled = form.legs.filter((l: any) => l.origin && l.destination);
      if (filled.length < 2) { setError(t("recurring.new.roundNeedLegs")); return; }
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const body: any = {
        routeId: form.tripType === "single" ? form.routeId : (form.routeId || undefined),
        tripType: form.tripType,
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
      if (form.tripType === "round") {
        body.legs = form.legs.filter((l: any) => l.origin && l.destination).map((l: any) => ({
          origin: l.origin, destination: l.destination, dayOffset: Number(l.dayOffset) || 0,
          departureTime: l.departureTime || undefined, arrivalTime: l.arrivalTime || undefined,
          overnightFlag: l.overnight,
        }));
      }
      ["tripTitle", "vehicleType", "agent"].forEach(k => {
        if (form[k]) body[k] = form[k];
      });
      if (form.vehicleCount) body.vehicleCount = Number(form.vehicleCount);
      // Groups (each with own Nusuk info) + flat fields from first group for legacy readers
      const filledGroups = (form.groups || []).filter((g: any) =>
        g.groupNo || g.groupLeader || g.groupLeaderNo || g.nationality || g.noOfPax || g.nusukRef || g.nusukNotes
      ).map((g: any) => {
        const grp: any = {
          groupNo: g.groupNo || undefined,
          groupLeader: g.groupLeader || undefined,
          groupLeaderNo: g.groupLeaderNo || undefined,
          nationality: g.nationality || undefined,
          noOfPax: g.noOfPax ? Number(g.noOfPax) : undefined,
        };
        if (g.nusukRef || g.nusukNotes) grp.nusukInfo = { reference: g.nusukRef || undefined, notes: g.nusukNotes || undefined };
        return grp;
      });
      if (filledGroups.length > 0) {
        body.groups = filledGroups;
        const first = filledGroups[0];
        if (first.groupLeader) body.groupLeader = first.groupLeader;
        if (first.groupLeaderNo) body.groupLeaderNo = first.groupLeaderNo;
        if (first.nationality) body.nationality = first.nationality;
        if (first.groupNo) body.groupNo = first.groupNo;
        if (first.noOfPax !== undefined) body.noOfPax = first.noOfPax;
        if (first.nusukInfo) body.nusukInfo = first.nusukInfo;
      }

      const res = await fetch(`${API}/operations/recurring-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || t("recurring.new.failedCreate")); return; }
      router.push(`/dashboard/recurring-trips/${json.data.id}`);
    } catch { setError(t("recurring.new.networkError")); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>{t("common.loading")}</p></div>;

  const isRound = form.tripType === "round";

  return (
    <div className={styles.page}>
      <Link href="/dashboard/recurring-trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("recurring.new.back")}
      </Link>
      <h1 className={styles.pageTitle}>{t("recurring.new.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGrid}>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.label}>{t("recurring.new.tripType")}</label>
            <div className={styles.typeToggle}>
              {TRIP_TYPE_VALUES.map((tv) => (
                <button key={tv} type="button"
                  className={`${styles.typeBtn} ${form.tripType === tv ? styles.typeBtnActive : ""}`}
                  onClick={() => setForm((f: any) => ({ ...f, tripType: tv }))}>
                  {TRIP_TYPE_KEYS[tv] ? t(TRIP_TYPE_KEYS[tv]) : tv}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.route")} {!isRound && "*"}</label>
            <select value={form.routeId} onChange={(e) => setForm((f: any) => ({ ...f, routeId: e.target.value }))} required={!isRound}>
              <option value="">{isRound ? t("recurring.new.routePhRound") : t("recurring.new.routePhSingle")}</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.bus")}</label>
            <select value={form.busId} onChange={(e) => setForm((f: any) => ({ ...f, busId: e.target.value }))}>
              <option value="">{t("recurring.new.optional")}</option>
              {buses.filter((b: any) => b.status === "active").map((b: any) => (
                <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("roles.driver")}</label>
            <select value={form.driverId} onChange={(e) => setForm((f: any) => ({ ...f, driverId: e.target.value }))}>
              <option value="">{t("recurring.new.optional")}</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.frequency")}</label>
            <select value={form.frequency} onChange={(e) => setForm((f: any) => ({ ...f, frequency: e.target.value }))} required>
              {FREQUENCY_VALUES.map((fv) => <option key={fv} value={fv}>{FREQUENCY_KEYS[fv] ? t(FREQUENCY_KEYS[fv]) : fv}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.status")}</label>
            <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.value === "true" }))}>
              <option value="true">{t("recurring.new.stActive")}</option>
              <option value="false">{t("recurring.new.stInactive")}</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.startTime")}</label>
            <input type="time" value={form.scheduledStartTime}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduledStartTime: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.endTime")}</label>
            <input type="time" value={form.scheduledEndTime}
              onChange={(e) => setForm((f: any) => ({ ...f, scheduledEndTime: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.startDate")}</label>
            <input type="date" value={form.startDate}
              onChange={(e) => setForm((f: any) => ({ ...f, startDate: e.target.value }))} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("recurring.new.endDate")}</label>
            <input type="date" value={form.endDate}
              onChange={(e) => setForm((f: any) => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>

        {isRound && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("recurring.new.legsSection")}</h3>
            {form.legs.map((leg: any, idx: number) => (
              <div key={idx} className={styles.legRow}>
                <div className={styles.legNo}>{idx + 1}</div>
                <div className={styles.legFields}>
                  <input placeholder={t("common.from")} value={leg.origin} onChange={(e) => setLeg(idx, "origin", e.target.value)} />
                  <input placeholder={t("common.to")} value={leg.destination} onChange={(e) => setLeg(idx, "destination", e.target.value)} />
                  <input type="number" min="0" title={t("recurring.new.dayOffsetTitle")} placeholder={t("recurring.new.dayOffsetPh")} value={leg.dayOffset}
                    onChange={(e) => setLeg(idx, "dayOffset", e.target.value)} />
                  <input type="time" title={t("recurring.new.depTitle")} value={leg.departureTime} onChange={(e) => setLeg(idx, "departureTime", e.target.value)} />
                  <input type="time" title={t("recurring.new.arrTitle")} value={leg.arrivalTime} onChange={(e) => setLeg(idx, "arrivalTime", e.target.value)} />
                  <label className={styles.overnightLabel}>
                    <input type="checkbox" checked={leg.overnight} onChange={(e) => setLeg(idx, "overnight", e.target.checked)} />
                    {t("recurring.new.overnight")}
                  </label>
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, legs: f.legs.filter((_: any, i: number) => i !== idx) }))} disabled={form.legs.length <= 2}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, legs: [...f.legs, emptyLeg()] }))}>
              <Plus size={13} /> {t("recurring.new.addLeg")}
            </button>
          </div>
        )}

        {form.frequency === "custom_days" && (
          <div className={styles.field} style={{ marginBottom: 16 }}>
            <label className={styles.label}>{t("recurring.new.daysOfWeek")}</label>
            <div className={styles.dayCheckboxes}>
              {DAY_KEYS.map((dk, i) => (
                <button key={i} type="button"
                  className={`${styles.dayBtn} ${form.daysOfWeek.includes(i) ? styles.dayBtnActive : ""}`}
                  onClick={() => toggleDay(i)}>
                  {t(dk)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field} style={{ marginBottom: 16 }}>
          <label className={styles.label}>{t("recurring.new.specificDates")}</label>
          <input type="text" value={form.specificDates}
            onChange={(e) => setForm((f: any) => ({ ...f, specificDates: e.target.value }))}
            placeholder={t("recurring.new.specificDatesPh")} />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Users size={14} /> {t("recurring.new.manifestSection")}</h3>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{t("recurring.new.tripTitle")}</label>
              <input value={form.tripTitle} onChange={(e) => setForm((f: any) => ({ ...f, tripTitle: e.target.value }))} placeholder={t("recurring.new.tripTitlePh")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("recurring.new.vehicleType")}</label>
              <input value={form.vehicleType} onChange={(e) => setForm((f: any) => ({ ...f, vehicleType: e.target.value }))} placeholder={t("recurring.new.vehicleTypePh")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("recurring.new.vehicleCount")}</label>
              <input type="number" min="1" max="100" value={form.vehicleCount} onChange={(e) => setForm((f: any) => ({ ...f, vehicleCount: e.target.value }))} placeholder={t("recurring.new.vehicleCountPh")} />
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{t("recurring.new.groupsTitle")}</label>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{t("recurring.new.groupsHint")}</span>
            </div>
            {form.groups.map((g: any, idx: number) => (
              <div key={idx} className={styles.section} style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>{t("recurring.new.group")} {idx + 1}{g.groupNo ? ` — ${g.groupNo}` : ''}</strong>
                  {form.groups.length > 1 && (
                    <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, groups: f.groups.filter((_: any, i: number) => i !== idx) }))}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.groupNo")}</label>
                    <input value={g.groupNo} onChange={(e) => setGroup(idx, "groupNo", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.noOfPax")}</label>
                    <input type="number" min="0" value={g.noOfPax} onChange={(e) => setGroup(idx, "noOfPax", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.groupLeader")}</label>
                    <input value={g.groupLeader} onChange={(e) => setGroup(idx, "groupLeader", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.groupLeaderNo")}</label>
                    <input value={g.groupLeaderNo} onChange={(e) => setGroup(idx, "groupLeaderNo", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.nationality")}</label>
                    <select value={g.nationality} onChange={(e) => setGroup(idx, "nationality", e.target.value)}>
                      <option value="">{t("recurring.new.selectNationality")}</option>
                      {COUNTRIES.map(c => <option key={c.code} value={c.en}>{countryLabel(c, lang)}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("recurring.new.nusukRef")}</label>
                    <input value={g.nusukRef} onChange={(e) => setGroup(idx, "nusukRef", e.target.value)} placeholder={t("recurring.new.nusukRefPh")} />
                  </div>
                  <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.label}>{t("recurring.new.nusukNotes")}</label>
                    <input value={g.nusukNotes} onChange={(e) => setGroup(idx, "nusukNotes", e.target.value)} placeholder={t("recurring.new.nusukNotesPh")} />
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, groups: [...f.groups, emptyGroup()] }))}>
                <Plus size={13} /> {t("recurring.new.addGroup")}
              </button>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("recurring.new.agent")}</label>
              <input value={form.agent} onChange={(e) => setForm((f: any) => ({ ...f, agent: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className={styles.field} style={{ marginBottom: 16 }}>
          <label className={styles.label}>{t("common.notes")}</label>
          <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !form.scheduledStartTime || !form.startDate}>
            <Save size={14} /> {submitting ? t("recurring.new.creating") : t("recurring.new.createPattern")}
          </button>
        </div>
      </form>
    </div>
  );
}
