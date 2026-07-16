"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, User, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280", cancelled: "#ef4444", delayed: "#f59e0b",
};

const CONFIRM_COLORS: Record<string, string> = {
  accepted: "#10b981", rejected: "#ef4444", pending: "#f59e0b",
};

interface Driver { id: string; name: string; email: string; }
interface Trip { id: string; routeName: string; busPlate: string; status: string; driverConfirmationStatus: string; scheduledDate: string; scheduledStartTime: string; origin: string; destination: string; tripType: string; }

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [search, setSearch] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/users?role=driver`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setDrivers(json.data);
      } catch {} finally { setLoadingDrivers(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDriverId) { setTrips([]); return; }
    (async () => {
      setLoadingTrips(true);
      try {
        const token = localStorage.getItem("seum_access_token");
        const start = new Date(); start.setDate(start.getDate() + weekOffset * 7);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        const params = new URLSearchParams({
          driverId: selectedDriverId,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        });
        const res = await fetch(`${API}/operations/drivers/schedule?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setTrips(json.data);
      } catch {} finally { setLoadingTrips(false); }
    })();
  }, [selectedDriverId, weekOffset]);

  function getWeekLabel(): string {
    const start = new Date(); start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  const filteredDrivers = drivers.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Driver Schedule</h1>
          <p className={styles.pageDesc}>View and manage driver trip assignments</p>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input className={styles.searchInput} placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className={styles.driverList}>
            {loadingDrivers ? (
              <p className={styles.infoText}>Loading drivers...</p>
            ) : filteredDrivers.length === 0 ? (
              <p className={styles.infoText}>No drivers found</p>
            ) : (
              filteredDrivers.map(d => (
                <div key={d.id} className={`${styles.driverCard} ${d.id === selectedDriverId ? styles.driverCardActive : ""}`}
                  onClick={() => setSelectedDriverId(d.id)}>
                  <div className={styles.driverAvatar}>{d.name?.charAt(0).toUpperCase() || "?"}</div>
                  <div className={styles.driverInfo}>
                    <span className={styles.driverName}>{d.name}</span>
                    <span className={styles.driverEmail}>{d.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className={styles.main}>
          {!selectedDriverId ? (
            <div className={styles.emptyState}>
              <User size={24} />
              <p>Select a driver to view their schedule</p>
            </div>
          ) : (
            <>
              <div className={styles.scheduleHeader}>
                <div className={styles.scheduleDriverInfo}>
                  <div className={styles.driverAvatarLarge}>{selectedDriver?.name?.charAt(0).toUpperCase() || "?"}</div>
                  <div>
                    <h3 className={styles.scheduleDriverName}>{selectedDriver?.name}</h3>
                    <span className={styles.scheduleDriverEmail}>{selectedDriver?.email}</span>
                  </div>
                </div>
                <div className={styles.weekNav}>
                  <button className={styles.weekBtn} onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={14} /></button>
                  <span className={styles.weekLabel}><Calendar size={12} /> {getWeekLabel()}</span>
                  <button className={styles.weekBtn} onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={14} /></button>
                </div>
              </div>

              {loadingTrips ? (
                <p className={styles.infoText}>Loading schedule...</p>
              ) : trips.length === 0 ? (
                <div className={styles.emptyState}>
                  <Calendar size={24} />
                  <p>No trips scheduled for this week</p>
                </div>
              ) : (
                <div className={styles.tripList}>
                  {trips.map(t => (
                    <div key={t.id} className={styles.tripCard} onClick={() => router.push(`/dashboard/trips/${t.id}`)}>
                      <div className={styles.tripTime}>
                        <span className={styles.tripTimeValue}>{t.scheduledStartTime?.slice(0, 5) || "—"}</span>
                        <span className={styles.tripDate}>{new Date(t.scheduledDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</span>
                      </div>
                      <div className={styles.tripRoute}>
                        <span className={styles.tripRouteName}>{t.routeName || `${t.origin || "?"} → ${t.destination || "?"}`}</span>
                        <span className={styles.tripBus}><MapPin size={10} /> {t.busPlate || "—"}</span>
                      </div>
                      <div className={styles.tripMeta}>
                        <span className={styles.tripStatus} style={{ color: STATUS_COLORS[t.status] || "#6b7280" }}>{t.status}</span>
                        {t.driverConfirmationStatus && t.driverConfirmationStatus !== "pending" && (
                          <span className={styles.confirmBadge} style={{ background: (CONFIRM_COLORS[t.driverConfirmationStatus] || "#6b7280") + "18", color: CONFIRM_COLORS[t.driverConfirmationStatus] || "#6b7280" }}>
                            {t.driverConfirmationStatus}
                          </span>
                        )}
                        <span className={styles.tripType}>{t.tripType}</span>
                      </div>
                      <Clock size={12} className={styles.tripArrow} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
