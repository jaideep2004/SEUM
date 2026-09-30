"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Users, Plane, Hotel } from "lucide-react";
import Link from "next/link";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import { COUNTRIES, HOME_COUNTRY_EN, countryLabel } from "@/lib/countries";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TRIP_TYPES = [
  { value: "single", label: "Single Trip" },
  { value: "round", label: "Round Trip (Multi-Stop / Multi-Date)" },
];

const VEHICLE_TYPES = ["Bus", "Coaster", "Hiace", "Staria", "GMC", "Sedan"] as const;
const ROUTE_TYPES = [
  { value: "arrival", label: "Arrival" },
  { value: "departure", label: "Departure" },
  { value: "intercity", label: "Intercity" },
  { value: "intracity", label: "Intracity" },
] as const;
const FLIGHT_TYPES = [
  { value: "arrival", label: "Arrival" },
  { value: "departure", label: "Departure" },
] as const;

function emptyLeg() {
  return { origin: "", destination: "", legDate: "", departureTime: "", arrivalTime: "", overnight: false, routeType: "" };
}

function emptyFlight() {
  return { flightNo: "", airline: "", from: "", to: "", date: "", time: "", flightType: "" };
}

function emptyGroup() {
  return { groupNo: "", groupLeader: "", groupLeaderNo: "", nationality: "", noOfPax: "", nusukRef: "", nusukNotes: "" };
}

function emptyHotel() {
  return { city: "", hotel: "", from: "", to: "" };
}

export default function NewTripPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({
    routeId: "", busId: "", driverId: "", tripType: "single",
    scheduledDate: "", scheduledStartTime: "", scheduledEndTime: "", notes: "",
    tripTitle: "", vehicleType: "", vehicleCount: "",
    agent: "", agentId: null,
    groups: [emptyGroup()],
    legs: [emptyLeg(), emptyLeg()],
    flights: [], hotels: [],
  });

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("seum_access_token");
      try {
        const [routesRes, busesRes, driversRes, agentsRes] = await Promise.all([
          fetch(`${API}/operations/routes?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/users?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/agents?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(async r => {
            const j = await r.json();
            if (j.success) return j;
            // fallback to legacy customers endpoint if /agents not yet available (e.g. before migration)
            const fb = await fetch(`${API}/bookings/customers?is_company=true&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json());
            if (fb.success) return { success: true, data: fb.data };
            return j;
          }).catch(async () => {
            try {
              const fb = await fetch(`${API}/bookings/customers?is_company=true&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json());
              if (fb.success) return { success: true, data: fb.data };
            } catch {}
            return { success: false, data: [] };
          }),
        ]);
        if (routesRes.success) setRoutes(routesRes.data);
        if (busesRes.success) setBuses(busesRes.data);
        if (driversRes.success) setDrivers(driversRes.data);
        if (agentsRes.success) {
          const list = Array.isArray(agentsRes.data) ? agentsRes.data : [];
          // normalize fallback customer shape to agent shape
          const normalized = list.map((a: any) => ({
            id: a.id,
            companyName: a.companyName || a.company_name || null,
            name: a.name,
            displayName: a.displayName || a.companyName || a.company_name || a.name,
            phone: a.phone,
            email: a.email,
          }));
          setAgents(normalized);
        }
      } catch {} finally { setLoadingData(false); }
    }
    load();
  }, []);

  async function searchAgents(q: string) {
    if (!q.trim()) {
      // reload all
      return;
    }
    setLoadingAgents(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      let res = await fetch(`${API}/agents?search=${encodeURIComponent(q)}&pageSize=20`, { headers: { Authorization: `Bearer ${token}` } });
      let json = await res.json().catch(() => ({ success: false }));
      if (!json.success || !json.data) {
        res = await fetch(`${API}/bookings/customers?is_company=true&search=${encodeURIComponent(q)}&pageSize=20`, { headers: { Authorization: `Bearer ${token}` } });
        json = await res.json().catch(() => ({ success: false }));
      }
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : [];
        const normalized = list.map((a: any) => ({
          id: a.id,
          companyName: a.companyName || a.company_name || null,
          name: a.name,
          displayName: a.displayName || a.companyName || a.company_name || a.name,
          phone: a.phone,
          email: a.email,
        }));
        setAgents(normalized);
      }
    } catch {} finally { setLoadingAgents(false); }
  }

  function setLeg(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, legs: f.legs.map((l: any, i: number) => i === idx ? { ...l, [key]: value } : l) }));
  }

  function setFlight(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, flights: f.flights.map((x: any, i: number) => i === idx ? { ...x, [key]: value } : x) }));
  }

  function setFlightType(idx: number, value: string) {
    // Arrival = into home country (To = home), Departure = out of home (From = home)
    setForm((f: any) => ({
      ...f,
      flights: f.flights.map((x: any, i: number) => {
        if (i !== idx) return x;
        const next: any = { ...x, flightType: value };
        if (value === "arrival") next.to = HOME_COUNTRY_EN;
        else if (value === "departure") next.from = HOME_COUNTRY_EN;
        return next;
      }),
    }));
  }

  function setGroup(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, groups: f.groups.map((g: any, i: number) => i === idx ? { ...g, [key]: value } : g) }));
  }

  function setHotel(idx: number, key: string, value: any) {
    setForm((f: any) => ({ ...f, hotels: f.hotels.map((x: any, i: number) => i === idx ? { ...x, [key]: value } : x) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.tripType === "round") {
      const filled = form.legs.filter((l: any) => l.origin && l.destination && l.legDate);
      if (filled.length < 2) { setError(t("trips.new.roundNeedLegs")); return; }
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const legs = form.tripType === "round"
        ? form.legs.filter((l: any) => l.origin && l.destination && l.legDate).map((l: any) => ({
            origin: l.origin, destination: l.destination, legDate: l.legDate,
            departureTime: l.departureTime || undefined, arrivalTime: l.arrivalTime || undefined,
            overnightFlag: l.overnight, routeType: l.routeType || undefined,
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
      ["tripTitle", "vehicleType", "agent"].forEach(k => {
        if (form[k]) body[k] = form[k];
      });
      if (form.vehicleCount) body.vehicleCount = Number(form.vehicleCount);
      if (form.agentId) body.agentId = form.agentId;
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
      if (form.flights.length > 0) body.flights = form.flights.filter((x: any) => x.flightNo || x.airline || x.from).map((x: any) => ({
        flightNo: x.flightNo, airline: x.airline, from: x.from, to: x.to, date: x.date, time: x.time, flightType: x.flightType || undefined,
      }));
      if (form.hotels.length > 0) body.hotels = form.hotels.filter((x: any) => x.hotel || x.city);

      const res = await fetch(`${API}/operations/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || t("trips.new.failedCreate")); return; }
      router.push(`/dashboard/trips/${json.data.id}`);
    } catch { setError(t("trips.new.networkError")); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>{t("common.loading")}</p></div>;

  const isRound = form.tripType === "round";

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("trips.new.back")}
      </Link>
      <h1 className={styles.pageTitle}>{t("trips.new.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        {/* 1. TRIP TYPE + VEHICLE TYPE (client: Vehicle Type right after Trip Type) */}
        <div className={styles.field} style={{ marginBottom: 16 }}>
          <label className={styles.label}>{t("trips.new.tripType")}</label>
          <div className={styles.typeToggle}>
            {TRIP_TYPES.map(tt => (
              <button key={tt.value} type="button"
                className={`${styles.typeBtn} ${form.tripType === tt.value ? styles.typeBtnActive : ""}`}
                onClick={() => setForm((f: any) => ({ ...f, tripType: tt.value }))}>
                {tt.value === "single" ? t("trips.new.singleTrip") : t("trips.new.roundTrip")}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.formGrid} style={{ marginBottom: 16 }}>
          <div className={styles.field}>
            <label className={styles.label}>{t("trips.new.vehicleType")}</label>
            <select value={form.vehicleType} onChange={(e) => setForm((f: any) => ({ ...f, vehicleType: e.target.value }))}>
              <option value="">{t("trips.new.selectVehicleType")}</option>
              {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v === "Bus" ? t("trips.new.vtBus") : v}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("trips.new.vehicleCount")}</label>
            <input type="number" min="1" max="100" value={form.vehicleCount} onChange={(e) => setForm((f: any) => ({ ...f, vehicleCount: e.target.value }))} placeholder={t("trips.new.vehicleCountPh")} />
          </div>
        </div>

        {/* 2. PROGRAM INFORMATION (renamed from Manifest Info) */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Users size={14} /> {t("trips.new.programInfo")}</h3>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{t("trips.new.tripTitle")}</label>
              <input value={form.tripTitle} onChange={(e) => setForm((f: any) => ({ ...f, tripTitle: e.target.value }))} placeholder={t("trips.new.tripTitlePh")} />
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{t("trips.new.groupsTitle")}</label>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{t("trips.new.groupsHint")}</span>
            </div>
            {form.groups.map((g: any, idx: number) => (
              <div key={idx} className={styles.section} style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>{t("trips.new.group")} {idx + 1}{g.groupNo ? ` — ${g.groupNo}` : ''}</strong>
                  {form.groups.length > 1 && (
                    <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, groups: f.groups.filter((_: any, i: number) => i !== idx) }))}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.groupNo")}</label>
                    <input value={g.groupNo} onChange={(e) => setGroup(idx, "groupNo", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.noOfPax")}</label>
                    <input type="number" min="0" value={g.noOfPax} onChange={(e) => setGroup(idx, "noOfPax", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.groupLeader")}</label>
                    <input value={g.groupLeader} onChange={(e) => setGroup(idx, "groupLeader", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.groupLeaderNo")}</label>
                    <input value={g.groupLeaderNo} onChange={(e) => setGroup(idx, "groupLeaderNo", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.nationality")}</label>
                    <select value={g.nationality} onChange={(e) => setGroup(idx, "nationality", e.target.value)}>
                      <option value="">{t("trips.new.selectNationality")}</option>
                      {COUNTRIES.map(c => <option key={c.code} value={c.en}>{countryLabel(c, lang)}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{t("trips.new.nusukRef")}</label>
                    <input value={g.nusukRef} onChange={(e) => setGroup(idx, "nusukRef", e.target.value)} placeholder={t("trips.new.nusukRefPh")} />
                  </div>
                  <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.label}>{t("trips.new.nusukNotes")}</label>
                    <input value={g.nusukNotes} onChange={(e) => setGroup(idx, "nusukNotes", e.target.value)} placeholder={t("trips.new.nusukNotesPh")} />
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, groups: [...f.groups, emptyGroup()] }))}>
                <Plus size={13} /> {t("trips.new.addGroup")}
              </button>
            </div>
            <div className={styles.field} style={{ position: 'relative' }}>
              <label className={styles.label}>{t("trips.new.agent")} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-tertiary)' }}>{t("trips.new.agentSub")}</span></label>
              {form.agentId ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light, #eff6ff)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{form.agent || '—'}</span>
                  {(() => {
                    const ag = agents.find((a: any) => a.id === form.agentId);
                    return ag?.phone ? <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{ag.phone}</span> : null;
                  })()}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Link href={`/dashboard/customers/${form.agentId}`} style={{ fontSize: 11, color: 'var(--color-primary)', textDecoration: 'underline' }} target="_blank">{t("trips.new.view")}</Link>
                    <button type="button" onClick={() => setForm((f: any) => ({ ...f, agentId: null, agent: '' }))} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger, #dc2626)', cursor: 'pointer', fontSize: 11 }}>{t("trips.new.clear")}</button>
                  </span>
                </div>
              ) : (
                <>
                  <input
                    value={agentSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAgentSearch(v);
                      setShowAgentDropdown(true);
                      if (v.trim().length >= 1) searchAgents(v);
                      // also keep legacy free-text fallback in form.agent when no link selected
                      setForm((f: any) => ({ ...f, agent: v }));
                    }}
                    onFocus={() => setShowAgentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAgentDropdown(false), 180)}
                    placeholder={t("trips.new.agentSearchPh")}
                  />
                  {showAgentDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border)', borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', maxHeight: 180, overflowY: 'auto', boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))' }}>
                      {loadingAgents ? (
                        <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{t("trips.new.searching")}</div>
                      ) : (
                        <>
                          {agents
                            .filter((a: any) => {
                              if (!agentSearch.trim()) return true;
                              const q = agentSearch.toLowerCase();
                              return (a.displayName || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q) || (a.phone || '').includes(q);
                            })
                            .slice(0, 20)
                            .map((a: any) => (
                              <button
                                key={a.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setForm((f: any) => ({ ...f, agentId: a.id, agent: a.displayName }));
                                  setAgentSearch(a.displayName);
                                  setShowAgentDropdown(false);
                                }}
                                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover, #f8fafc)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{a.displayName}{a.companyName && a.name !== a.displayName ? ` · ${a.name}` : ''}</span>
                                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{a.phone || '—'}{a.email ? ` · ${a.email}` : ''}</span>
                              </button>
                            ))}
                          {agents.filter((a: any) => {
                            if (!agentSearch.trim()) return true;
                            const q = agentSearch.toLowerCase();
                            return (a.displayName || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q) || (a.phone || '').includes(q);
                          }).length === 0 && (
                            <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                              {t("trips.new.noAgentsFound")} {agentSearch.trim() ? t("trips.new.freeTextHint") : t("trips.new.createInCustomers")}
                            </div>
                          )}
                          {agents.length === 0 && !agentSearch.trim() && (
                            <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                              {t("trips.new.noAgentsYet")} <Link href="/dashboard/customers" style={{ color: 'var(--color-primary)' }}>{t("trips.new.addCompanyCustomer")}</Link> {t("trips.new.toLink")}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {form.agent && !form.agentId && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{t("trips.new.freeTextNote")}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. FLIGHT INFORMATION */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Plane size={14} /> {t("trips.new.flightInfo")}</h3>
          {form.flights.map((fl: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <input placeholder={t("trips.new.flightNo")} value={fl.flightNo} onChange={(e) => setFlight(idx, "flightNo", e.target.value)} />
                <input placeholder={t("trips.new.airline")} value={fl.airline} onChange={(e) => setFlight(idx, "airline", e.target.value)} />
                <select title={`${t("common.from")} (${t("trips.new.flightCountryHint")})`} value={fl.from} onChange={(e) => setFlight(idx, "from", e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12 }}>
                  <option value="">{t("common.from")}</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.en}>{countryLabel(c, lang)}</option>)}
                </select>
                <select title={`${t("common.to")} (${t("trips.new.flightCountryHint")})`} value={fl.to} onChange={(e) => setFlight(idx, "to", e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12 }}>
                  <option value="">{t("common.to")}</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.en}>{countryLabel(c, lang)}</option>)}
                </select>
                <input type="date" title={t("trips.new.ttDate")} value={fl.date} onChange={(e) => setFlight(idx, "date", e.target.value)} />
                <input type="time" title={t("trips.new.ttTime")} value={fl.time} onChange={(e) => setFlight(idx, "time", e.target.value)} />
                <select value={fl.flightType || ""} onChange={(e) => setFlightType(idx, e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12 }}>
                  <option value="">{t("trips.new.flightType")}</option>
                  {FLIGHT_TYPES.map(o => <option key={o.value} value={o.value}>{o.value === "arrival" ? t("trips.new.rtArrival") : t("trips.new.rtDeparture")}</option>)}
                </select>
              </div>
              {fl.flightType && (
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {fl.flightType === "arrival" ? t("trips.new.arrivalHint") : t("trips.new.departureHint")}
                </div>
              )}
              <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, flights: f.flights.filter((_: any, i: number) => i !== idx) }))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, flights: [...f.flights, emptyFlight()] }))}>
            <Plus size={13} /> {t("trips.new.addFlight")}
          </button>
        </div>

        {/* 4. HOTEL INFORMATION */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Hotel size={14} /> {t("trips.new.hotelInfo")}</h3>
          {form.hotels.map((ht: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <input placeholder={t("trips.new.city")} value={ht.city} onChange={(e) => setHotel(idx, "city", e.target.value)} />
                <input placeholder={t("trips.new.hotel")} value={ht.hotel} onChange={(e) => setHotel(idx, "hotel", e.target.value)} />
                <input type="date" title={t("trips.new.ttCheckIn")} value={ht.from} onChange={(e) => setHotel(idx, "from", e.target.value)} />
                <input type="date" title={t("trips.new.ttCheckOut")} value={ht.to} onChange={(e) => setHotel(idx, "to", e.target.value)} />
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, hotels: f.hotels.filter((_: any, i: number) => i !== idx) }))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, hotels: [...f.hotels, emptyHotel()] }))}>
            <Plus size={13} /> {t("trips.new.addHotel")}
          </button>
        </div>

        {/* 5. ROUTE INFORMATION (last per client) */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("trips.new.routeInfo")}</h3>
          {!isRound ? (
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>{t("trips.new.route")}</label>
                <select value={form.routeId} onChange={(e) => setForm((f: any) => ({ ...f, routeId: e.target.value }))} required>
                  <option value="">{t("trips.new.selectRoute")}</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("trips.new.bus")}</label>
                <select value={form.busId} onChange={(e) => setForm((f: any) => ({ ...f, busId: e.target.value }))}>
                  <option value="">{t("trips.new.selectBus")}</option>
                  {buses.filter(b => b.status === "active").map(b => (
                    <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("roles.driver")}</label>
                <select value={form.driverId} onChange={(e) => setForm((f: any) => ({ ...f, driverId: e.target.value }))}>
                  <option value="">{t("trips.new.selectDriver")}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("trips.new.date")}</label>
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f: any) => ({ ...f, scheduledDate: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("trips.new.startTime")}</label>
                <input type="time" value={form.scheduledStartTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledStartTime: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("trips.new.endTime")}</label>
                <input type="time" value={form.scheduledEndTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledEndTime: e.target.value }))} />
              </div>
            </div>
          ) : (
            <>
              <div className={styles.formGrid} style={{ marginBottom: 12 }}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("trips.new.routeOptional")}</label>
                  <select value={form.routeId} onChange={(e) => setForm((f: any) => ({ ...f, routeId: e.target.value }))}>
                    <option value="">{t("trips.new.optionalRound")}</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name || r.code}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("trips.new.bus")}</label>
                  <select value={form.busId} onChange={(e) => setForm((f: any) => ({ ...f, busId: e.target.value }))}>
                    <option value="">{t("trips.new.selectBus")}</option>
                    {buses.filter(b => b.status === "active").map(b => (
                      <option key={b.id} value={b.id}>{b.plateNumber || b.id}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("roles.driver")}</label>
                  <select value={form.driverId} onChange={(e) => setForm((f: any) => ({ ...f, driverId: e.target.value }))}>
                    <option value="">{t("trips.new.selectDriver")}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName || d.email || d.id}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("trips.new.departureDate")}</label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f: any) => ({ ...f, scheduledDate: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("trips.new.departureTime")}</label>
                  <input type="time" value={form.scheduledStartTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledStartTime: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("trips.new.endTime")}</label>
                  <input type="time" value={form.scheduledEndTime} onChange={(e) => setForm((f: any) => ({ ...f, scheduledEndTime: e.target.value }))} />
                </div>
              </div>
              <h4 className={styles.label} style={{ marginBottom: 8 }}>{t("trips.new.legsTitle")}</h4>
              {form.legs.map((leg: any, idx: number) => (
                <div key={idx} className={styles.legRow}>
                  <div className={styles.legNo}>{idx + 1}</div>
                  <div className={styles.legFields}>
                    <input placeholder={t("common.from")} value={leg.origin} onChange={(e) => setLeg(idx, "origin", e.target.value)} />
                    <input placeholder={t("common.to")} value={leg.destination} onChange={(e) => setLeg(idx, "destination", e.target.value)} />
                    <input type="date" title={t("trips.new.ttDate")} value={leg.legDate} onChange={(e) => setLeg(idx, "legDate", e.target.value)} />
                    <input type="time" title={t("trips.new.ttDeparture")} value={leg.departureTime} onChange={(e) => setLeg(idx, "departureTime", e.target.value)} />
                    <input type="time" title={t("trips.new.ttArrival")} value={leg.arrivalTime} onChange={(e) => setLeg(idx, "arrivalTime", e.target.value)} />
                    <select value={leg.routeType || ""} onChange={(e) => setLeg(idx, "routeType", e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12 }}>
                      <option value="">{t("trips.new.routeType")}</option>
                      {ROUTE_TYPES.map(o => <option key={o.value} value={o.value}>{o.value === "arrival" ? t("trips.new.rtArrival") : o.value === "departure" ? t("trips.new.rtDeparture") : o.value === "intercity" ? t("trips.new.rtIntercity") : t("trips.new.rtIntracity")}</option>)}
                    </select>
                    <label className={styles.overnightLabel}>
                      <input type="checkbox" checked={leg.overnight} onChange={(e) => setLeg(idx, "overnight", e.target.checked)} />
                      {t("trips.new.overnight")}
                    </label>
                  </div>
                  <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, legs: f.legs.filter((_: any, i: number) => i !== idx) }))} disabled={form.legs.length <= 2}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, legs: [...f.legs, emptyLeg()] }))}>
                <Plus size={13} /> {t("trips.new.addLeg")}
              </button>
            </>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("common.notes")}</label>
          <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !form.scheduledDate || !form.scheduledStartTime}>
            <Save size={14} /> {submitting ? t("trips.new.creating") : t("trips.new.createTrip")}
          </button>
        </div>
      </form>
    </div>
  );
}
