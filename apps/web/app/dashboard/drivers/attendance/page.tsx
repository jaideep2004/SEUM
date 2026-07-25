"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, LogOut, Edit3, RefreshCw } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  present: "#059669",
  absent: "#dc2626",
  late: "#d97706",
  half_day: "#f59e0b",
  on_leave: "#6366f1",
  on_trip: "#0891b2",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function DriverAttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [autoResult, setAutoResult] = useState<string | null>(null);
  const [correctionModal, setCorrectionModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    try {
      const [attRes, dashRes, monthlyRes] = await Promise.all([
        fetch(`${API}/drivers/attendance/list?date=${date}&pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/drivers/attendance/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/drivers/attendance/summary?year=${date.slice(0,4)}&month=${date.slice(5,7)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const attData = await attRes.json();
      const dashData = await dashRes.json();
      const monthlyData = await monthlyRes.json();

      if (attData.success) setRecords(attData.data || []);
      if (dashData.success) setSummary(dashData.data);
      if (monthlyData.success) setMonthlySummary(monthlyData.data);
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [date]);

  async function handleCheckIn(driverId: string) {
    setActionLoading(driverId);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/attendance/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      fetchData();
    } catch {}
    setActionLoading(null);
  }

  async function handleCheckOut(driverId: string) {
    setActionLoading(driverId);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/attendance/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      fetchData();
    } catch {}
    setActionLoading(null);
  }

  async function handleAutoDetect() {
    setAutoResult("Running auto-detection...");
    const token = getToken();
    try {
      const res = await fetch(`${API}/drivers/attendance/auto-detect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAutoResult(`Auto-detected ${data.data.autoCheckedIn} driver(s) on trip`);
      }
    } catch {}
    setTimeout(() => { setAutoResult(null); fetchData(); }, 3000);
  }

  async function handleManualCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionModal) return;
    setActionLoading("manual");
    const token = getToken();
    try {
      await fetch(`${API}/drivers/attendance/manual`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(correctionModal),
      });
      setCorrectionModal(null);
      fetchData();
    } catch {}
    setActionLoading(null);
  }

  const statusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || "#6b7280";
    return (
      <span className={styles.statusBadge} style={{ background: color + "20", color }}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}>
            <ArrowLeft size={14} /> Back
          </Link>
          <h1>Driver Attendance</h1>
        </div>
        <div className={styles.controls}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.dateInput}
          />
          <button className={`${styles.actionBtn} ${styles.actionBtnOutline}`} onClick={handleAutoDetect}>
            <RefreshCw size={14} /> Auto-Detect
          </button>
        </div>
      </div>

      {autoResult && <div className={styles.autoResult}>{autoResult}</div>}

      {summary && (
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{summary.totalDrivers}</div>
            <div className={styles.summaryLabel}>Total Drivers</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#059669" }}>{summary.checkedIn}</div>
            <div className={styles.summaryLabel}>Checked In</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#d97706" }}>{summary.late}</div>
            <div className={styles.summaryLabel}>Late</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#dc2626" }}>{summary.absentOrLate}</div>
            <div className={styles.summaryLabel}>Absent/Late</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#6366f1" }}>{summary.onLeave}</div>
            <div className={styles.summaryLabel}>On Leave</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#6b7280" }}>{summary.notRecorded}</div>
            <div className={styles.summaryLabel}>Not Recorded</div>
          </div>
        </div>
      )}

      {monthlySummary && date.slice(8) === "01" && (
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{monthlySummary.totalRecords}</div>
            <div className={styles.summaryLabel}>Month Records</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#059669" }}>{monthlySummary.present + monthlySummary.onTrip}</div>
            <div className={styles.summaryLabel}>Month Present</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#dc2626" }}>{monthlySummary.absent}</div>
            <div className={styles.summaryLabel}>Month Absent</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue} style={{ color: "#d97706" }}>{monthlySummary.late}</div>
            <div className={styles.summaryLabel}>Month Late</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading attendance records...</div>
      ) : records.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No attendance records for this date</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Late (min)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.driverCell}>
                      {r.driver?.photoUrl ? (
                        <img src={r.driver.photoUrl} alt="" className={styles.driverPhoto} />
                      ) : (
                        <div className={styles.driverPhotoPlaceholder}>
                          {(r.driver?.name || "?").charAt(0)}
                        </div>
                      )}
                      <div className={styles.driverInfo}>
                        <span className={styles.driverName}>{r.driver?.name || "Unknown"}</span>
                        <span className={styles.driverCode}>{r.driver?.employeeCode || r.driverId?.slice(0,8)}</span>
                      </div>
                    </div>
                  </td>
                  <td>{statusBadge(r.status)}</td>
                  <td className={styles.timeCell}>
                    {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className={styles.timeCell}>
                    {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td>{r.lateMinutes || 0}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {date === today && !r.checkInTime && (
                        <button
                          className={`${styles.checkBtn} ${styles.checkInBtn}`}
                          onClick={() => handleCheckIn(r.driverId)}
                          disabled={actionLoading === r.driverId}
                        >
                          <Clock size={12} /> In
                        </button>
                      )}
                      {date === today && r.checkInTime && !r.checkOutTime && (
                        <button
                          className={`${styles.checkBtn} ${styles.checkOutBtn}`}
                          onClick={() => handleCheckOut(r.driverId)}
                          disabled={actionLoading === r.driverId}
                        >
                          <LogOut size={12} /> Out
                        </button>
                      )}
                      <button
                        className={`${styles.checkBtn} ${styles.correctBtn}`}
                        onClick={() => setCorrectionModal({
                          driverId: r.driverId,
                          date,
                          status: r.status,
                          checkInTime: r.checkInTime || "",
                          checkOutTime: r.checkOutTime || "",
                          lateMinutes: r.lateMinutes || 0,
                          notes: r.notes || "",
                        })}
                      >
                        <Edit3 size={12} /> Fix
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {correctionModal && (
        <div className={styles.overlay} onClick={() => setCorrectionModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Manual Correction</h2>
            <form onSubmit={handleManualCorrection}>
              <div className={styles.field}>
                <label>Status</label>
                <select
                  value={correctionModal.status}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, status: e.target.value })}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Check-In Time</label>
                <input
                  type="datetime-local"
                  value={correctionModal.checkInTime ? correctionModal.checkInTime.slice(0, 16) : ""}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, checkInTime: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                />
              </div>
              <div className={styles.field}>
                <label>Check-Out Time</label>
                <input
                  type="datetime-local"
                  value={correctionModal.checkOutTime ? correctionModal.checkOutTime.slice(0, 16) : ""}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, checkOutTime: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                />
              </div>
              <div className={styles.field}>
                <label>Late Minutes</label>
                <input
                  type="number"
                  min="0"
                  value={correctionModal.lateMinutes}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, lateMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className={styles.field}>
                <label>Notes</label>
                <textarea
                  value={correctionModal.notes}
                  onChange={(e) => setCorrectionModal({ ...correctionModal, notes: e.target.value })}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setCorrectionModal(null)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={actionLoading === "manual"}>
                  {actionLoading === "manual" ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
