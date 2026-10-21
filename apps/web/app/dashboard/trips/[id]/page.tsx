"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Bus, User, Clock, FileText, UserPlus, Trash2, Play, CheckCircle, XCircle, AlertTriangle, UserCheck, Route, Users, Plane, Hotel, Printer, X } from "lucide-react";
import TripTimeline from "@/components/TripTimeline";
import DriverAssignModal from "@/components/DriverAssignModal";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";
import "./print.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
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
      if (!json.success) { alert(json.message || `${t("trips.detail.failedTo")} ${action}`); return; }
      setShowDelay(false); setShowCancel(false);
      await fetchTrip();
    } catch { alert(`${t("trips.detail.failedTo")} ${action}`); } finally { setActionLoading(""); }
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
      else alert(json.message || t("trips.detail.failedAddPassenger"));
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

  if (loading) return <div className={styles.page}><p>{t("trips.detail.loading")}</p></div>;
  if (!trip) return <div className={styles.page}><p>{t("trips.detail.notFound")}</p></div>;

  const isScheduled = trip.status === "scheduled";
  const isEnRoute = trip.status === "en_route";
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";
  const isDelayed = trip.status === "delayed";
  const canModify = !isCompleted && !isCancelled;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("trips.detail.back")}
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {trip.tripTitle || trip.routeName ||
t("trips.detail.titleFallback")} <span className={styles.tripId}>#{trip.tripNumber || trip.id?.slice(0, 8)}</span>
        </h1>
        <div className={styles.headerRight}>
          <span className={styles.typeTag}>{trip.tripType === "round" ? t("trips.detail.roundTrip") : t("trips.detail.singleTrip")}</span>
          {trip.tripType === "round" && (
            <button className={styles.manifestBtn} onClick={() => setShowManifest(true)}>
              <Printer size={13} /> {t("trips.detail.printManifest")}
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
            <h3 className={styles.cardTitle}>{t("trips.detail.detailsTitle")}</h3>
            <div className={styles.detailRow}>
              <MapPin size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("trips.detail.route")}</span><span>{trip.routeName || trip.routeId || "—"}</span></div>
            </div>
            <div className={styles.detailRow}>
              <Bus size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("trips.detail.bus")}</span><span>{trip.busPlate || trip.busId || "—"}</span></div>
            </div>
            <div className={styles.detailRow}>
              <User size={14} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>{t("roles.driver")}</span>
                <span className={styles.driverRow}>
                  {trip.driverName || trip.driverId || <span className={styles.muted}>{t("trips.detail.notAssigned")}</span>}
                  {trip.driverConfirmationStatus && trip.driverConfirmationStatus !== "pending" && (
                    <span className={styles.confirmBadge} data-status={trip.driverConfirmationStatus}>
                      {trip.driverConfirmationStatus}
                    </span>
                  )}
                  {canModify && (
                    <button className={styles.assignDriverBtn} onClick={() => setShowDriverAssign(true)}>
                      <UserCheck size={12} /> {trip.driverId ? t("trips.detail.change") : t("trips.detail.assign")}
                    </button>
                  )}
                </span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <Clock size={14} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>{t("trips.detail.dateTime")}</span>
                <span>{trip.scheduledDate ? formatDate(trip.scheduledDate, lang) : "—"} {t("trips.detail.at")} {trip.scheduledStartTime?.slice(0, 5) || "—"}</span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <FileText size={14} className={styles.detailIcon} />
              <div><span className={styles.detailLabel}>{t("trips.detail.type")}</span><span className={styles.typeTag}>{trip.tripType}</span></div>
            </div>
            {trip.scheduledEndTime && (
              <div className={styles.detailRow}>
                <Clock size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("trips.detail.endTime")}</span><span>{trip.scheduledEndTime.slice(0, 5)}</span></div>
              </div>
            )}
            {trip.notes && (
              <div className={styles.detailRow}>
                <FileText size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("common.notes")}</span><span>{trip.notes}</span></div>
              </div>
            )}
            {trip.tripType === "round" && (
              <div className={styles.detailRow}>
                <Route size={14} className={styles.detailIcon} />
                <div><span className={styles.detailLabel}>{t("trips.detail.legs")}</span><span>{trip.legCount ?? trip.legs?.length ?? 0} {t("trips.detail.stopsAcross")} {trip.legs?.length ? new Set(trip.legs.map((l: any) => l.legDate)).size : 1} {t("trips.detail.dates")}</span></div>
              </div>
            )}
          </div>

          {trip.legs && trip.legs.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><Route size={14} /> {t("trips.detail.legsTitle")}</h3>
              <div className={styles.legsTimeline}>
                {trip.legs.map((leg: any, idx: number) => (
                  <div key={leg.id || idx} className={styles.legItem}>
                    <div className={styles.legMarker}>
                      <span>{idx + 1}</span>
                      {idx < trip.legs.length - 1 && <div className={styles.legLine} />}
                    </div>
                    <div className={styles.legContent}>
                      <div className={styles.legPath}>{leg.legCode || `${trip.tripNumber || ""}-S${leg.legNo || idx + 1}`} · {leg.origin} → {leg.destination}</div>
                      <div className={styles.legMeta}>
                        {formatDate(leg.legDate, lang)}
                        {leg.departureTime && <> · {t("trips.detail.dep")} {leg.departureTime.slice(0, 5)}</>}
                        {leg.arrivalTime && <> · {t("trips.detail.arr")} {leg.arrivalTime.slice(0, 5)}</>}
                        {leg.overnightFlag && <span className={styles.overnightBadge}>{t("trips.detail.overnight")}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(trip.groupLeader || trip.groupNo || trip.noOfPax != null || trip.agent || trip.agentId) && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><Users size={14} /> {t("trips.detail.manifest")}</h3>
              {trip.tripTitle && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.title")}</span><span>{trip.tripTitle}</span></div>}
              {trip.groupLeader && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.groupLeader")}</span><span>{trip.groupLeader}{trip.groupLeaderNo ? ` (${trip.groupLeaderNo})` : ""}</span></div>}
              {trip.nationality && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.nationality")}</span><span>{trip.nationality}</span></div>}
              {(trip.agent || trip.agentId) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("trips.detail.agent")}</span>
                  <span>
                    {trip.agentId ? (
                      <Link href={`/dashboard/customers/${trip.agentId}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}>
                        {trip.agentCompanyName || trip.agentName || trip.agent}
                      </Link>
                    ) : (
                      trip.agent
                    )}
                    {trip.agentPhone && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>{trip.agentPhone}</span>}
                  </span>
                </div>
              )}
              {trip.groupNo && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.groupNo")}</span><span>{trip.groupNo}</span></div>}
              {trip.noOfPax != null && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.noOfPax")}</span><span>{trip.noOfPax}</span></div>}
              {trip.sellingPrice != null && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.sellingPrice")}</span><span>{formatCurrency(Number(trip.sellingPrice), lang)}</span></div>}
              {trip.vehicleType && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.vehicleType")}</span><span>{trip.vehicleType}{trip.vehicleCount ? ` × ${trip.vehicleCount}` : ""}</span></div>}
              {trip.vehicleCount != null && !trip.vehicleType && <div className={styles.detailRow}><span className={styles.detailLabel}>{t("trips.detail.vehicleCount")}</span><span>{trip.vehicleCount}</span></div>}
              {Array.isArray(trip.groups) && trip.groups.length > 0 && (
                <div className={styles.detailRow} style={{ alignItems: "flex-start" }}>
                  <span className={styles.detailLabel}>{t("trips.detail.groupsTitle")}</span>
                  <span>
                    {trip.groups.map((g: any, i: number) => (
                      <span key={i} style={{ display: "block", marginBottom: 4 }}>
                        <strong>{t("trips.new.group")} {i + 1}</strong>
                        {g.groupNo ? ` — ${g.groupNo}` : ""}{g.groupLeader ? ` · ${g.groupLeader}` : ""}{g.nationality ? ` (${g.nationality})` : ""}{g.noOfPax != null ? ` · ${g.noOfPax} ${t("trips.detail.paxShort")}` : ""}
                        {g.nusukInfo?.reference ? <span style={{ display: "block", fontSize: 11, color: "var(--color-text-secondary)" }}>{t("trips.detail.nusukRef")}: {g.nusukInfo.reference}</span> : null}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {trip.flights?.length > 0 && (
                <div className={styles.detailRow}>
                  <Plane size={13} className={styles.detailIcon} />
                  <div className={styles.subList}>
                    {trip.flights.map((f: any, i: number) => (
                      <span key={i} className={styles.subItem}>
                        {f.flightNo || t("trips.detail.flight")}{f.airline ? ` · ${f.airline}` : ""}{f.from ? ` · ${f.from} → ${f.to || "?"}` : ""}{f.date ? ` · ${f.date}` : ""}
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
                        {h.hotel || t("trips.detail.hotel")}{h.city ? ` · ${h.city}` : ""}{h.from ? ` · ${h.from}${h.to ? ` → ${h.to}` : ""}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {trip.agentId && (
            <div className={styles.card} style={{ borderColor: 'var(--color-primary)', borderWidth: 1 }}>
              <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} /> {t("trips.detail.linkedAgent")}
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: 'var(--color-text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>{t("trips.detail.linkedAgentSub")}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link href={`/dashboard/customers/${trip.agentId}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'underline' }}>
                    {trip.agentCompanyName || trip.agentName || trip.agent || t("trips.detail.viewAgent")}
                </Link>
                {trip.agentName && trip.agentCompanyName && trip.agentName !== trip.agentCompanyName && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t("trips.detail.contact")} {trip.agentName}</span>
                )}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {trip.agentPhone && <span>📞 {trip.agentPhone}</span>}
                  {trip.agentEmail && <span>✉️ {trip.agentEmail}</span>}
                </div>
                <Link href={`/dashboard/customers/${trip.agentId}`} style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '9999px', padding: '4px 10px', width: 'fit-content', textDecoration: 'none' }}>
                  {t("trips.detail.openInCustomers")}
                </Link>
              </div>
            </div>
          )}

          {(canModify || isDelayed) && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{t("trips.detail.actions")}</h3>
              <div className={styles.actionRow}>
                {isScheduled && (
                  <button className={styles.actionBtn} onClick={() => performAction("start", {})} disabled={actionLoading === "start"}>
                    <Play size={13} /> {actionLoading === "start" ? t("trips.detail.starting") : t("trips.detail.startTrip")}
                  </button>
                )}
                {isEnRoute && (
                  <button className={`${styles.actionBtn} ${styles.actionDone}`} onClick={() => performAction("complete", {})} disabled={actionLoading === "complete"}>
                    <CheckCircle size={13} /> {actionLoading === "complete" ? t("trips.detail.completing") : t("trips.detail.completeTrip")}
                  </button>
                )}
                {!showDelay && (isScheduled || isEnRoute) && (
                  <button className={`${styles.actionBtn} ${styles.actionWarn}`} onClick={() => setShowDelay(true)} disabled={actionLoading !== ""}>
                    <AlertTriangle size={13} /> {t("trips.detail.delay")}
                  </button>
                )}
                {!showCancel && canModify && (
                  <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => setShowCancel(true)} disabled={actionLoading !== ""}>
                    <XCircle size={13} /> {t("common.cancel")}
                  </button>
                )}
              </div>

              {showDelay && (
                <div className={styles.inlineForm}>
                  <input type="number" min={5} value={delayMinutes} onChange={(e) => setDelayMinutes(Number(e.target.value))} placeholder={t("trips.detail.minutesPh")} />
                  <input type="text" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} placeholder={t("trips.detail.reasonPh")} />
                  <button className={styles.actionBtn} onClick={() => performAction("delay", { delayMinutes, delayReason })} disabled={actionLoading === "delay"}>
                    {actionLoading === "delay" ? t("trips.detail.saving") : t("trips.detail.confirmDelay")}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowDelay(false)}>{t("common.cancel")}</button>
                </div>
              )}

              {showCancel && (
                <div className={styles.inlineForm}>
                  <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("trips.detail.cancelReasonPh")} />
                  <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => performAction("cancel", { rejectionReason: cancelReason })} disabled={actionLoading === "cancel"}>
                    {actionLoading === "cancel" ? t("trips.detail.cancelling") : t("trips.detail.confirmCancel")}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowCancel(false)}>{t("common.cancel")}</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.column}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("trips.detail.statusTimeline")}</h3>
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
            <h3 className={styles.cardTitle}>{t("trips.detail.passengers")} ({passengers.length})</h3>
            {canModify && (
              <div className={styles.addPassenger}>
                <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder={t("trips.detail.namePh")} className={styles.pInput} />
                <input value={passengerContact} onChange={(e) => setPassengerContact(e.target.value)} placeholder={t("trips.detail.contactPh")} className={styles.pInput2} />
                <button className={styles.actionBtn} onClick={addPassenger} disabled={actionLoading === "addPassenger" || !passengerName.trim()}>
                  <UserPlus size={13} /> {t("common.add")}
                </button>
              </div>
            )}
            {passengers.length === 0 ? (
              <p className={styles.emptyText}>{t("trips.detail.noPassengers")}</p>
            ) : (
              <table className={styles.passengerTable}>
                <thead>
                  <tr><th>{t("trips.detail.colName")}</th><th>{t("trips.detail.colContact")}</th><th style={{ width: 36 }}></th></tr>
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
              <h2>{t("trips.detail.manifestTitle")}</h2>
              <button className={styles.manifestClose} onClick={() => setShowManifest(false)}><X size={15} /></button>
            </div>
            <div id="manifest-print" className={styles.manifestSheet}>
              <h2 className={styles.manifestBrand}>{trip.tripTitle || t("trips.detail.manifestBrand")}</h2>
              <p className={styles.manifestSub}>{t("trips.detail.tripTypeLabel")}: {trip.tripType === "round" ? t("trips.detail.roundTrip") : t("trips.detail.singleTrip")} · {t("trips.detail.busLabel")}: {trip.busPlate || "—"} · {t("roles.driver")}: {trip.driverName || "—"}</p>

              <h3 className={styles.manifestSection}>{t("trips.detail.tripInfo")}</h3>
              <table className={styles.manifestTable}>
                <tbody>
                  {[[t("trips.detail.mTripTitle"), trip.tripTitle], [t("trips.detail.mVehicleType"), trip.vehicleType], [t("trips.detail.mGroupLeader"), trip.groupLeader], [t("trips.detail.mGroupLeaderNo"), trip.groupLeaderNo], [t("trips.detail.mNationality"), trip.nationality], [t("trips.detail.mAgent"), trip.agent], [t("trips.detail.mGroupNo"), trip.groupNo], [t("trips.detail.mNoOfPax"), trip.noOfPax != null ? String(trip.noOfPax) : "—"], [t("trips.detail.mSellingPrice"), trip.sellingPrice != null ? formatCurrency(Number(trip.sellingPrice), lang) : null], [t("trips.detail.mRoute"), trip.routeName || "—"]]
                    .filter(([k, v]) => v)
                    .map(([k, v], i) => (
                      <tr key={i}><td>{k}</td><td>{v}</td></tr>
                    ))}
                </tbody>
              </table>

              {trip.legs?.length > 0 && (
                <>
                  <h3 className={styles.manifestSection}>{t("trips.detail.transportRoute")}</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>#</th><th>{t("common.from")}</th><th>{t("common.to")}</th><th>{t("trips.detail.mDate")}</th><th>{t("trips.detail.mTime")}</th></tr>
                    </thead>
                    <tbody>
                      {trip.legs.map((leg: any, idx: number) => (
                        <tr key={leg.id || idx}>
                          <td>{leg.legCode || `${trip.tripNumber || ""}-S${leg.legNo || idx + 1}`}</td>
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
                  <h3 className={styles.manifestSection}>{t("trips.detail.flightsTitle")}</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>{t("trips.detail.mFlightNo")}</th><th>{t("trips.detail.mAirline")}</th><th>{t("common.from")}</th><th>{t("common.to")}</th><th>{t("trips.detail.mDate")}</th><th>{t("trips.detail.mTime")}</th></tr>
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
                  <h3 className={styles.manifestSection}>{t("trips.detail.hotelsTitle")}</h3>
                  <table className={styles.manifestTable}>
                    <thead>
                      <tr><th>{t("trips.detail.mCity")}</th><th>{t("trips.detail.mHotel")}</th><th>{t("trips.detail.mCheckIn")}</th><th>{t("trips.detail.mCheckOut")}</th></tr>
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
                <Printer size={14} /> {t("common.print")}
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
