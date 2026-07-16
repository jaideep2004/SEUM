"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Eye,
  User,
  Clock,
  AlertTriangle,
  Activity,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import styles from "./page.module.css";

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const actionIcons: Record<string, any> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
  login: User,
  upload: FileText,
};

const actionColors: Record<string, string> = {
  create: "var(--color-success)",
  update: "var(--color-info)",
  delete: "var(--color-danger)",
  login: "var(--color-text-secondary)",
  upload: "var(--color-warning)",
};

const resourceLabels: Record<string, string> = {
  fleet: "Fleet",
  bus: "Bus",
  bus_document: "Document",
  tenant: "Company",
  user: "User",
  auth: "Authentication",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (resource) params.set("resource", resource);
      if (action) params.set("action", action);
      if (search) params.set("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audit-logs?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("seum_access_token")}`,
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setMeta(data.meta);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, resource, action, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [resource, action]);

  const formatJson = (val: any) => {
    if (!val) return "—";
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <ClipboardList size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Audit Logs</h1>
          <p className={styles.headerSub}>
            {meta ? `${meta.total} event${meta.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search actor name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={styles.select} value={resource} onChange={(e) => setResource(e.target.value)}>
          <option value="">All Resources</option>
          {Object.entries(resourceLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select className={styles.select} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="upload">Upload</option>
        </select>
        <span className={styles.logCount}>
          <Activity size={14} />
          {meta?.total ?? "—"} events
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.loadingCell}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className={styles.loadingCell}>No audit log entries found</td></tr>
            ) : (
              logs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                const actionColor = actionColors[log.action] || "var(--color-text-secondary)";
                const isExpanded = expandedId === log.id;

                return (
                  <tr key={log.id}>
                    <td className={styles.cellTimestamp}>
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className={styles.actorCell}>
                        <div className={styles.actorAvatar}>
                          {log.actorName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className={styles.actorName}>{log.actorName || "System"}</div>
                          {log.actorEmail && <div className={styles.actorEmail}>{log.actorEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.actionBadge} style={{ background: `${actionColor}15`, color: actionColor }}>
                        <ActionIcon size={12} />
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.resourceBadge}>
                        {resourceLabels[log.resource] || log.resource}
                      </span>
                      <span className={styles.resourceId}>#{log.resourceId.slice(0, 8)}</span>
                    </td>
                    <td className={styles.cellDetails}>
                      {log.details || (log.action === "update" ? `${Object.keys(log.newValue || {}).length} field(s) changed` : "—")}
                    </td>
                    <td>
                      <button
                        className={styles.expandBtn}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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

      {/* Expanded detail */}
      {expandedId && (() => {
        const log = logs.find((l) => l.id === expandedId);
        if (!log) return null;
        return (
          <div className={styles.detailOverlay} onClick={() => setExpandedId(null)}>
            <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailHeader}>
                <h3 className={styles.detailTitle}>Event Details</h3>
                <button className={styles.detailClose} onClick={() => setExpandedId(null)}>Close</button>
              </div>
              <div className={styles.detailBody}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Event ID</span>
                  <span className={styles.detailValue}>{log.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Timestamp</span>
                  <span className={styles.detailValue}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Actor</span>
                  <span className={styles.detailValue}>{log.actorName || "System"} {log.actorEmail ? `(${log.actorEmail})` : ""}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Action</span>
                  <span className={styles.detailValue}>{log.action}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Resource</span>
                  <span className={styles.detailValue}>{log.resource} #{log.resourceId}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>IP Address</span>
                  <span className={styles.detailValue}>{log.ipAddress || "—"}</span>
                </div>
                {log.details && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Details</span>
                    <span className={styles.detailValue}>{log.details}</span>
                  </div>
                )}
                {log.oldValue && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Old Value</span>
                    <pre className={styles.detailPre}>{formatJson(log.oldValue)}</pre>
                  </div>
                )}
                {log.newValue && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>New Value</span>
                    <pre className={styles.detailPre}>{formatJson(log.newValue)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
