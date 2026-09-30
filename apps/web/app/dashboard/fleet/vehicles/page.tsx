"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage } from "@/lib/i18n";
import {
  Truck,
  Search,
  Fuel,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import styles from "./page.module.css";

interface Bus {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  capacitySeated: number;
  capacityStanding: number;
  fuelType: string;
  status: string;
  assignedDepot: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, { bg: string; dot: string }> = {
  active: { bg: "rgba(16,185,129,0.12)", dot: "#10b981" },
  maintenance: { bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  retired: { bg: "rgba(239,68,68,0.12)", dot: "#ef4444" },
  sold: { bg: "rgba(100,116,139,0.12)", dot: "#64748b" },
};

const statusLabels: Record<string, string> = {
  active: "fleet.vehicles.status.active",
  maintenance: "fleet.vehicles.status.maintenance",
  retired: "fleet.vehicles.status.retired",
  sold: "fleet.vehicles.status.sold",
};

const fuelTypes = ["diesel", "petrol", "electric", "hybrid", "cng", "lpg"];
const statuses = ["active", "maintenance", "retired", "sold"];

export default function VehiclesPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    capacitySeated: 30,
    capacityStanding: 10,
    fuelType: "diesel",
    color: "",
    vin: "",
    engineNumber: "",
    chassisNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    assignedDepot: "",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchBuses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/buses?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("seum_access_token")}`,
          },
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBuses(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || t("fleet.vehicles.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await api.post("/fleet/buses", {
        ...formData,
        year: Number(formData.year),
        capacitySeated: Number(formData.capacitySeated),
        capacityStanding: Number(formData.capacityStanding),
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        purchaseDate: formData.purchaseDate || undefined,
      });
      setShowCreate(false);
      setFormData({
        plateNumber: "",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        capacitySeated: 30,
        capacityStanding: 10,
        fuelType: "diesel",
        color: "",
        vin: "",
        engineNumber: "",
        chassisNumber: "",
        purchaseDate: "",
        purchasePrice: "",
        assignedDepot: "",
        status: "active",
      });
      fetchBuses();
    } catch (err: any) {
      setSubmitError(err.message || t("fleet.vehicles.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Truck size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("fleet.vehicles.title")}</h1>
          <p className={styles.headerSub}>
            {meta ? `${meta.total} ${meta.total !== 1 ? t("fleet.vehicles.countVehicles") : t("fleet.vehicles.countVehicle")}` : t("fleet.vehicles.loadingHeader")}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          {t("fleet.vehicles.addVehicle")}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("fleet.vehicles.searchPh")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("fleet.vehicles.allStatuses")}</option>
          <option value="active">{t("fleet.vehicles.status.active")}</option>
          <option value="maintenance">{t("fleet.vehicles.status.maintenance")}</option>
          <option value="retired">{t("fleet.vehicles.status.retired")}</option>
          <option value="sold">{t("fleet.vehicles.status.sold")}</option>
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>{t("fleet.vehicles.loading")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("fleet.vehicles.colVehicle")}</th>
                <th>{t("fleet.vehicles.colYear")}</th>
                <th>{t("fleet.vehicles.colCapacity")}</th>
                <th>{t("fleet.vehicles.colFuel")}</th>
                <th>{t("fleet.vehicles.colDepot")}</th>
                <th>{t("fleet.vehicles.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => {
                const sc = statusColors[bus.status] || statusColors.active;
                return (
                  <tr
                    key={bus.id}
                    className={styles.clickableRow}
                    onClick={() => router.push(`/dashboard/fleet/vehicles/${bus.id}`)}
                  >
                    <td>
                      <div className={styles.plateCell}>
                        <div className={styles.avatar}>
                          <Truck size={16} />
                        </div>
                        <div>
                          <div className={styles.plateNumber}>{bus.plateNumber}</div>
                          <div className={styles.plateSub}>{bus.make} {bus.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.cellPrimary}>{bus.year}</td>
                    <td>
                      <div className={styles.capacity}>
                        <UsersIcon size={14} />
                        {bus.capacitySeated} {bus.capacitySeated !== 1 ? t("fleet.vehicles.seatPl") : t("fleet.vehicles.seatSg")}
                        {bus.capacityStanding > 0 && ` + ${bus.capacityStanding} ${t("fleet.vehicles.stand")}`}
                      </div>
                    </td>
                    <td>
                      <span className={styles.fuelBadge}>
                        <Fuel size={12} />
                        {bus.fuelType.charAt(0).toUpperCase() + bus.fuelType.slice(1)}
                      </span>
                    </td>
                    <td className={styles.cellSecondary}>{bus.assignedDepot || "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.dot }}>
                        <span className={styles.statusDot} style={{ background: sc.dot }} />
                        {t(statusLabels[bus.status] || bus.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {buses.length === 0 && (
            <div className={styles.empty}>{t("fleet.vehicles.noVehicles")}</div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>{t("fleet.vehicles.page")} {meta.page} {t("fleet.vehicles.of")} {meta.totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("fleet.vehicles.addVehicle")}</h2>
              <button className={styles.modalClose} onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleCreate}>
              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fPlate")}</label>
                  <input className={styles.input} name="plateNumber" value={formData.plateNumber} onChange={handleInputChange} required placeholder={t("fleet.vehicles.phPlate")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fMake")}</label>
                  <input className={styles.input} name="make" value={formData.make} onChange={handleInputChange} required placeholder={t("fleet.vehicles.phMake")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fModel")}</label>
                  <input className={styles.input} name="model" value={formData.model} onChange={handleInputChange} required placeholder={t("fleet.vehicles.phModel")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fYear")}</label>
                  <input className={styles.input} name="year" type="number" value={formData.year} onChange={handleInputChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fCapSeated")}</label>
                  <input className={styles.input} name="capacitySeated" type="number" value={formData.capacitySeated} onChange={handleInputChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fCapStanding")}</label>
                  <input className={styles.input} name="capacityStanding" type="number" value={formData.capacityStanding} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fFuel")}</label>
                  <select className={styles.select} name="fuelType" value={formData.fuelType} onChange={handleInputChange}>
                    {fuelTypes.map((ft) => <option key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fStatus")}</label>
                  <select className={styles.select} name="status" value={formData.status} onChange={handleInputChange}>
                    {statuses.map((s) => <option key={s} value={s}>{t(statusLabels[s] || s)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fColor")}</label>
                  <input className={styles.input} name="color" value={formData.color} onChange={handleInputChange} placeholder={t("fleet.vehicles.phColor")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fChassis")}</label>
                  <input className={styles.input} name="chassisNumber" value={formData.chassisNumber} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fVin")}</label>
                  <input className={styles.input} name="vin" value={formData.vin} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fEngine")}</label>
                  <input className={styles.input} name="engineNumber" value={formData.engineNumber} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fPrice")}</label>
                  <input className={styles.input} name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fDate")}</label>
                  <input className={styles.input} name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleInputChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("fleet.vehicles.fDepot")}</label>
                  <input className={styles.input} name="assignedDepot" value={formData.assignedDepot} onChange={handleInputChange} placeholder={t("fleet.vehicles.phDepot")} />
                </div>
              </div>

              {submitError && (
                <div className={styles.submitError}>
                  <AlertTriangle size={14} />
                  {submitError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? t("fleet.vehicles.creating") : t("fleet.vehicles.addVehicle")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
