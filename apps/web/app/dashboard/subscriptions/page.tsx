"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import {
  CreditCard,
  Search,
  RefreshCw,
  Building2,
  Users,
  CalendarClock,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";
import styles from "./page.module.css";

interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
}

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  planId: string | null;
  billingCycle: string;
  billingEmail: string | null;
  subscriptionStartedAt: string | null;
  subscriptionRenewalDate: string | null;
  isActive: boolean;
  createdAt: string;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "rgba(99,102,241,0.1)", text: "#6366f1" },
  professional: { bg: "rgba(16,185,129,0.1)", text: "#059669" },
  enterprise: { bg: "rgba(245,158,11,0.1)", text: "#d97706" },
};

export default function SubscriptionsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [modalTenant, setModalTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ planId: "", billingCycle: "monthly", billingEmail: "", subscriptionRenewalDate: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tenantData, planData] = await Promise.all([
        api.get<any[]>("/tenants"),
        api.get<any[]>("/subscription-plans"),
      ]);
      setTenants(tenantData);
      setPlans(planData);
    } catch (err: any) {
      setError(err.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const planById = (id: string | null) => plans.find((p) => p.id === id);

  const openModal = (t: Tenant) => {
    const plan = planById(t.planId);
    setForm({
      planId: t.planId || plan?.id || "",
      billingCycle: t.billingCycle || "monthly",
      billingEmail: t.billingEmail || t.contactEmail || "",
      subscriptionRenewalDate: t.subscriptionRenewalDate?.slice(0, 10) || "",
    });
    setModalTenant(t);
  };

  const save = async () => {
    if (!modalTenant) return;
    setSaving(true);
    try {
      await api.patch(`/tenants/${modalTenant.id}`, {
        planId: form.planId || undefined,
        billingCycle: form.billingCycle,
        billingEmail: form.billingEmail || undefined,
        subscriptionRenewalDate: form.subscriptionRenewalDate || undefined,
      });
      setModalTenant(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.name.toLowerCase().includes(q)
      || (t.contactEmail || "").toLowerCase().includes(q)
      || (t.domain || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all"
      || (statusFilter === "active" && t.isActive)
      || (statusFilter === "inactive" && !t.isActive);
    return matchSearch && matchStatus;
  });

  const active = tenants.filter((t) => t.isActive);
  const renewingSoon = tenants.filter((t) => {
    if (!t.subscriptionRenewalDate) return false;
    const days = (new Date(t.subscriptionRenewalDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  });
  const monthlyRecurring = active.reduce((sum, t) => {
    const plan = planById(t.planId);
    if (!plan) return sum;
    return sum + (t.billingCycle === "yearly" ? plan.priceYearly / 12 : plan.priceMonthly);
  }, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <CreditCard size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Subscriptions</h1>
          <p className={styles.headerSub}>Manage subscription plans across companies</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData} title="Refresh">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className={styles.cards}>
        <div className={styles.statCard}>
          <Building2 size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{tenants.length}</span>
            <span className={styles.statLabel}>Total Companies</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{active.length}</span>
            <span className={styles.statLabel}>Active Subscriptions</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Wallet size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{monthlyRecurring.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className={styles.statLabel}>Monthly Recurring (SAR)</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CalendarClock size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{renewingSoon.length}</span>
            <span className={styles.statLabel}>Renewing in 30 Days</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search company, email, domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <div className={styles.error}><AlertTriangle size={13} /> {error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading subscriptions...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Billing</th>
                <th>Renewal Date</th>
                <th>Status</th>
                <th style={{ width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const plan = planById(t.planId);
                const tc = tierColors[t.subscriptionTier] || tierColors.starter;
                const renewalDays = t.subscriptionRenewalDate
                  ? Math.ceil((new Date(t.subscriptionRenewalDate).getTime() - Date.now()) / 86400000)
                  : null;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className={styles.companyName}>{t.name}</div>
                      <div className={styles.cellSub}>{t.contactEmail || t.domain || "—"}</div>
                    </td>
                    <td>
                      <span className={styles.tierBadge} style={{ background: tc.bg, color: tc.text }}>
                        {plan?.name || t.subscriptionTier?.replace("_", " ") || "No plan"}
                      </span>
                    </td>
                    <td className={styles.billingCell}>{t.billingCycle || "monthly"}</td>
                    <td>
                      {t.subscriptionRenewalDate ? (
                        <span>
                          {new Date(t.subscriptionRenewalDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          {renewalDays !== null && renewalDays >= 0 && renewalDays <= 30 && (
                            <span className={styles.renewalSoon}>({renewalDays}d)</span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${t.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className={styles.changeBtn} onClick={() => openModal(t)}>Change Plan</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>No companies found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalTenant && (
        <div className={styles.modalOverlay} onClick={() => setModalTenant(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Change Subscription</h3>
                <p className={styles.modalSub}>{modalTenant.name}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setModalTenant(null)}><X size={15} /></button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>Plan *</label>
                <select value={form.planId} onChange={(e) => setForm(f => ({ ...f, planId: e.target.value }))}>
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.priceMonthly} SAR/mo ({p.maxUsers} users, {p.maxVehicles} vehicles)
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Billing Cycle</label>
                  <select value={form.billingCycle} onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Renewal Date</label>
                  <input
                    type="date"
                    value={form.subscriptionRenewalDate}
                    onChange={(e) => setForm(f => ({ ...f, subscriptionRenewalDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>Billing Email</label>
                <input
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => setForm(f => ({ ...f, billingEmail: e.target.value }))}
                  placeholder="billing@company.com"
                />
              </div>

              {!form.planId && (
                <div className={styles.warnNote}><AlertTriangle size={12} /> A plan must be selected to save.</div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setModalTenant(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={save} disabled={saving || !form.planId}>
                {saving ? "Saving..." : "Save Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
