"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  X,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  Calendar,
  Gauge,
} from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  ready: { label: "fleet.readiness.st.ready", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 },
  in_maintenance: { label: "fleet.readiness.st.inMaintenance", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", icon: Wrench },
  out_of_service: { label: "fleet.readiness.st.outOfService", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", icon: AlertTriangle },
  reserved: { label: "fleet.readiness.st.reserved", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", icon: Clock },
};

const STATUS_OPTIONS = [
  { value: "ready", label: "fleet.readiness.st.ready" },
  { value: "in_maintenance", label: "fleet.readiness.st.inMaintenance" },
  { value: "out_of_service", label: "fleet.readiness.st.outOfService" },
  { value: "reserved", label: "fleet.readiness.st.reserved" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getReadinessData(
  readinessList: any[],
  statusFilter: string | null
) {
  let list = readinessList;
  if (statusFilter) {
    list = list.filter((r) => r.status === statusFilter);
  }
  return list;
}

export default function ReadinessDashboard() {
  const { lang, t } = useLanguage();
  const [readiness, setReadiness] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalBus, setModalBus] = useState<any>(null);

  const fetchReadiness = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API}/fleet/readiness?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setReadiness(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness]);

  const filtered = getReadinessData(readiness, null).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.plateNumber || "").toLowerCase().includes(q) ||
      (r.busMake || "").toLowerCase().includes(q) ||
      (r.busModel || "").toLowerCase().includes(q)
    );
  });

  const statusCounts = {
    ready: readiness.filter((r) => r.status === "ready").length,
    in_maintenance: readiness.filter((r) => r.status === "in_maintenance").length,
    out_of_service: readiness.filter((r) => r.status === "out_of_service").length,
    reserved: readiness.filter((r) => r.status === "reserved").length,
    unchecked: readiness.filter((r) => r.status === null).length,
  };

  const handleStatusUpdate = async (busId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/fleet/readiness`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ busId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setModalBus(null);
        fetchReadiness();
      }
    } catch {}
  };

  const FilterBtn = ({ value, count }: { value: string | null; count: number }) => {
    const label = value ? t(STATUS_CONFIG[value]?.label || value) : t("fleet.readiness.all");
    const isActive = statusFilter === value;
    const color = value ? STATUS_CONFIG[value]?.color : "var(--color-text-secondary)";
    return (
      <button
        className={`${styles.filterBtn} ${isActive ? styles.filterActive : ""}`}
        style={isActive && value ? { borderColor: color, color } : {}}
        onClick={() => setStatusFilter(isActive ? null : value)}
      >
        {value && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STATUS_CONFIG[value]?.color,
              display: "inline-block",
            }}
          />
        )}
        {label}
        <span className={styles.filterCount}>{count}</span>
      </button>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("fleet.readiness.title")}</h1>
          <p className={styles.pageDesc}>
            {t("fleet.readiness.desc")}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchReadiness}>
          <RefreshCw size={14} />
          {t("fleet.readiness.refresh")}
        </button>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{readiness.length}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.totalBuses")}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: "#10b981" }}>{statusCounts.ready}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.st.ready")}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: "#f59e0b" }}>{statusCounts.in_maintenance}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.st.inMaintenance")}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: "#ef4444" }}>{statusCounts.out_of_service}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.st.outOfService")}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: "#8b5cf6" }}>{statusCounts.reserved}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.st.reserved")}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: "#94a3b8" }}>{statusCounts.unchecked}</span>
          <span className={styles.statLabel}>{t("fleet.readiness.unchecked")}</span>
        </div>
      </div>

      {/* Quick Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterTabs}>
          <FilterBtn value={null} count={readiness.length} />
          <FilterBtn value="ready" count={statusCounts.ready} />
          <FilterBtn value="in_maintenance" count={statusCounts.in_maintenance} />
          <FilterBtn value="out_of_service" count={statusCounts.out_of_service} />
          <FilterBtn value="reserved" count={statusCounts.reserved} />
        </div>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t("fleet.readiness.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          {t("fleet.readiness.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Gauge size={48} style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
          <p>{t("fleet.readiness.noMatch")}</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map((item) => {
            const statusKey = item.status || "unchecked";
            const cfg = STATUS_CONFIG[statusKey];
            const Icon = cfg?.icon || Clock;
            return (
              <div key={item.busId} className={styles.busCard}>
                <div className={styles.busCardTop}>
                  <span className={styles.plateNumber}>{item.plateNumber || "—"}</span>
                  <span
                    className={styles.statusBadge}
                    style={{
                      background: cfg?.bg || "transparent",
                      color: cfg?.color || "var(--color-text-tertiary)",
                      border: `1px solid ${cfg?.border || "transparent"}`,
                    }}
                  >
                    <Icon size={12} />
                    {cfg?.label ? t(cfg.label) : t("fleet.readiness.unchecked")}
                  </span>
                </div>
                <div className={styles.busMeta}>
                  {item.busMake} {item.busModel} ({item.busYear || "—"})
                </div>
                <div className={styles.busCardBody}>
                  <div className={styles.busInfoRow}>
                    <UserCheck size={13} />
                    <span>{item.checkedBy ? t("fleet.readiness.checked") : t("fleet.readiness.notChecked")}</span>
                  </div>
                  {item.checkedAt && (
                    <div className={styles.busInfoRow}>
                      <Calendar size={13} />
                      <span>{formatDate(item.checkedAt, lang)}</span>
                    </div>
                  )}
                  {item.notes && (
                    <div className={styles.busNotes}>{item.notes}</div>
                  )}
                </div>
                <button
                  className={styles.updateBtn}
                  onClick={() => setModalBus(item)}
                >
                  {t("fleet.readiness.updateStatus")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Modal */}
      {modalBus && (
        <div className={styles.modalOverlay} onClick={() => setModalBus(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t("fleet.readiness.updateTitle")}</h3>
              <button className={styles.modalClose} onClick={() => setModalBus(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalBusInfo}>
                {modalBus.plateNumber} — {modalBus.busMake} {modalBus.busModel}
              </p>
              <p className={styles.modalCurrentStatus}>
                {t("fleet.readiness.current")}{" "}
                <span
                  style={{
                    color: STATUS_CONFIG[modalBus.status]?.color || "var(--color-text-tertiary)",
                    fontWeight: 600,
                  }}
                >
                  {STATUS_CONFIG[modalBus.status]?.label ? t(STATUS_CONFIG[modalBus.status].label) : t("fleet.readiness.unchecked")}
                </span>
              </p>
              <label className={styles.modalLabel}>{t("fleet.readiness.newStatus")}</label>
              <div className={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = modalBus._selectedStatus === opt.value;
                  const cfg = STATUS_CONFIG[opt.value];
                  const OptIcon = cfg.icon;
                  return (
                    <button
                      key={opt.value}
                      className={`${styles.statusOption} ${isSelected ? styles.statusOptionSelected : ""}`}
                      style={
                        isSelected
                          ? {
                              borderColor: cfg.color,
                              background: cfg.bg,
                              color: cfg.color,
                            }
                          : {}
                      }
                      onClick={() => {
                        setModalBus({ ...modalBus, _selectedStatus: opt.value });
                      }}
                    >
                      <OptIcon size={16} />
                      {t(opt.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setModalBus(null)}>
                {t("common.cancel")}
              </button>
              <button
                className={styles.saveBtn}
                disabled={!modalBus._selectedStatus}
                onClick={() =>
                  handleStatusUpdate(modalBus.busId, modalBus._selectedStatus)
                }
              >
                {t("fleet.readiness.updateStatus")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
