"use client";

import { useState, useEffect } from "react";
import { X, UserCheck, Search } from "lucide-react";
import styles from "./DriverAssignModal.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface Driver {
  id: string; name: string; email: string;
}

interface Props {
  tripId: string;
  currentDriverId?: string | null;
  currentDriverName?: string | null;
  currentConfirmationStatus?: string;
  onClose: () => void;
  onAssigned: () => void;
}

export default function DriverAssignModal({ tripId, currentDriverId, currentDriverName, currentConfirmationStatus, onClose, onAssigned }: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const date = new Date().toISOString().slice(0, 10);
        const res = await fetch(`${API}/operations/drivers/available?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setDrivers(json.data);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  async function handleAssign(driverId: string) {
    setAssigning(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${tripId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driverId }),
      });
      const json = await res.json();
      if (json.success) onAssigned();
      else alert(json.message || "Failed to assign driver");
    } catch { alert("Network error"); } finally { setAssigning(false); }
  }

  async function handleRemove() {
    setAssigning(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${tripId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driverId: "" }),
      });
      const json = await res.json();
      if (json.success) onAssigned();
      else alert(json.message || "Failed to remove driver");
    } catch { alert("Network error"); } finally { setAssigning(false); }
  }

  const filtered = drivers.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase())
  );

  const confirmColors: Record<string, string> = {
    accepted: "#10b981", rejected: "#ef4444", pending: "#f59e0b",
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3><UserCheck size={16} /> Assign Driver</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.body}>
          {currentDriverName && (
            <div className={styles.currentDriver}>
              <span>Current: <strong>{currentDriverName}</strong></span>
              {currentConfirmationStatus && (
                <span className={styles.confirmBadge} style={{ background: (confirmColors[currentConfirmationStatus] || "#6b7280") + "20", color: confirmColors[currentConfirmationStatus] || "#6b7280" }}>
                  {currentConfirmationStatus}
                </span>
              )}
              <button className={styles.removeBtn} onClick={handleRemove} disabled={assigning}>Remove</button>
            </div>
          )}

          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input className={styles.searchInput} placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <p className={styles.loading}>Loading available drivers...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>No available drivers{search ? " matching search" : ""}</p>
          ) : (
            <div className={styles.driverList}>
              {filtered.map((d) => (
                <div key={d.id} className={`${styles.driverItem} ${d.id === currentDriverId ? styles.currentItem : ""}`}>
                  <div className={styles.driverInfo}>
                    <span className={styles.driverName}>{d.name}</span>
                    <span className={styles.driverEmail}>{d.email}</span>
                  </div>
                  <button className={styles.assignBtn} onClick={() => handleAssign(d.id)} disabled={assigning || d.id === currentDriverId}>
                    {d.id === currentDriverId ? "Assigned" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
