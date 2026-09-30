"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Check, User, Building2, CalendarDays, Clock, Route as RouteIcon } from "lucide-react";
import SeatMap from "@/components/SeatMap";
import { bookingService, customerService, tripService, waitlistService, type Customer, type TripSummary } from "@/services/bookings";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const BOOKABLE_STATUSES = ["scheduled", "en_route", "delayed"];

interface PassengerForm {
  name: string;
  idNumber: string;
  seat: number | null;
  age: string;
  special: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const { lang, t: tr } = useLanguage();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSelected, setCustomerSelected] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tripId, setTripId] = useState("");
  const [availability, setAvailability] = useState<{ capacity: number; occupied: number[] } | null>(null);
  const [availLoading, setAvailLoading] = useState(false);

  const [waitlistPax, setWaitlistPax] = useState("1");
  const [waitlistMsg, setWaitlistMsg] = useState("");
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tripService.bookable({ pageSize: "100" })
      .then((r) => {
        const bookable = r.data.filter((t) => BOOKABLE_STATUSES.includes(t.status));
        bookable.sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));
        setTrips(bookable);
      })
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, []);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerResults([]); return; }
    setSearching(true);
    try {
      const results = await customerService.search(q.trim());
      setCustomerResults(results.slice(0, 8));
    } catch {
      setCustomerResults([]);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchCustomers(customerQuery), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [customerQuery, searchCustomers]);

  function selectCustomer(c: Customer) {
    setCustomerSelected(c);
    setCustomerQuery("");
    setCustomerResults([]);
  }

  async function handleTripChange(value: string) {
    setTripId(value);
    setSelectedSeats([]);
    setPassengers([]);
    setAvailability(null);
    setWaitlistMsg("");
    setWaitlistError("");
    setWaitlistPax("1");
    if (!value) return;
    setAvailLoading(true);
    try {
      const a = await bookingService.availability(value);
      setAvailability({ capacity: a.capacity, occupied: a.occupied });
    } catch (err) {
      setSubmitError((err as Error).message);
    }
    setAvailLoading(false);
  }

  useEffect(() => {
    setPassengers((prev) => {
      const bySeat = new Map(prev.map((p) => [p.seat, p]));
      return selectedSeats.map((seat) => bySeat.get(seat) || { name: "", idNumber: "", seat, age: "", special: "" });
    });
  }, [selectedSeats]);

  function toggleSeat(seat: number) {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  }

  function updatePassenger(index: number, patch: Partial<PassengerForm>) {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!customerSelected) { setSubmitError(tr("bookings.new.errCustomer")); return; }
    if (!tripId) { setSubmitError(tr("bookings.new.errTrip")); return; }
    if (selectedSeats.length === 0) { setSubmitError(tr("bookings.new.errSeats")); return; }
    if (passengers.some((p) => !p.name.trim())) { setSubmitError(tr("bookings.new.errNames")); return; }
    const total = Number(totalAmount);
    if (!totalAmount || total <= 0) { setSubmitError(tr("bookings.new.errTotal")); return; }
    if (paidAmount && Number(paidAmount) > total) { setSubmitError(tr("bookings.new.errPaid")); return; }

    setSubmitting(true);
    try {
      const created = await bookingService.create({
        customer_id: customerSelected.id,
        trip_id: tripId,
        seat_numbers: selectedSeats.sort((a, b) => a - b),
        passengers: passengers.map((p) => ({
          passenger_name: p.name.trim(),
          id_number: p.idNumber.trim() || undefined,
          seat_number: p.seat ?? undefined,
          age: p.age ? Number(p.age) : undefined,
          special_requirements: p.special.trim() || undefined,
        })),
        total_amount: total,
        paid_amount: paidAmount ? Number(paidAmount) : undefined,
        notes: notes.trim() || undefined,
      });
      router.push(`/dashboard/bookings/${created.id}`);
    } catch (err) {
      setSubmitError((err as Error).message || tr("bookings.new.errCreate"));
      setSubmitting(false);
    }
  }

  const selectedTrip = trips.find((t) => t.id === tripId);

  async function handleJoinWaitlist() {
    setWaitlistError("");
    setWaitlistMsg("");
    if (!customerSelected) { setWaitlistError(tr("bookings.new.errCustomer")); return; }
    if (!tripId) { setWaitlistError(tr("bookings.new.errTrip")); return; }
    const pax = Number(waitlistPax);
    if (!waitlistPax || pax <= 0) { setWaitlistError(tr("bookings.new.errPax")); return; }
    setWaitlistSubmitting(true);
    try {
      const entry = await waitlistService.join({
        trip_id: tripId,
        customer_id: customerSelected.id,
        number_of_passengers: pax,
      });
      setWaitlistMsg(
        `${customerSelected.name} ${tr("bookings.new.wlJoinedA")}${formatNumber(entry.numberOfPassengers, lang)} ${entry.numberOfPassengers > 1 ? tr("bookings.new.seatPlural") : tr("bookings.new.seatSingular")})${tr("bookings.new.wlJoinedB")}`
      );
    } catch (err) {
      setWaitlistError((err as Error).message || tr("bookings.new.errJoin"));
    }
    setWaitlistSubmitting(false);
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> {tr("bookings.new.back")}</Link>
      <div className={styles.header}>
        <div>
          <h1>{tr("bookings.new.title")}</h1>
          <p className={styles.subtitle}>{tr("bookings.new.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {submitError && <div className={styles.error}>{submitError}</div>}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{tr("bookings.new.stepCustomer")}</h2>
          {customerSelected ? (
            <div className={styles.selectedCustomer}>
              <span className={styles.customerIcon}>{customerSelected.isCompany ? <Building2 size={16} /> : <User size={16} />}</span>
              <div className={styles.customerInfo}>
                <span className={styles.customerName}>{customerSelected.name}</span>
                <span className={styles.customerMeta}>
                  {customerSelected.phone || "—"}
                  {customerSelected.isCompany && customerSelected.companyName ? ` · ${customerSelected.companyName}` : ""}
                </span>
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => setCustomerSelected(null)} title={tr("bookings.new.changeCustomer")}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className={styles.customerSearch}>
              <div className={styles.searchBox}>
                <Search size={14} />
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder={tr("bookings.new.searchCustomersPh")}
                  autoFocus
                />
                {searching && <span className={styles.searchHint}>{tr("bookings.new.searching")}</span>}
              </div>
              {customerResults.length > 0 && (
                <ul className={styles.resultsList}>
                  {customerResults.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => selectCustomer(c)}>
                        <span className={styles.resultIcon}>{c.isCompany ? <Building2 size={14} /> : <User size={14} />}</span>
                        <span className={styles.resultText}>
                          <span className={styles.resultName}>{c.name}</span>
                          <span className={styles.resultMeta}>
                            {c.phone || "—"}
                            {c.isCompany && c.companyName ? ` · ${c.companyName}` : ""}
                          </span>
                        </span>
                        <Check size={14} className={styles.resultCheck} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {customerQuery.trim() && !searching && customerResults.length === 0 && (
                <p className={styles.noResults}>{tr("bookings.new.noCustomers")}</p>
              )}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{tr("bookings.new.stepTrip")}</h2>
          {tripsLoading ? (
            <div className={styles.loading}>{tr("bookings.new.loadingTrips")}</div>
          ) : trips.length === 0 ? (
            <p className={styles.noResults}>{tr("bookings.new.noTrips")}</p>
          ) : (
            <>
              <label className={styles.fieldLabel}>{tr("bookings.new.tripLabel")}</label>
              <select className={styles.select} value={tripId} onChange={(e) => handleTripChange(e.target.value)}>
                <option value="">{tr("bookings.new.selectTrip")}</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.origin || "—"} → {t.destination || "—"} · {formatDate(t.scheduledDate, lang)} {t.scheduledStartTime || ""}{t.busPlate ? ` · ${t.busPlate}` : ""}
                  </option>
                ))}
              </select>
              {selectedTrip && (
                <div className={styles.tripSummary}>
                  <span className={styles.tripPill}><CalendarDays size={12} /> {formatDate(selectedTrip.scheduledDate, lang)}</span>
                  <span className={styles.tripPill}><Clock size={12} /> {selectedTrip.scheduledStartTime || "—"}</span>
                  <span className={styles.tripPill}><RouteIcon size={12} /> {selectedTrip.routeName || `${selectedTrip.origin} → ${selectedTrip.destination}`}</span>
                  {selectedTrip.busPlate && <span className={styles.tripPill}>{selectedTrip.busPlate}</span>}
                  <span className={`${styles.tripPill} ${styles.tripStatus}`}>{selectedTrip.status}</span>
                </div>
              )}
              {availLoading && <div className={styles.loading}>{tr("bookings.new.checkingSeats")}</div>}
              {availability && (
                <div className={styles.seatSection}>
                  <SeatMap
                    capacity={availability.capacity}
                    occupied={availability.occupied}
                    selected={selectedSeats}
                    maxSelectable={availability.capacity}
                    onToggle={toggleSeat}
                  />
                </div>
              )}
              {availability && availability.occupied.length >= availability.capacity && !availLoading && (
                <div className={styles.waitlistPanel}>
                  <p className={styles.waitlistHint}>
                    {tr("bookings.new.soldOut")} {customerSelected ? `${customerSelected.name} ${tr("bookings.new.canJoin")}` : tr("bookings.new.selectCustomerFirst")}
                  </p>
                  {waitlistMsg && <p className={styles.waitlistSuccess}>{waitlistMsg}</p>}
                  {waitlistError && <p className={styles.error}>{waitlistError}</p>}
                  <div className={styles.waitlistRow}>
                    <label className={styles.fieldLabel}>{tr("bookings.new.passengersLabel")}</label>
                    <input
                      className={`${styles.select} ${styles.waitlistPax}`}
                      type="number"
                      min={1}
                      max={availability.capacity}
                      value={waitlistPax}
                      onChange={(e) => setWaitlistPax(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={handleJoinWaitlist}
                      disabled={waitlistSubmitting || !customerSelected}
                    >
                      {waitlistSubmitting ? tr("bookings.new.joining") : tr("bookings.new.joinWaitlist")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{tr("bookings.new.stepPassengers")}</h2>
          {selectedSeats.length === 0 ? (
            <p className={styles.noResults}>{tr("bookings.new.selectSeatsHint")}</p>
          ) : (
            <div className={styles.passengerTable}>
              <div className={styles.passengerHead}>
                <span>{tr("bookings.new.colSeat")}</span><span>{tr("bookings.new.colName")}</span><span>{tr("bookings.new.colId")}</span><span>{tr("bookings.new.colAge")}</span><span>{tr("bookings.new.colSpecial")}</span>
              </div>
              {passengers.map((p, i) => (
                <div key={p.seat} className={styles.passengerRow}>
                  <span className={styles.seatNum}>#{p.seat}</span>
                  <input
                    className={styles.passengerInput}
                    value={p.name}
                    onChange={(e) => updatePassenger(i, { name: e.target.value })}
                    placeholder={tr("bookings.new.phPassengerName")}
                  />
                  <input
                    className={styles.passengerInput}
                    value={p.idNumber}
                    onChange={(e) => updatePassenger(i, { idNumber: e.target.value })}
                    placeholder={tr("bookings.new.phIdNumber")}
                  />
                  <input
                    className={`${styles.passengerInput} ${styles.smallInput}`}
                    type="number"
                    min={1}
                    max={120}
                    value={p.age}
                    onChange={(e) => updatePassenger(i, { age: e.target.value })}
                    placeholder={tr("bookings.new.phAge")}
                  />
                  <input
                    className={styles.passengerInput}
                    value={p.special}
                    onChange={(e) => updatePassenger(i, { special: e.target.value })}
                    placeholder={tr("bookings.new.phSpecial")}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{tr("bookings.new.stepPayment")}</h2>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{tr("bookings.new.totalAmount")}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder={tr("bookings.new.amountPh")}
              />
            </div>
            <div className={styles.field}>
              <label>{tr("bookings.new.paidAmount")}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={tr("bookings.new.amountPh")}
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>{tr("bookings.new.notesLabel")}</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr("bookings.new.notesPh")} />
            </div>
          </div>
        </section>

        <div className={styles.formActions}>
          <Link href="/dashboard/bookings" className={styles.cancelBtn}>{tr("bookings.new.cancel")}</Link>
          <button type="submit" className={styles.primaryBtn} disabled={submitting}>
            {submitting ? tr("bookings.new.creating") : tr("bookings.new.createBooking")}
          </button>
        </div>
      </form>
    </div>
  );
}
