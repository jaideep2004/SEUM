"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Truck, Save, AlertTriangle } from "lucide-react";
import styles from "./page.module.css";

interface BusFormData {
  plateNumber: string;
  chassisNumber: string;
  make: string;
  model: string;
  year: number | "";
  capacitySeated: number | "";
  capacityStanding: number | "";
  color: string;
  vin: string;
  engineNumber: string;
  fuelType: string;
  status: string;
  purchaseDate: string;
  purchasePrice: number | "";
  assignedDepot: string;
}

const fuelTypes = ["diesel", "petrol", "electric", "hybrid", "cng", "lpg"];
const statusOptions = ["active", "maintenance", "retired", "sold"];

const initialForm: BusFormData = {
  plateNumber: "",
  chassisNumber: "",
  make: "",
  model: "",
  year: "",
  capacitySeated: "",
  capacityStanding: "",
  color: "",
  vin: "",
  engineNumber: "",
  fuelType: "diesel",
  status: "active",
  purchaseDate: "",
  purchasePrice: "",
  assignedDepot: "",
};

export default function BusEditPage() {
  const { lang, t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const busId = params.id as string;

  const [form, setForm] = useState<BusFormData>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<any>(`/fleet/buses/${busId}`);
        setForm({
          plateNumber: data.plateNumber || "",
          chassisNumber: data.chassisNumber || "",
          make: data.make || "",
          model: data.model || "",
          year: data.year ?? "",
          capacitySeated: data.capacitySeated ?? "",
          capacityStanding: data.capacityStanding ?? "",
          color: data.color || "",
          vin: data.vin || "",
          engineNumber: data.engineNumber || "",
          fuelType: data.fuelType || "diesel",
          status: data.status || "active",
          purchaseDate: data.purchaseDate ? data.purchaseDate.slice(0, 10) : "",
          purchasePrice: data.purchasePrice ?? "",
          assignedDepot: data.assignedDepot || "",
        });
      } catch (err: any) {
        setError(err.message || t("fleet.vehicleEdit.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [busId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.plateNumber.trim()) next.plateNumber = t("fleet.vehicleEdit.reqPlate");
    if (!form.make.trim()) next.make = t("fleet.vehicleEdit.reqMake");
    if (!form.model.trim()) next.model = t("fleet.vehicleEdit.reqModel");
    if (!form.year || Number(form.year) < 1900) next.year = t("fleet.vehicleEdit.reqYear");
    if (!form.capacitySeated || Number(form.capacitySeated) < 1) next.capacitySeated = t("fleet.vehicleEdit.reqCap");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/fleet/buses/${busId}`, {
        ...form,
        year: Number(form.year),
        capacitySeated: Number(form.capacitySeated),
        capacityStanding: Number(form.capacityStanding) || 0,
        purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
        purchaseDate: form.purchaseDate || null,
        chassisNumber: form.chassisNumber || null,
        color: form.color || null,
        vin: form.vin || null,
        engineNumber: form.engineNumber || null,
        assignedDepot: form.assignedDepot || null,
      });
      router.push(`/dashboard/fleet/vehicles/${busId}`);
    } catch (err: any) {
      setError(err.message || t("fleet.vehicleEdit.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{t("fleet.vehicleEdit.loading")}</div>
      </div>
    );
  }

  if (error && !form.plateNumber) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button className={styles.backBtn} onClick={() => router.push("/dashboard/fleet/vehicles")}>
            {t("fleet.vehicleDetail.backToVehicles")}
          </button>
        </div>
      </div>
    );
  }

  const fieldError = (name: string) => (errors[name] ? styles.inputError : "");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/dashboard/fleet/vehicles/${busId}`)}>
          <ArrowLeft size={18} />
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>{t("fleet.vehicleEdit.title")}</h1>
          <p className={styles.headerSub}>{form.plateNumber || t("fleet.vehicleEdit.busFallback")} &middot; {t("fleet.vehicleEdit.sub")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Truck size={16} />
            <h2 className={styles.cardTitle}>{t("fleet.vehicleEdit.basic")}</h2>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>
                {t("fleet.vehicleEdit.plateNumber")} <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${fieldError("plateNumber")}`}
                name="plateNumber"
                value={form.plateNumber}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phPlate")}
              />
              {errors.plateNumber && <span className={styles.fieldErr}>{errors.plateNumber}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("fleet.vehicleEdit.make")} <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${fieldError("make")}`}
                name="make"
                value={form.make}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phMake")}
              />
              {errors.make && <span className={styles.fieldErr}>{errors.make}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("fleet.vehicleEdit.model")} <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${fieldError("model")}`}
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phModel")}
              />
              {errors.model && <span className={styles.fieldErr}>{errors.model}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("fleet.vehicleEdit.year")} <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${fieldError("year")}`}
                name="year"
                type="number"
                value={form.year}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phYear")}
              />
              {errors.year && <span className={styles.fieldErr}>{errors.year}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("fleet.vehicleEdit.seated")} <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${fieldError("capacitySeated")}`}
                name="capacitySeated"
                type="number"
                value={form.capacitySeated}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phSeated")}
              />
              {errors.capacitySeated && <span className={styles.fieldErr}>{errors.capacitySeated}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.standing")}</label>
              <input
                className={styles.input}
                name="capacityStanding"
                type="number"
                value={form.capacityStanding}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phStanding")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.color")}</label>
              <input
                className={styles.input}
                name="color"
                value={form.color}
                onChange={handleChange}
                placeholder={t("fleet.vehicles.phColor")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.fuelType")}</label>
              <select className={styles.select} name="fuelType" value={form.fuelType} onChange={handleChange}>
                {fuelTypes.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.status")}</label>
              <select className={styles.select} name="status" value={form.status} onChange={handleChange}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.depot")}</label>
              <input
                className={styles.input}
                name="assignedDepot"
                value={form.assignedDepot}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phDepot")}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Truck size={16} />
            <h2 className={styles.cardTitle}>{t("fleet.vehicleEdit.idTitle")}</h2>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.chassis")}</label>
              <input
                className={styles.input}
                name="chassisNumber"
                value={form.chassisNumber}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phChassis")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.vin")}</label>
              <input
                className={styles.input}
                name="vin"
                value={form.vin}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phVin")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.engine")}</label>
              <input
                className={styles.input}
                name="engineNumber"
                value={form.engineNumber}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phEngine")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.purchaseDate")}</label>
              <input
                className={styles.input}
                name="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("fleet.vehicleEdit.price")}</label>
              <input
                className={styles.input}
                name="purchasePrice"
                type="number"
                value={form.purchasePrice}
                onChange={handleChange}
                placeholder={t("fleet.vehicleEdit.phPrice")}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.submitError}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push(`/dashboard/fleet/vehicles/${busId}`)}>
            {t("common.cancel")}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            <Save size={15} />
            {saving ? t("fleet.vehicleEdit.saving") : t("fleet.vehicleEdit.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
