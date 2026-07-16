"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  CreditCard,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import styles from "./page.module.css";

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "#6366f1", text: "#fff" },
  professional: { bg: "#059669", text: "#fff" },
  enterprise: { bg: "#d97706", text: "#fff" },
};

export default function CompaniesPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tenants?page=${page}&pageSize=20&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("seum_access_token")}`,
          },
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load");
      setTenants(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Building2 size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Companies</h1>
          <p className={styles.headerSub}>
            {meta ? `${meta.total} company${meta.total !== 1 ? "ies" : "y"}` : "Loading..."}
          </p>
        </div>
        <button className={styles.addBtn}>
          <Plus size={16} />
          Add Company
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, domain, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading companies...</div>
      ) : (
        <div className={styles.cardGrid}>
          {tenants.map((tenant) => {
            const tc = tierColors[tenant.subscriptionTier] || tierColors.starter;
            return (
              <div
                key={tenant.id}
                className={styles.tenantCard}
                onClick={() => router.push(`/dashboard/companies/${tenant.id}`)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar}>
                    {(tenant.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.cardMeta}>
                    <h3 className={styles.cardName}>{tenant.name}</h3>
                    {tenant.domain && <span className={styles.cardDomain}>{tenant.domain}</span>}
                  </div>
                  {!tenant.isActive && (
                    <span className={styles.inactiveBadge}>
                      <XCircle size={12} />
                      Inactive
                    </span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <Users size={14} />
                    <span>{tenant.userCount ?? "—"} users</span>
                  </div>
                  {tenant.contactEmail && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Contact:</span>
                      <span>{tenant.contactEmail}</span>
                    </div>
                  )}
                  {tenant.contactPhone && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Phone:</span>
                      <span>{tenant.contactPhone}</span>
                    </div>
                  )}
                  <div className={styles.cardRow}>
                    <Calendar size={14} />
                    <span>Created {new Date(tenant.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.tierBadge} style={{ background: tc?.bg || "rgba(99,102,241,0.1)", color: tc?.text || "#6366f1" }}>
                    <CreditCard size={12} />
                    {tenant.subscriptionTier ? tenant.subscriptionTier.charAt(0).toUpperCase() + tenant.subscriptionTier.slice(1) : "Unknown"}
                  </span>
                  <span className={styles.cardArrow}>
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tenants.length === 0 && (
        <div className={styles.empty}>No companies found</div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className={styles.pageInfo}>Page {meta.page} of {meta.totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
