"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CalendarDays, Repeat, MapPin, Bus, User, FileText, RotateCcw, Edit, Trash2, X } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", custom_days: "Custom",
};

export default function RecurringTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      else { alert(json.message || "Generation failed"); }
    } catch { alert("Network error"); } finally { setGenerating(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this recurring pattern?")) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/recurring-trips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) router.push("/dashboard/recurring-trips");
      else alert(json.message || "Delete failed");
    } catch { alert("Network error"); }
  }

  if (loading) return <div className={styles.page}><p>Loading pattern...</p></div>;
  if (!pattern) return <div className={styles.page}><p>Pattern not found</p></div>;

  function daysDisplay() {
    if (pattern.frequency === "daily") return "Every day";
    if (pattern.frequency === "weekdays") return "Monday – Friday";
    if (pattern.frequency === "weekends") return "Saturday – Sunday";
    return pattern.daysOfWeek?.map((d: number) => DAY_LABELS[d]).join(", ") || "—";
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/recurring-trips" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Recurring Trips
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Repeat size={18} /> {FREQ_LABELS[pattern.frequency] || pattern.frequency} Trip
            <span className={styles.patternId}>#{pattern.id?.slice(0, 8)}</span>
          </h1>
          <p className={styles.pageDesc}>{pattern.routeName || pattern.routeId}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.statusBadge} ${pattern.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
            {pattern.isActive ? "Active" : "Inactive"}
          </span>
          <button className={styles.actionBtn} onClick={() => { setShowGenerate(true); setGenResult(null); }}>
            <RotateCcw size={13} /> Generate Trips
          </button>
          <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handleDelete}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Pattern Details</h3>
          <div className={styles.detailRow}>
            <MapPin size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>Route</span><span>{pattern.routeName || pattern.routeId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Bus size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>Bus</span><span>{pattern.busPlate || pattern.busId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <User size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>Driver</span><span>{pattern.driverName || pattern.driverId || "—"}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Repeat size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>Frequency</span><span>{FREQ_LABELS[pattern.frequency]}</span></div>
          </div>
          <div className={styles.detailRow}>
            <Clock size={14} className={styles.detailIcon} />
            <div><span className={styles.detailLabel}>Schedule</span><span>{pattern.scheduledStartTime?.slice(0, 5)}{pattern.scheduledEndTime ? ` – ${pattern.scheduledEndTime.slice(0, 5)}` : ""} &middot; {daysDisplay()}</span></div>
          </div>
          <div className={styles.detailRow}>
            <CalendarDays size={14} className={styles.detailIcon} />
            <div>
              <span className={styles.detailLabel}>Period</span>
              <span>{new Date(pattern.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {pattern.endDate ? ` – ${new Date(pattern.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : " – Ongoing"}
              </span>
            </div>
          </div>
          {pattern.specificDates?.length > 0 && (
            <div className={styles.detailRow}>
              <CalendarDays size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Specific Dates</span><span className={styles.dateList}>{pattern.specificDates.join(", ")}</span></div>
            </div>
          )}
          {pattern.notes && (
            <div className={styles.detailRow}>
              <FileText size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Notes</span><span>{pattern.notes}</span></div>
            </div>
          )}
          {pattern.lastGeneratedAt && (
            <div className={styles.detailRow}>
              <RotateCcw size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Last Generated</span><span>{new Date(pattern.lastGeneratedAt).toLocaleString()}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className={styles.modalOverlay} onClick={() => setShowGenerate(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><RotateCcw size={16} /> Generate Trips</h3>
              <button className={styles.closeBtn} onClick={() => setShowGenerate(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              {genResult ? (
                <div className={styles.genResult}>
                  <p className={styles.genSuccess}>Successfully generated <strong>{genResult.generatedCount}</strong> trip(s)!</p>
                  <button className={styles.actionBtn} onClick={() => setShowGenerate(false)}>Done</button>
                </div>
              ) : (
                <>
                  <div className={styles.genField}>
                    <label>Start Date</label>
                    <input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div className={styles.genField}>
                    <label>End Date</label>
                    <input type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
                  </div>
                  <button className={`${styles.actionBtn} ${styles.genBtn}`} onClick={handleGenerate} disabled={generating || !genStart || !genEnd}>
                    {generating ? "Generating..." : "Generate Trips"}
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
