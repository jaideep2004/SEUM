"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { CalendarDays, UserCheck, AlertTriangle } from "lucide-react";
import DriverScheduleView from "@/components/DriverScheduleView";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
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
  const { lang, t } = useLanguage();
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
      setError(err.message || t("ops.sched.failedLoad"));
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
          <h1 className={styles.headerTitle}>{t("ops.sched.title")}</h1>
          <p className={styles.headerSub}>
            {activeDrivers.length} {t("ops.sched.activeDriver")}{activeDrivers.length !== 1 ? t("ops.sched.pluralS") : ""} {t("ops.sched.viewSuffix")}
          </p>
        </div>
      </div>

      {error && <div className={styles.error}><AlertTriangle size={13} /> {error}</div>}

      {loading ? (
        <div className={styles.empty}>{t("ops.sched.loading")}</div>
      ) : drivers.length === 0 ? (
        <div className={styles.empty}>
          <UserCheck size={28} />
          {t("ops.sched.empty")}
        </div>
      ) : (
        <div className={styles.scheduleBox}>
          <div className={styles.selector}>
            <label className={styles.selectorLabel}>{t("ops.sched.driverLabel")}</label>
            <select
              className={styles.selectorSelect}
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">{t("ops.sched.selectPh")}</option>
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
              {t("ops.sched.selectPrompt")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
