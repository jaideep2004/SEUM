"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CalendarDays, Repeat, MapPin, Bus, User, FileText, RotateCcw, Edit, Trash2, X } from "lucide-react";
import { useLanguage, formatDate, formatDateTime, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DAY_KEYS = [
  "recurring.detail.daySun", "recurring.detail.dayMon", "recurring.detail.dayTue",
  "recurring.detail.dayWed", "recurring.detail.dayThu", "recurring.detail.dayFri",
  "recurring.detail.daySat",
];
const FREQ_KEYS: Record<string, string> = {
  daily: "recurring.detail.freqDaily",
  weekdays: "recurring.detail.freqWeekdays",
  weekends: "recurring.detail.freqWeekends",
  custom_days: "recurring.detail.freqCustom",
};

export default function RecurringTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function fetchPattern() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/recurring-trips/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setPattern(json.data); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchPattern(); }, [id]);

  async function handleGenerate() {
    if (!genStart || !genEnd) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/recurring-trips/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: genStart, endDate: genEnd }),
      });
      const json = await res.json();
      if (json.success) { setGenResult(json.data); await fetchPattern(); }
      else { alert(json.message || t("recurring.detail.genFailed")); }
    } catch { alert(t("recurring.detail.networkError")); } finally { setGenerating(false); }
  }

  async function handleDelete() {
    if (!confirm(t("recurring.detail.confirmDelete"))) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/recurring-trips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) router.push("/dashboard/recurring-trips");
      else alert(json.message || t("recurring.detail.deleteFailed"));
    } catch { alert(t("recurring.detail.networkError")); }
  }

  if (loading) return <div className={styles.page}><p>{t("recurring.detail.loading")}</p></div>;
  if (!pattern) return <div className={styles.page}><p>{t("recurring.detail.notFound")}</p></div>;

  function daysDisplay() {
    if (pattern.frequency === "daily") return t("recurring.detail.everyDay");
    if (pattern.frequency === "weekdays") return t("recurring.detail.weekdaysLong");
    if (pattern.frequency === "weekends") return t("recurring.detail.weekendsLong");
    return pattern.daysOfWeek?.map((d: number) => t(DAY_KEYS[d])).join(", ") || "—";
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/recurring-trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("recurring.detail.back")}
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Repeat size={18} /> {FREQ_KEYS[pattern.frequency] ? t(FREQ_KEYS[pattern.frequency]) : pattern.frequency} {t("recurring.detail.tripWord")}
            <span className={styles.patternId}>#{pattern.id?.slice(0, 8)}</span>
          </h1>
          <p className={styles.pageDesc}>{pattern.routeName || pattern.routeId || "—"}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.statusBadge} ${pattern.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
            {pattern.isActive ? t("recurring.detail.stActive") : t("recurring.detail.stInactive")}
          </span>
          <span className={styles.typeTag}>{pattern.tripType === "round" ? t("recurring.detail.roundTrip") : t("recurring.detail.singleTrip")}</span>
          <button className={styles.actionBtn} onClick={() => { setShowGenerate(true); setGenResult(null); }}>
            <RotateCcw size={13} /> {t("recurring.detail.generateTrips")}
          </button>
          <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handleDelete}>
            <Trash2 size={13} /> {t("common.delete")}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("recurring.detail.patternDetails")}</h3>
          <div className={styles.detailRow}>
            <MapPin size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>{t("recurring.detail.route")}</span><span>{pattern.routeName || pattern.routeId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Bus size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>{t("recurring.detail.bus")}</span><span>{pattern.busPlate || pattern.busId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <User size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>{t("roles.driver")}</span><span>{pattern.driverName || pattern.driverId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Repeat size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>{t("recurring.detail.frequency")}</span><span>{FREQ_KEYS[pattern.frequency] ? t(FREQ_KEYS[pattern.frequency]) : pattern.frequency}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Clock size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>{t("recurring.detail.schedule")}</span><span>{pattern.scheduledStartTime?.slice(0, 5)}{pattern.scheduledEndTime ? ` – ${pattern.scheduledEndTime.slice(0, 5)}` : ""} &middot; {daysDisplay()}</span></div>
          </div>
          <div className={styles.detailRow}>
            <CalendarDays size={14} className={styles.detailIcon} />
            <div>
              <span className={styles.detailLabel}>{t("recurring.detail.period")}</span>
              <span>{formatDate(pattern.startDate, lang)}
                {pattern.endDate ? ` – ${formatDate(pattern.endDate, lang)}` : ` ${t("recurring.detail.ongoingDash")}`}
              </span>
            </div>
          </div>
          {pattern.specificDates?.length > 0 && (
            <div className={styles.detailRow}>
              <CalendarDays size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("recurring.detail.specificDates")}</span><span className={styles.dateList}>{pattern.specificDates.join(", ")}</span></div>
            </div>
          )}
          {pattern.notes && (
            <div className={styles.detailRow}>
              <FileText size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("common.notes")}</span><span>{pattern.notes}</span></div>
            </div>
          )}
          {pattern.lastGeneratedAt && (
            <div className={styles.detailRow}>
              <RotateCcw size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("recurring.detail.lastGenerated")}</span><span>{formatDateTime(pattern.lastGeneratedAt, lang)}</span></div>
            </div>
          )}
        </div>

        {pattern.tripType === "round" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("recurring.detail.legTemplate")}</h3>
            <div className={styles.legsTimeline}>
              {pattern.legs?.map((leg: any, idx: number) => (
                <div key={idx} className={styles.legItem}>
                  <div className={styles.legMarker}>
                    <span>{idx + 1}</span>
                    {idx < pattern.legs.length - 1 && <div className={styles.legLine} />}
                  </div>
                  <div className={styles.legContent}>
                    <div className={styles.legPath}>{leg.origin} → {leg.destination}</div>
                    <div className={styles.legMeta}>
                      {t("recurring.detail.dayWord")} {leg.dayOffset} · {leg.departureTime ? `${t("recurring.detail.depWord")} ${leg.departureTime.slice(0, 5)}` : ""}{leg.arrivalTime ? ` · ${t("recurring.detail.arrWord")} ${leg.arrivalTime.slice(0, 5)}` : ""}
                      {leg.overnightFlag && <span className={styles.overnightBadge}>{t("recurring.detail.overnight")}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {(!pattern.legs || pattern.legs.length === 0) && <p className={styles.muted}>{t("recurring.detail.noLegs")}</p>}
            </div>
          </div>
        )}

        {pattern.tripTitle && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("recurring.detail.manifestInfo")}</h3>
            <div className={styles.detailRow}>
              <FileText size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("recurring.detail.tripTitle")}</span><span>{pattern.tripTitle}</span></div>
            </div>
            {pattern.vehicleType && (
              <div className={styles.detailRow}>
                <Bus size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("recurring.detail.vehicleType")}</span><span>{pattern.vehicleType}</span></div>
              </div>
            )}
            <div className={styles.detailRow}>
              <User size={14} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>{t("recurring.detail.groupLeader")}</span>
                <span>{pattern.groupLeader || "—"}{pattern.groupLeaderNo ? ` · ${pattern.groupLeaderNo}` : ""}</span>
              </div>
            </div>
            {pattern.nationality && (
              <div className={styles.detailRow}>
                <User size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("recurring.detail.nationality")}</span><span>{pattern.nationality}</span></div>
              </div>
            )}
            <div className={styles.detailRow}>
              <User size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("recurring.detail.agentGroup")}</span><span>{pattern.agent || "—"}{pattern.groupNo ? ` · ${t("recurring.detail.groupWord")} ${pattern.groupNo}` : ""}</span></div>
            </div>
            {pattern.noOfPax != null && (
              <div className={styles.detailRow}>
                <User size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("recurring.detail.noOfPax")}</span><span>{pattern.noOfPax}</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className={styles.modalOverlay} onClick={() => setShowGenerate(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><RotateCcw size={16} /> {t("recurring.detail.generateTrips")}</h3>
              <button className={styles.closeBtn} onClick={() => setShowGenerate(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              {genResult ? (
                <div className={styles.genResult}>
                  <p className={styles.genSuccess}>{t("recurring.detail.genSuccessPre")} <strong>{genResult.generatedCount}</strong> {t("recurring.detail.genSuccessPost")}</p>
                  <button className={styles.actionBtn} onClick={() => setShowGenerate(false)}>{t("recurring.detail.done")}</button>
                </div>
              ) : (
                <>
                  <div className={styles.genField}>
                    <label>{t("recurring.detail.genStartDate")}</label>
                    <input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div className={styles.genField}>
                    <label>{t("recurring.detail.genEndDate")}</label>
                    <input type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
                  </div>
                  <button className={`${styles.actionBtn} ${styles.genBtn}`} onClick={handleGenerate} disabled={generating || !genStart || !genEnd}>
                    {generating ? t("recurring.detail.generating") : t("recurring.detail.generateTrips")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
