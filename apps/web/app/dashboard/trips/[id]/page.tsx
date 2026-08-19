"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Bus, User, Clock, FileText, UserPlus, Trash2, Play, CheckCircle, XCircle, AlertTriangle, UserCheck, Route, Users, Plane, Hotel, Printer, X } from "lucide-react";
import TripTimeline from "@/components/TripTimeline";
import DriverAssignModal from "@/components/DriverAssignModal";
import styles from "./page.module.css";
import "./print.css";

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
  const [showManifest, setShowManifest] = useState(false);

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
          {trip.tripTitle || trip.routeName || "Trip"} <span className={styles.tripId}>#{trip.id?.slice(0, 8)}</span>
        </h1>
        <div className={styles.headerRight}>
          <span className={styles.typeTag}>{trip.tripType === "round" ? "Round Trip" : "Single Trip"}</span>
          {trip.tripType === "round" && (
            <button className={styles.manifestBtn} onClick={() => setShowManifest(true)}>
              <Printer size={13} /> Print Manifest
            </button>
          )}
          <span className={`${styles.statusBadge} ${styles[`status_${trip.status}`]}`}>
            {trip.status.replace("_", " ")}
          </span>
        </div>
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
            {trip.tripType === "round" && (
              <div className={styles.detailRow}>
                <Route size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>Legs</span><span>{trip.legCount ?? trip.legs?.length ?? 0} stops across {trip.legs?.length ? new Set(trip.legs.map((l: any) => l.legDate)).size : 1} date(s)</span></div>
              </div>
            )}
          </div>

          {trip.tripType === "round" && trip.legs && trip.legs.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><Route size={14} /> Trip Legs</h3>
              <div className={styles.legsTimeline}>
                {trip.legs.map((leg: any, idx: number) => (
                  <div key={leg.id || idx} className={styles.legItem}>
                    <div className={styles.legMarker}>
                      <span>{idx + 1}</span>
                      {idx < trip.legs.length - 1 && <div className={styles.legLine} />}
                    </div>
                    <div className={styles.legContent}>
                      <div className={styles.legPath}>{leg.origin} → {leg.destination}</div>
                      <div className={styles.legMeta}>
                        {new Date(leg.legDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        {leg.departureTime && <> · dep {leg.departureTime.slice(0, 5)}</>}
                        {leg.arrivalTime && <> · arr {leg.arrivalTime.slice(0, 5)}</>}
                        {leg.overnightFlag && <span className={styles.overnightBadge}>Overnight</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(trip.groupLeader || trip.groupNo || trip.noOfPax != null || trip.agent) && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><Users size={14} /> Manifest</h3>
              {trip.tripTitle && <div className={styles.detailRow}><span className={styles.detailLabel}>Title</span><span>{trip.tripTitle}</span></div>}
              {trip.groupLeader && <div className={styles.detailRow}><span className={styles.detailLabel}>Group Leader</span><span>{trip.groupLeader}{trip.groupLeaderNo ? ` (${trip.groupLeaderNo})` : ""}</span></div>}
              {trip.nationality && <div className={styles.detailRow}><span className={styles.detailLabel}>Nationality</span><span>{trip.nationality}</span></div>}
              {trip.agent && <div className={styles.detailRow}><span className={styles.detailLabel}>Agent</span><span>{trip.agent}</span></div>}
              {trip.groupNo && <div className={styles.detailRow}><span className={styles.detailLabel}>Group No</span><span>{trip.groupNo}</span></div>}
              {trip.noOfPax != null && <div className={styles.detailRow}><span className={styles.detailLabel}>No of Pax</span><span>{trip.noOfPax}</span></div>}
              {trip.vehicleType && <div className={styles.detailRow}><span className={styles.detailLabel}>Vehicle Type</span><span>{trip.vehicleType}</span></div>}
              {trip.flights?.length > 0 && (
                <div className={styles.detailRow}>
                  <Plane size={13} className={styles.detailIcon} />
                  <div className={styles.subList}>
                    {trip.flights.map((f: any, i: number) => (
                      <span key={i} className={styles.subItem}>
                        {f.flightNo || "Flight"}{f.airline ? ` · ${f.airline}` : ""}{f.from ? ` · ${f.from} → ${f.to || "?"}` : ""}{f.date ? ` · ${f.date}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {trip.hotels?.length > 0 && (
                <div className={styles.detailRow}>
                  <Hotel size={13} className={styles.detailIcon} />
                  <div className={styles.subList}>
                    {trip.hotels.map((h: any, i: number) => (
                      <span key={i} className={styles.subItem}>
                        {h.hotel || "Hotel"}{h.city ? ` · ${h.city}` : ""}{h.from ? ` · ${h.from}${h.to ? ` → ${h.to}` : ""}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

      {showManifest && (
        <div className={styles.overlay} onClick={() => setShowManifest(false)}>
          <div className={styles.manifestModal} onClick={e => e.stopPropagation()}>
            <div className={styles.manifestToolbar}>
              <h2>Trip Manifest</h2>
              <button className={styles.manifestClose} onClick={() => setShowManifest(false)}><X size={15} /></button>
            </div>
            <div id="manifest-print" className={styles.manifestSheet}>
              <h2 className={styles.manifestBrand}>{trip.tripTitle || "TRIP MANIFEST"}</h2>
              <p className={styles.manifestSub}>Trip Type: {trip.tripType === "round" ? "Round Trip" : "Single Trip"} · Bus: {trip.busPlate || "—"} · Driver: {trip.driverName || "—"}</p>

              <h3 className={styles.manifestSection}>Trip Info</h3>
              <table className={styles.manifestTable}>
                <tbody>
                  {[["Trip Title", trip.tripTitle], ["Type of Vehicle", trip.vehicleType], ["Group Leader", trip.groupLeader], ["Group Leader No", trip.groupLeaderNo], ["Nationality", trip.nationality], ["Agent", trip.agent], ["Group No", trip.groupNo], ["No Of Pax", trip.noOfPax != null ? String(trip.noOfPax) : "—"], ["Route", trip.routeName || "—"]]
                    .filter(([k, v]) => v)
                    .map(([k, v], i) => (
                      <tr key={i}><td>{k}</td><td>{v}</td></tr>
                    ))}
                </tbody>
              </table>

              {trip.legs?.length > 0 && (
                <>
                  <h3 className={styles.manifestSection}>Transportation / Route</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>#</th><th>From</th><th>To</th><th>Date</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {trip.legs.map((leg: any, idx: number) => (
                        <tr key={leg.id || idx}>
                          <td>{idx + 1}</td>
                          <td>{leg.origin}</td>
                          <td>{leg.destination}</td>
                          <td>{leg.legDate}</td>
                          <td>{leg.departureTime?.slice(0, 5) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {trip.flights?.length > 0 && (
                <>
                  <h3 className={styles.manifestSection}>Flights</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>Flight No</th><th>Airline</th><th>From</th><th>To</th><th>Date</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {trip.flights.map((f: any, i: number) => (
                        <tr key={i}><td>{f.flightNo || "—"}</td><td>{f.airline || "—"}</td><td>{f.from || "—"}</td><td>{f.to || "—"}</td><td>{f.date || "—"}</td><td>{f.time?.slice(0, 5) || "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {trip.hotels?.length > 0 && (
                <>
                  <h3 className={styles.manifestSection}>Hotels</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>City</th><th>Hotel</th><th>Check-in</th><th>Check-out</th></tr>
                    </thead>
                    <tbody>
                      {trip.hotels.map((h: any, i: number) => (
                        <tr key={i}><td>{h.city || "—"}</td><td>{h.hotel || "—"}</td><td>{h.from || "—"}</td><td>{h.to || "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className={styles.manifestActions}>
              <button className={styles.manifestPrintBtn} onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}

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
