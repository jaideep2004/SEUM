"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  Archive,
  Building2,
  Users,
  Package,
  Trash2,
  AlertTriangle,
  Search,
  Calendar,
  Mail,
  Shield,
} from "lucide-react";
import styles from "./page.module.css";

type Tab = "companies" | "users" | "plans";

const tabs: { key: Tab; labelKey: string; icon: any }[] = [
  { key: "companies", labelKey: "companies.arch.tabsCompanies", icon: Building2 },
  { key: "users", labelKey: "companies.arch.tabsUsers", icon: Users },
  { key: "plans", labelKey: "companies.arch.tabsPlans", icon: Package },
];

interface TrashedTenant {
  id: string;
  name: string;
  domain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  createdAt: string;
}

interface TrashedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  tenant_name: string;
  is_active: boolean;
  created_at: string;
}

interface TrashedPlan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  operations_manager: "Operations",
  fleet_manager: "Fleet Manager",
  monitoring_control: "Monitoring",
  driver: "Driver",
  hr_manager: "HR Manager",
  finance_accountant: "Finance",
  customer_service: "Customer Service",
  executive: "Executive",
  maintenance_workshop: "Maintenance",
};

export default function ArchivedPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("companies");
  const [tenants, setTenants] = useState<TrashedTenant[]>([]);
  const [users, setUsers] = useState<TrashedUser[]>([]);
  const [plans, setPlans] = useState<TrashedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: Tab; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tenantData, userData, planData] = await Promise.all([
        api.get<any[]>("/tenants"),
        api.get<any[]>("/users"),
        api.get<any[]>("/subscription-plans"),
      ]);
      setTenants(tenantData.filter((t) => !t.isActive));
      setUsers(userData.filter((u) => !u.is_active));
      setPlans(planData.filter((p) => !p.isActive));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openDelete = (type: Tab, id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setShowDeleteModal(true);
  };

  const handlePermanentDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const endpointMap: Record<Tab, string> = {
        companies: `/tenants/${deletingItem.id}/permanent`,
        users: `/users/${deletingItem.id}/permanent`,
        plans: `/subscription-plans/${deletingItem.id}/permanent`,
      };
      await api.delete(endpointMap[deletingItem.type]);
      fetchAll();
      setShowDeleteModal(false);
    } catch {}
    setDeleting(false);
  };

  const filteredTenants = tenants.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPlans = plans.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className={styles.page}><div className={styles.loading}>{t("companies.arch.loading")}</div></div>;

  const trashedCount = tenants.length + users.length + plans.length;
  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return "—";
    const map: Record<string, string> = {
      starter: t("companies.tierStarter"),
      professional: t("companies.tierProfessional"),
      enterprise: t("companies.tierEnterprise"),
      custom: t("companies.tierCustom"),
    };
    return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Archive size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("companies.arch.title")}</h1>
          <p className={styles.headerSub}>
            {trashedCount} {t("companies.arch.trashedWord")}{trashedCount !== 1 ? t("companies.arch.pluralS") : ""}
          </p>
        </div>
      </div>

      <div className={styles.tabsRow}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === "companies" ? tenants.length : tab.key === "users" ? users.length : plans.length;
          return (
            <button
              key={tab.key}
              className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={15} />
              {t(tab.labelKey)}
              {count > 0 && <span>({count})</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
          <input
            placeholder={t("companies.arch.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* ─── Companies Tab ─── */}
      {activeTab === "companies" && (
        <div className={styles.card}>
          {filteredTenants.length === 0 ? (
            <div className={styles.empty}>
              <Archive size={32} className={styles.emptyIcon} />
              {t("companies.arch.noCompanies")}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("companies.arch.colCompany")}</th>
                  <th>{t("companies.arch.colDomain")}</th>
                  <th>{t("companies.arch.colContact")}</th>
                  <th>{t("companies.arch.colPlan")}</th>
                  <th>{t("companies.arch.colCreated")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tt) => (
                  <tr key={tt.id}>
                    <td style={{ fontWeight: 600 }}>{tt.name}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{tt.domain || "—"}</td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Mail size={12} />
                        {tt.contactEmail || "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {tierLabel(tt.subscriptionTier)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={12} />
                        {formatDate(tt.createdAt, lang)}
                      </div>
                    </td>
                    <td>
                      <button className={styles.deleteBtn} onClick={() => openDelete("companies", tt.id, tt.name)}>
                        <Trash2 size={13} />
                        {t("companies.arch.deleteForever")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Users Tab ─── */}
      {activeTab === "users" && (
        <div className={styles.card}>
          {filteredUsers.length === 0 ? (
            <div className={styles.empty}>
              <Archive size={32} className={styles.emptyIcon} />
              {t("companies.arch.noUsers")}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("companies.arch.colName")}</th>
                  <th>{t("companies.arch.colEmail")}</th>
                  <th>{t("companies.arch.colRoles")}</th>
                  <th>{t("companies.arch.colTenant")}</th>
                  <th>{t("companies.arch.colJoined")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.roles.map((role) => (
                          <span key={role} style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
                            borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
                            background: "rgba(107,114,128,0.12)", color: "#6b7280",
                          }}>
                            <Shield size={10} />
                            {roleLabels[role] ? t(`companies.arch.role.${role}`) : role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{u.tenant_name}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={12} />
                        {formatDate(u.created_at, lang)}
                      </div>
                    </td>
                    <td>
                      <button className={styles.deleteBtn} onClick={() => openDelete("users", u.id, u.name)}>
                        <Trash2 size={13} />
                        {t("companies.arch.deleteForever")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Plans Tab ─── */}
      {activeTab === "plans" && (
        <div className={styles.card}>
          {filteredPlans.length === 0 ? (
            <div className={styles.empty}>
              <Archive size={32} className={styles.emptyIcon} />
              {t("companies.arch.noPlans")}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("companies.arch.colPlanName")}</th>
                  <th>{t("companies.arch.colTier")}</th>
                  <th>{t("companies.arch.colPrice")}</th>
                  <th>{t("companies.arch.colMaxUsers")}</th>
                  <th>{t("companies.arch.colStatus")}</th>
                  <th>{t("companies.arch.colCreated")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                      {tierLabel(p.tier)}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {t("companies.plans.sar")} {formatNumber(p.priceMonthly, lang, 0)}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{p.maxUsers}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>{t("companies.arch.inactive")}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={12} />
                        {formatDate(p.createdAt, lang)}
                      </div>
                    </td>
                    <td>
                      <button className={styles.deleteBtn} onClick={() => openDelete("plans", p.id, p.name)}>
                        <Trash2 size={13} />
                        {t("companies.arch.deleteForever")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingItem && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle}>{t("companies.arch.permDelete")}</h3>
            <p className={styles.modalText}>
              {t("companies.arch.permDeleteA")} <strong>{deletingItem.name}</strong> {t("companies.arch.permDeleteB")} <strong>{t("companies.arch.cannot")}</strong> {t("companies.arch.permDeleteC")}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowDeleteModal(false)}>
                {t("companies.arch.cancel")}
              </button>
              <button className={styles.modalConfirm} onClick={handlePermanentDelete} disabled={deleting}>
                {deleting ? t("companies.arch.deleting") : t("companies.arch.deleteForever")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
