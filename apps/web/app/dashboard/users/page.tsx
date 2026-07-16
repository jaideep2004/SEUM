"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Search, Users as UsersIcon, Shield, Mail, Calendar } from "lucide-react";

interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
  tenant_name: string;
}

const roleColors: Record<string, string> = {
  super_admin: "#ef4444",
  company_admin: "#f59e0b",
  operations_manager: "#3b82f6",
  fleet_manager: "#10b981",
  monitoring_control: "#8b5cf6",
  driver: "#06b6d4",
  hr_manager: "#ec4899",
  finance_accountant: "#14b8a6",
  customer_service: "#f97316",
  executive: "#6366f1",
  maintenance_workshop: "#6b7280",
};

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<User[]>("/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const allRoles = [...new Set(users.flatMap((u) => u.roles))].sort();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <UsersIcon size={24} style={{ color: "var(--color-primary)" }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>Users</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
            {users.length} user{users.length !== 1 ? "s" : ""} across all tenants
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            height: 38, padding: "0 12px", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", background: "var(--color-surface)", color: "var(--color-text-primary)",
            fontSize: 13, outline: "none",
          }}
        >
          <option value="">All Roles</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{roleLabels[r] || r}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "var(--color-danger-light)", border: "1px solid var(--color-danger-border)", borderRadius: "var(--radius-md)", color: "var(--color-danger-text)", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-tertiary)", fontSize: 14 }}>Loading users...</div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Roles</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Tenant</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-text-secondary)" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary-light)",
                          color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 600, fontSize: 12, flexShrink: 0,
                        }}>
                          {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={13} style={{ color: "var(--color-text-tertiary)" }} />
                        {u.email}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.roles.map((role) => (
                          <span key={role} style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
                            borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
                            background: `${roleColors[role] || "#6b7280"}18`,
                            color: roleColors[role] || "#6b7280",
                          }}>
                            <Shield size={10} />
                            {roleLabels[role] || role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", fontSize: 12 }}>{u.tenant_name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px",
                        borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
                        background: u.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: u.is_active ? "#10b981" : "#ef4444",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: u.is_active ? "#10b981" : "#ef4444" }} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-tertiary)", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={12} />
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-tertiary)", fontSize: 14 }}>
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
