"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Bus, User, Clock, FileText, UserPlus, Trash2, Play, CheckCircle, XCircle, AlertTriangle, UserCheck } from "lucide-react";
import TripTimeline from "@/components/TripTimeline";
import DriverAssignModal from "@/components/DriverAssignModal";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerContact, setPassengerContact] = useState("");
  const [showDelay, setShowDelay] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDriverAssign, setShowDriverAssign] = useState(false);

  async function fetchTrip() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setTrip(json.data.trip || json.data); setPassengers(json.data.passengers || []); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchTrip(); }, [id]);

  async function performAction(action: string, body: any) {
    setActionLoading(action);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { alert(json.message || `Failed to ${action}`); return; }
      setShowDelay(false); setShowCancel(false);
      await fetchTrip();
    } catch { alert(`Failed to ${action}`); } finally { setActionLoading(""); }
  }

  async function addPassenger() {
    if (!passengerName.trim()) return;
    setActionLoading("addPassenger");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${id}/passengers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: passengerName, contact: passengerContact || undefined }),
      });
      const json = await res.json();
      if (json.success) { setPassengerName(""); setPassengerContact(""); await fetchTrip(); }
      else alert(json.message || "Failed to add passenger");
    } catch {} finally { setActionLoading(""); }
  }

  async function removePassenger(pId: string) {
    setActionLoading("removePassenger");
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API}/operations/trips/${id}/passengers/${pId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchTrip();
    } catch {} finally { setActionLoading(""); }
  }

  if (loading) return <div className={styles.page}><p>Loading trip...</p></div>;
  if (!trip) return <div className={styles.page}><p>Trip not found</p></div>;

  const isScheduled = trip.status === "scheduled";
  const isEnRoute = trip.status === "en_route";
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";
  const isDelayed = trip.status === "delayed";
  const canModify = !isCompleted && !isCancelled;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Trips
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {trip.routeName || "Trip"} <span className={styles.tripId}>#{trip.id?.slice(0, 8)}</span>
        </h1>
        <span className={`${styles.statusBadge} ${styles[`status_${trip.status}`]}`}>
          {trip.status.replace("_", " ")}
        </span>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Trip Details</h3>
            <div className={styles.detailRow}>
              <MapPin size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Route</span><span>{trip.routeName || trip.routeId || "—"}</span></div>
            </div>
            <div className={styles.detailRow}>
              <Bus size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Bus</span><span>{trip.busPlate || trip.busId || "—"}</span></div>
            </div>
            <div className={styles.detailRow}>
              <User size={14} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Driver</span>
                <span className={styles.driverRow}>
                  {trip.driverName || trip.driverId || <span className={styles.muted}>Not assigned</span>}
                  {trip.driverConfirmationStatus && trip.driverConfirmationStatus !== "pending" && (
                    <span className={styles.confirmBadge} data-status={trip.driverConfirmationStatus}>
                      {trip.driverConfirmationStatus}
                    </span>
                  )}
                  {canModify && (
                    <button className={styles.assignDriverBtn} onClick={() => setShowDriverAssign(true)}>
                      <UserCheck size={12} /> {trip.driverId ? "Change" : "Assign"}
                    </button>
                  )}
                </span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <Clock size={14} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Date & Time</span>
                <span>{trip.scheduledDate ? new Date(trip.scheduledDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"} at {trip.scheduledStartTime?.slice(0, 5) || "—"}</span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <FileText size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>Type</span><span className={styles.typeTag}>{trip.tripType}</span></div>
            </div>
            {trip.scheduledEndTime && (
              <div className={styles.detailRow}>
                <Clock size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>End Time</span><span>{trip.scheduledEndTime.slice(0, 5)}</span></div>
              </div>
            )}
            {trip.notes && (
              <div className={styles.detailRow}>
                <FileText size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>Notes</span><span>{trip.notes}</span></div>
              </div>
            )}
          </div>

          {(canModify || isDelayed) && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Actions</h3>
              <div className={styles.actionRow}>
                {isScheduled && (
                  <button className={styles.actionBtn} onClick={() => performAction("start", {})} disabled={actionLoading === "start"}>
                    <Play size={13} /> {actionLoading === "start" ? "Starting..." : "Start Trip"}
                  </button>
                )}
                {isEnRoute && (
                  <button className={`${styles.actionBtn} ${styles.actionDone}`} onClick={() => performAction("complete", {})} disabled={actionLoading === "complete"}>
                    <CheckCircle size={13} /> {actionLoading === "complete" ? "Completing..." : "Complete Trip"}
                  </button>
                )}
                {!showDelay && (isScheduled || isEnRoute) && (
                  <button className={`${styles.actionBtn} ${styles.actionWarn}`} onClick={() => setShowDelay(true)} disabled={actionLoading !== ""}>
                    <AlertTriangle size={13} /> Delay
                  </button>
                )}
                {!showCancel && canModify && (
                  <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => setShowCancel(true)} disabled={actionLoading !== ""}>
                    <XCircle size={13} /> Cancel
                  </button>
                )}
              </div>

              {showDelay && (
                <div className={styles.inlineForm}>
                  <input type="number" min={5} value={delayMinutes} onChange={(e) => setDelayMinutes(Number(e.target.value))} placeholder="Minutes" />
                  <input type="text" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} placeholder="Reason" />
                  <button className={styles.actionBtn} onClick={() => performAction("delay", { delayMinutes, delayReason })} disabled={actionLoading === "delay"}>
                    {actionLoading === "delay" ? "Saving..." : "Confirm Delay"}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowDelay(false)}>Cancel</button>
                </div>
              )}

              {showCancel && (
                <div className={styles.inlineForm}>
                  <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason" />
                  <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => performAction("cancel", { rejectionReason: cancelReason })} disabled={actionLoading === "cancel"}>
                    {actionLoading === "cancel" ? "Cancelling..." : "Confirm Cancel"}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowCancel(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.column}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Status Timeline</h3>
            <TripTimeline
              status={trip.status}
              actualStartTime={trip.actualStartTime}
              actualEndTime={trip.actualEndTime}
              delayMinutes={trip.delayMinutes}
              delayReason={trip.delayReason}
              rejectionReason={trip.rejectionReason}
            />
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Passengers ({passengers.length})</h3>
            {canModify && (
              <div className={styles.addPassenger}>
                <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Name" className={styles.pInput} />
                <input value={passengerContact} onChange={(e) => setPassengerContact(e.target.value)} placeholder="Contact (optional)" className={styles.pInput2} />
                <button className={styles.actionBtn} onClick={addPassenger} disabled={actionLoading === "addPassenger" || !passengerName.trim()}>
                  <UserPlus size={13} /> Add
                </button>
              </div>
            )}
            {passengers.length === 0 ? (
              <p className={styles.emptyText}>No passengers</p>
            ) : (
              <table className={styles.passengerTable}>
                <thead>
                  <tr><th>Name</th><th>Contact</th><th style={{ width: 36 }}></th></tr>
                </thead>
                <tbody>
                  {passengers.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className={styles.muted}>{p.contact || "—"}</td>
                      <td>
                        {canModify && (
                          <button className={styles.iconBtn} onClick={() => removePassenger(p.id)} disabled={actionLoading === "removePassenger"}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showDriverAssign && (
        <DriverAssignModal
          tripId={id}
          currentDriverId={trip.driverId}
          currentDriverName={trip.driverName}
          currentConfirmationStatus={trip.driverConfirmationStatus}
          onClose={() => setShowDriverAssign(false)}
          onAssigned={() => { setShowDriverAssign(false); fetchTrip(); }}
        />
      )}
    </div>
  );
}
