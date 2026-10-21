"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Users, Plane, Hotel, FileDown, Printer } from "lucide-react";
import Link from "next/link";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import { COUNTRIES, countryLabel } from "@/lib/countries";
import { CITIES, cityLabel } from "@/lib/cities";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const DRAFT_KEY = "seum.trips.new.draft.v1";

function esc(v: any) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c] || c);
}

// Trip type is DERIVED from legs: 1 leg = single, 2+ legs = round (client rule).

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
  return { origin: "", destination: "", legDate: "", departureTime: "", overnight: false, routeType: "" };
}

function emptyFlight() {
  return { flightNo: "", airline: "", from: "", to: "", date: "", time: "", flightType: "" };
}

function emptyGroup() {
  return { groupNo: "", noOfPax: "" };
}

function emptyHotel() {
  return { city: "", hotel: "", from: "", to: "" };
}

export default function NewTripPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftNote, setDraftNote] = useState<"" | "saved" | "restored">("");
  const [form, setForm] = useState<any>({
    notes: "",
    tripTitle: "", vehicleType: "", vehicleCount: "",
    groupLeader: "", groupLeaderNo: "",
    nationality: "",
    agent: "", agentId: null,
    sellingPrice: "",
    groups: [emptyGroup()],
    legs: [emptyLeg()],
    flights: [], hotels: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form && typeof parsed.form === "object") {
        setForm((f: any) => ({ ...f, ...parsed.form }));
        setDraftNote("restored");
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("seum_access_token");
      try {
        const [agentsRes] = await Promise.all([
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
            nationality: a.nationality || null,
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
          nationality: a.nationality || null,
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
    // Arrival = lands in home country (pick Saudi city in To),
    // Departure = leaves home country (pick Saudi city in From).
    // Clear the home-side field so a stale value can't linger.
    setForm((f: any) => ({
      ...f,
      flights: f.flights.map((x: any, i: number) => {
        if (i !== idx) return x;
        const next: any = { ...x, flightType: value };
        if (value === "arrival") next.to = "";
        else if (value === "departure") next.from = "";
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

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, savedAt: new Date().toISOString() }));
      setDraftNote("saved");
      setError("");
    } catch {
      setError(t("trips.new.pdfBlocked"));
    }
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setForm({
      notes: "", tripTitle: "", vehicleType: "", vehicleCount: "",
      groupLeader: "", groupLeaderNo: "", nationality: "",
      agent: "", agentId: null, sellingPrice: "",
      groups: [emptyGroup()], legs: [emptyLeg()], flights: [], hotels: [],
    });
    setDraftNote("");
    setError("");
  }

  function handlePdf() {
    setError("");
    const w = window.open("", "_blank");
    if (!w) { setError(t("trips.new.pdfBlocked")); return; }
    const dir = lang === "ar" ? "rtl" : "ltr";
    const money = form.sellingPrice !== "" && form.sellingPrice != null
      ? `${Number(form.sellingPrice).toLocaleString(lang === "ar" ? "ar-SA" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === "ar" ? "ر.س" : "SAR"}`
      : "";
    const rows = ([
      [t("trips.new.agent"), form.agent],
      [t("trips.new.nationality"), form.nationality],
      [t("trips.new.vehicleType"), form.vehicleType],
      [t("trips.new.vehicleCount"), form.vehicleCount],
      [t("trips.new.groupLeader"), form.groupLeader],
      [t("trips.new.groupLeaderNo"), form.groupLeaderNo],
      [t("trips.new.totalPassengers"), totalPax > 0 ? totalPax : ""],
    ] as [string, any][]).filter(([, v]) => v !== "" && v != null);
    const groups = (form.groups || []).filter((g: any) => g.groupNo || g.noOfPax);
    const flights = (form.flights || []).filter((x: any) => x.flightNo || x.airline || x.from || x.to);
    const hotels = (form.hotels || []).filter((x: any) => x.city || x.hotel);
    const legs = (form.legs || []).filter((l: any) => l.origin || l.destination || l.legDate);
    const tableHead = (...cells: string[]) => `<tr>${cells.map(c => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const html = `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><title>${esc(t("trips.new.pdfTitle"))}</title>
<style>
  *{box-sizing:border-box} body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;margin:32px;color:#111}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:18px}
  .brand{font-size:22px;font-weight:800;letter-spacing:1px;color:#1e40af}.sub{font-size:11px;color:#555;margin-top:2px}
  .meta{font-size:10px;color:#666;text-align:${dir === "rtl" ? "left" : "right"}}
  h1{font-size:16px;margin:0 0 14px} h2{font-size:12px;margin:18px 0 6px;color:#1e40af;border-bottom:1px solid #dbeafe;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #ddd;padding:5px 8px;text-align:${dir === "rtl" ? "right" : "left"};vertical-align:top}
  th{background:#f3f6fb;font-weight:600;color:#333;width:34%}
  table.data th{width:auto} .notes{font-size:11px;line-height:1.5;white-space:pre-wrap;border:1px solid #ddd;border-radius:4px;padding:8px;background:#fafafa}
  .price{display:flex;justify-content:space-between;align-items:center;margin-top:18px;border:1.5px solid #1e40af;border-radius:6px;padding:10px 14px;font-size:13px}
  .price strong{font-size:15px;color:#1e40af}
  .foot{margin-top:24px;font-size:9px;color:#888;border-top:1px solid #eee;padding-top:8px;text-align:center}
  @media print{body{margin:10mm}}
</style></head><body>
  <div class="head"><div><div class="brand">SEUM</div><div class="sub">${esc(t("trips.new.pdfTitle"))}</div></div><div class="meta">${esc(new Date().toLocaleString(lang === "ar" ? "ar-SA" : "en-GB"))}</div></div>
  <h1>${esc(form.tripTitle || t("trips.new.pdfUntitled"))}</h1>
  ${rows.length ? `<table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>` : ""}
  ${groups.length ? `<h2>${esc(t("trips.new.groupsTitle"))}</h2><table class="data">${tableHead(t("trips.new.group"), t("trips.new.groupNo"), t("trips.new.noOfPax"))}${groups.map((g: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(g.groupNo)}</td><td>${esc(g.noOfPax)}</td></tr>`).join("")}</table>` : ""}
  ${flights.length ? `<h2>${esc(t("trips.new.flightInfo"))}</h2><table class="data">${tableHead(t("trips.new.flightNo"), t("trips.new.airline"), `${t("common.from")} → ${t("common.to")}`, t("trips.new.ttDate"), t("trips.new.ttDeparture"))}${flights.map((x: any) => `<tr><td>${esc(x.flightNo)}</td><td>${esc(x.airline)}</td><td>${esc(x.from)}${x.from || x.to ? " → " : ""}${esc(x.to)}</td><td>${esc(x.date)}</td><td>${esc(x.time)}</td></tr>`).join("")}</table>` : ""}
  ${hotels.length ? `<h2>${esc(t("trips.new.hotelInfo"))}</h2><table class="data">${tableHead(t("trips.new.city"), t("trips.new.hotel"), t("common.from"), t("common.to"))}${hotels.map((x: any) => `<tr><td>${esc(x.city)}</td><td>${esc(x.hotel)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td></tr>`).join("")}</table>` : ""}
  ${legs.length ? `<h2>${esc(t("trips.new.legsTitle"))}</h2><table class="data">${tableHead("#", `${t("common.from")} → ${t("common.to")}`, t("trips.new.ttDate"), t("trips.new.ttDeparture"))}${legs.map((l: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(l.origin)}${l.origin || l.destination ? " → " : ""}${esc(l.destination)}</td><td>${esc(l.legDate)}</td><td>${esc(l.departureTime)}</td></tr>`).join("")}</table>` : ""}
  ${form.notes ? `<h2>${esc(t("common.notes"))}</h2><div class="notes">${esc(form.notes)}</div>` : ""}
  ${money ? `<div class="price"><span>${esc(t("trips.new.sellingPrice"))}</span><strong>${esc(money)}</strong></div>` : ""}
  <div class="foot">${esc(t("trips.new.pdfFooter"))}</div>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 350);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Trip type is DERIVED from legs: 1 leg = single, 2+ legs = round (client rule)
    const filled = form.legs.filter((l: any) => l.origin && l.destination && l.legDate);
    if (filled.length < 1) { setError(t("trips.new.needOneLeg")); return; }
    const derivedType = filled.length > 1 ? "round" : "single";
    const firstLeg = filled[0];
    setSubmitting(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const legs = filled.map((l: any) => ({
        origin: l.origin, destination: l.destination, legDate: l.legDate,
        departureTime: l.departureTime || undefined,
        overnightFlag: l.overnight, routeType: l.routeType || undefined,
      }));
      const body: any = {
        tripType: derivedType,
        scheduledDate: firstLeg.legDate,
        scheduledStartTime: firstLeg.departureTime || "08:00",
        notes: form.notes || undefined,
        legs,
      };
      ["tripTitle", "vehicleType", "groupLeader", "groupLeaderNo", "nationality", "agent"].forEach(k => {
        if (form[k]) body[k] = form[k];
      });
      if (form.vehicleCount) body.vehicleCount = Number(form.vehicleCount);
      if (form.agentId) body.agentId = form.agentId;
      // Groups (group no + pax each) + flat fields from first group for legacy readers
      const filledGroups = (form.groups || []).filter((g: any) => g.groupNo || g.noOfPax).map((g: any) => ({
        groupNo: g.groupNo || undefined,
        noOfPax: g.noOfPax ? Number(g.noOfPax) : undefined,
      }));
      if (filledGroups.length > 0) {
        body.groups = filledGroups;
        const first = filledGroups[0];
        if (first.groupNo) body.groupNo = first.groupNo;
        const groupTotal = filledGroups.reduce((s: number, g: any) => s + (g.noOfPax || 0), 0);
        if (groupTotal > 0) body.noOfPax = groupTotal;
      }
      if (form.sellingPrice !== "" && form.sellingPrice != null) body.sellingPrice = Number(form.sellingPrice);
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
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      router.push(`/dashboard/trips/manager?highlight=${json.data.id}`);
    } catch { setError(t("trips.new.networkError")); } finally { setSubmitting(false); }
  }

  if (loadingData) return <div className={styles.page}><p>{t("common.loading")}</p></div>;

  const linkedAgent = form.agentId ? agents.find((a: any) => a.id === form.agentId) : null;
  const nationalityIsListed = COUNTRIES.some(c => c.en === form.nationality);
  const totalPax = (form.groups || []).reduce((sum: number, g: any) => sum + (parseInt(g.noOfPax, 10) || 0), 0);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("trips.new.back")}
      </Link>
      <h1 className={styles.pageTitle}>{t("trips.new.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        {/* 0. AGENT (before trip type) + NATIONALITY (linked to the agent's nationality) */}
        <div className={styles.formGrid} style={{ marginBottom: 16 }}>
          <div className={styles.field} style={{ position: 'relative' }}>
            <label className={styles.label}>{t("trips.new.agent")} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-tertiary)' }}>{t("trips.new.agentSub")}</span></label>
            {form.agentId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light, #eff6ff)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{form.agent || '—'}</span>
                {linkedAgent?.phone ? <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{linkedAgent.phone}</span> : null}
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
                                setForm((f: any) => ({ ...f, agentId: a.id, agent: a.displayName, nationality: a.nationality || f.nationality }));
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
          <div className={styles.field}>
            <label className={styles.label}>{t("trips.new.nationality")}</label>
            <select value={form.nationality} onChange={(e) => setForm((f: any) => ({ ...f, nationality: e.target.value }))}>
              <option value="">{t("trips.new.selectNationality")}</option>
              {form.nationality && !nationalityIsListed && (
                <option value={form.nationality}>{form.nationality}</option>
              )}
              {COUNTRIES.map(c => <option key={c.code} value={c.en}>{countryLabel(c, lang)}</option>)}
            </select>
            {linkedAgent?.nationality && (
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{t("trips.new.nationalityFromAgent")}</span>
            )}
          </div>
        </div>

        {/* 1. PROGRAM INFORMATION (client: near agent + nationality) */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Users size={14} /> {t("trips.new.programInfo")}</h3>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{t("trips.new.tripTitle")}</label>
              <input value={form.tripTitle} onChange={(e) => setForm((f: any) => ({ ...f, tripTitle: e.target.value }))} placeholder={t("trips.new.tripTitlePh")} />
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>
                {t("trips.new.groupsTitle")}
                <span style={{ marginInlineStart: 10, fontWeight: 600, textTransform: "none", letterSpacing: 0, color: "var(--color-primary)" }}>
                  {t("trips.new.totalPassengers")}: {totalPax}
                </span>
              </label>
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
                </div>
              </div>
            ))}
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, groups: [...f.groups, emptyGroup()] }))}>
                <Plus size={13} /> {t("trips.new.addGroup")}
              </button>
            </div>
          </div>
        </div>

        {/* 2. VEHICLE + GROUP LEADER */}
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
          <div className={styles.field}>
            <label className={styles.label}>{t("trips.new.groupLeader")}</label>
            <input value={form.groupLeader} onChange={(e) => setForm((f: any) => ({ ...f, groupLeader: e.target.value }))} placeholder={t("trips.new.groupLeaderPh")} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("trips.new.groupLeaderNo")}</label>
            <input value={form.groupLeaderNo} onChange={(e) => setForm((f: any) => ({ ...f, groupLeaderNo: e.target.value }))} placeholder={t("trips.new.groupLeaderNoPh")} />
          </div>
        </div>

        {/* 3. FLIGHT INFORMATION */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Plane size={14} /> {t("trips.new.flightInfo")}</h3>
          {form.flights.map((fl: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <select value={fl.flightType || ""} onChange={(e) => setFlightType(idx, e.target.value)} title={t("trips.new.flightType")} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12, minWidth: 110 }}>
                  <option value="">{t("trips.new.flightType")}</option>
                  {FLIGHT_TYPES.map(o => <option key={o.value} value={o.value}>{o.value === "arrival" ? t("trips.new.rtArrival") : t("trips.new.rtDeparture")}</option>)}
                </select>
                <input placeholder={t("trips.new.flightNo")} value={fl.flightNo} onChange={(e) => setFlight(idx, "flightNo", e.target.value)} />
                <input placeholder={t("trips.new.airline")} value={fl.airline} onChange={(e) => setFlight(idx, "airline", e.target.value)} />
                <SearchableSelect
                  value={fl.from} onChange={(v) => setFlight(idx, "from", v)}
                  options={CITIES.map(c => ({ value: c.en, label: cityLabel(c, lang) }))}
                  placeholder={t("common.from")} title={`${t("common.from")} — ${t("trips.new.flightCityHint")}`}
                  allowCustom customLabel={t("trips.new.otherCity")}
                />
                <SearchableSelect
                  value={fl.to} onChange={(v) => setFlight(idx, "to", v)}
                  options={CITIES.map(c => ({ value: c.en, label: cityLabel(c, lang) }))}
                  placeholder={t("common.to")} title={`${t("common.to")} — ${t("trips.new.flightCityHint")}`}
                  allowCustom customLabel={t("trips.new.otherCity")}
                />
                <input type="date" title={t("trips.new.ttDate")} value={fl.date} onChange={(e) => setFlight(idx, "date", e.target.value)} />
                <input type="time" title={t("trips.new.ttTime")} value={fl.time} onChange={(e) => setFlight(idx, "time", e.target.value)} />
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

        {/* 5. TRIP LEGS (only legs per client — 1 leg = single, 2+ = round) */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("trips.new.legsTitle")}</h3>
          {form.legs.map((leg: any, idx: number) => (
            <div key={idx} className={styles.legRow}>
              <div className={styles.legNo}>{idx + 1}</div>
              <div className={styles.legFields}>
                <SearchableSelect
                  value={leg.origin} onChange={(v) => setLeg(idx, "origin", v)}
                  options={CITIES.map(c => ({ value: c.en, label: cityLabel(c, lang) }))}
                  placeholder={t("common.from")} title={`${t("common.from")} — ${t("trips.new.flightCityHint")}`}
                  allowCustom customLabel={t("trips.new.otherCity")}
                />
                <SearchableSelect
                  value={leg.destination} onChange={(v) => setLeg(idx, "destination", v)}
                  options={CITIES.map(c => ({ value: c.en, label: cityLabel(c, lang) }))}
                  placeholder={t("common.to")} title={`${t("common.to")} — ${t("trips.new.flightCityHint")}`}
                  allowCustom customLabel={t("trips.new.otherCity")}
                />
                <input type="date" title={t("trips.new.ttDate")} value={leg.legDate} onChange={(e) => setLeg(idx, "legDate", e.target.value)} />
                <input type="time" title={t("trips.new.ttDeparture")} value={leg.departureTime} onChange={(e) => setLeg(idx, "departureTime", e.target.value)} />
                <select value={leg.routeType || ""} onChange={(e) => setLeg(idx, "routeType", e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12 }}>
                  <option value="">{t("trips.new.routeType")}</option>
                  {ROUTE_TYPES.map(o => <option key={o.value} value={o.value}>{o.value === "arrival" ? t("trips.new.rtArrival") : o.value === "departure" ? t("trips.new.rtDeparture") : o.value === "intercity" ? t("trips.new.rtIntercity") : t("trips.new.rtIntracity")}</option>)}
                </select>
                <label className={styles.overnightLabel}>
                  <input type="checkbox" checked={leg.overnight} onChange={(e) => setLeg(idx, "overnight", e.target.checked)} />
                  {t("trips.new.overnight")}
                </label>
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => setForm((f: any) => ({ ...f, legs: f.legs.filter((_: any, i: number) => i !== idx) }))} disabled={form.legs.length <= 1}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setForm((f: any) => ({ ...f, legs: [...f.legs, emptyLeg()] }))}>
            <Plus size={13} /> {t("trips.new.addLeg")}
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("common.notes")}</label>
          <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("trips.new.sellingPrice")}</label>
          <input
            type="number" min="0" step="0.01"
            value={form.sellingPrice}
            onChange={(e) => setForm((f: any) => ({ ...f, sellingPrice: e.target.value }))}
            placeholder={t("trips.new.sellingPricePh")}
          />
        </div>

        {draftNote && (
          <div className={styles.draftNote}>
            <span>{draftNote === "saved" ? t("trips.new.draftSaved") : t("trips.new.draftRestored")}</span>
            <button type="button" onClick={discardDraft}>{t("trips.new.discardDraft")}</button>
          </div>
        )}

        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryBtn} onClick={saveDraft} disabled={submitting}>
            <FileDown size={14} /> {t("trips.new.saveDraft")}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handlePdf} disabled={submitting}>
            <Printer size={14} /> {t("trips.new.pdf")}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Save size={14} /> {submitting ? t("trips.new.generating") : t("trips.new.generateEstimate")}
          </button>
        </div>
      </form>
    </div>
  );
}
