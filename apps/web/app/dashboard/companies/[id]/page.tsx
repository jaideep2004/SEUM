"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  Building2,
  ArrowLeft,
  Edit3,
  CreditCard,
  Users,
  Calendar,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Package,
  BarChart3,
} from "lucide-react";
import styles from "./page.module.css";

interface TenantDetail {
  id: string;
  name: string;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  features?: Record<string, boolean>;
  billingCycle?: string;
  billingEmail?: string;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "#6366f1", text: "#fff" },
  professional: { bg: "#059669", text: "#fff" },
  enterprise: { bg: "#d97706", text: "#fff" },
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTenant = useCallback(async () => {
    try {
      const data = await api.get<any>(`/tenants/${tenantId}`);
      setTenant(data);
    } catch (err: any) {
      setError(err.message || "Failed to load company");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>;
  if (error || !tenant) return (
    <div className={styles.page}>
      <div className={styles.errorBanner}>
        <AlertTriangle size={20} />
        <span>{error || "Company not found"}</span>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>Back</button>
      </div>
    </div>
  );

  const tc = tenant.subscriptionTier ? tierColors[tenant.subscriptionTier] : undefined;

  const infoCards = [
    { icon: Globe, label: "Domain", value: tenant.domain || "—" },
    { icon: User, label: "Contact", value: tenant.contactName || "—" },
    { icon: Mail, label: "Email", value: tenant.contactEmail || "—" },
    { icon: Phone, label: "Phone", value: tenant.contactPhone || "—" },
    { icon: Calendar, label: "Created", value: new Date(tenant.createdAt).toLocaleDateString() },
    { icon: Activity, label: "Status", value: tenant.isActive ? "Active" : "Inactive" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>
          <ArrowLeft size={18} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.headerTop}>
            <div className={styles.avatar}>{(tenant.name || "?").charAt(0).toUpperCase()}</div>
            <h1 className={styles.headerTitle}>{tenant.name || "Unnamed Company"}</h1>
            <span className={styles.tierBadge} style={{ background: tc?.bg || "rgba(99,102,241,0.1)", color: tc?.text || "#6366f1" }}>
              <CreditCard size={12} />
              {tenant.subscriptionTier ? tenant.subscriptionTier.charAt(0).toUpperCase() + tenant.subscriptionTier.slice(1) : "Unknown"}
            </span>
            {!tenant.isActive && (
              <span className={styles.inactiveBadge}>
                <XCircle size={12} /> Inactive
              </span>
            )}
          </div>
        </div>
        <button className={styles.editBtn}>
          <Edit3 size={15} />
          Edit
        </button>
      </div>

      <div className={styles.infoGrid}>
        {infoCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.infoCard}>
              <div className={styles.infoIcon}><Icon size={16} /></div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{card.label}</span>
                <span className={styles.infoValue}>{card.value}</span>
              </div>
            </div>
          );
        })}
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}><Package size={16} /></div>
          <div className={styles.infoContent}>
            <span className={styles.infoLabel}>Billing</span>
            <span className={styles.infoValue}>{tenant.billingCycle || "Monthly"}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      {tenant.features && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CheckCircle2 size={18} />
            <h2 className={styles.sectionTitle}>Enabled Modules</h2>
          </div>
          <div className={styles.featuresGrid}>
            {Object.entries(tenant.features).map(([key, enabled]) => (
              <div key={key} className={`${styles.featureItem} ${enabled ? styles.featureEnabled : styles.featureDisabled}`}>
                {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span>{key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Users size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>Users</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <BarChart3 size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>Active Trips</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <Activity size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>Vehicles</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function User({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
