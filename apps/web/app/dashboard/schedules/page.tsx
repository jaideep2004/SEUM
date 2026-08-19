"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { CalendarDays, UserCheck, AlertTriangle } from "lucide-react";
import DriverScheduleView from "@/components/DriverScheduleView";
import styles from "./page.module.css";

interface DriverOption {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  employeeCode: string | null;
  status: string;
}

export default function SchedulesPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<any[]>("/drivers?pageSize=100");
      setDrivers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const selected = drivers.find((d) => d.id === selectedDriverId);
  const activeDrivers = drivers.filter((d) => d.status === "active");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <CalendarDays size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Driver Schedules</h1>
          <p className={styles.headerSub}>
            {activeDrivers.length} active driver{activeDrivers.length !== 1 ? "s" : ""} · day / week view
          </p>
        </div>
      </div>

      {error && <div className={styles.error}><AlertTriangle size={13} /> {error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading drivers...</div>
      ) : drivers.length === 0 ? (
        <div className={styles.empty}>
          <UserCheck size={28} />
          No drivers found — add drivers first to view schedules.
        </div>
      ) : (
        <div className={styles.scheduleBox}>
          <div className={styles.selector}>
            <label className={styles.selectorLabel}>Driver</label>
            <select
              className={styles.selectorSelect}
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">Select a driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.employeeCode ? ` (${d.employeeCode})` : ""}{d.status !== "active" ? ` — ${d.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selected?.userId ? (
            <DriverScheduleView key={selected.userId} userId={selected.userId} />
          ) : (
            <div className={styles.empty}>
              <CalendarDays size={28} />
              Select a driver to view their schedule
            </div>
          )}
        </div>
      )}
    </div>
  );
}
