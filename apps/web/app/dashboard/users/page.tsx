"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import {
  Search, Users as UsersIcon, Shield, Mail, Calendar, Plus, Pencil, Trash2, AlertTriangle, X, Eye, EyeOff,
} from "lucide-react";
import styles from "./page.module.css";

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

interface Tenant {
  id: string;
  name: string;
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

const allAvailableRoles = Object.keys(roleLabels);

function getIsSuperAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("seum_user");
    if (!stored) return false;
    const user = JSON.parse(stored);
    return (user.roles || []).includes("super_admin");
  } catch {
    return false;
  }
}

export default function UsersPage() {
  const [isSuper] = useState(getIsSuperAdmin);
  const assignableRoles = isSuper ? allAvailableRoles : allAvailableRoles.filter((r) => r !== "super_admin");
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    roles: [] as string[],
    isActive: true,
  });

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: "",
    name: "",
    email: "",
    password: "",
    roles: [] as string[],
  });

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

  async function fetchTenants() {
    try {
      const data = await api.get<Tenant[]>("/tenants?isActive=true");
      setTenants(data);
    } catch {}
  }

  useEffect(() => {
    fetchUsers();
    if (isSuper) fetchTenants();
  }, [isSuper]);

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const allRoles = [...new Set(users.flatMap((u) => u.roles))].sort();

  const openAddModal = () => {
    setFormData({ tenantId: tenants[0]?.id || "", name: "", email: "", password: "", roles: [] });
    setSubmitError("");
    setShowAddModal(true);
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError("");
    try {
      const payload = isSuper
        ? { ...formData }
        : { name: formData.name, email: formData.email, password: formData.password, roles: formData.roles };
      await api.post("/auth/register", payload);
      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      setShowDeleteModal(false);
      setDeletingUser(null);
      fetchUsers();
    } catch {}
    setDeleting(false);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, roles: u.roles, isActive: u.is_active });
    setEditError("");
  };

  const toggleEditRole = (role: string) => {
    setEditForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setEditError("");
    try {
      await api.patch(`/users/${editingUser.id}`, {
        name: editForm.name,
        email: editForm.email,
        roles: editForm.roles,
        isActive: editForm.isActive,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <UsersIcon size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Users</h1>
          <p className={styles.headerSub}>{users.length} user{users.length !== 1 ? "s" : ""} across all tenants</p>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <Plus size={16} />
          Add New User
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{roleLabels[r] || r}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.cellName}>
                      <div className={styles.avatar}>{u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                      {u.name}
                    </td>
                    <td className={styles.cellSecondary}>
                      <div className={styles.cellWithIcon}>
                        <Mail size={13} className={styles.cellIcon} />
                        {u.email}
                      </div>
                    </td>
                    <td>
                      <div className={styles.roleList}>
                        {u.roles.map((role) => (
                          <span key={role} className={styles.roleBadge} style={{ background: `${roleColors[role] || "#6b7280"}18`, color: roleColors[role] || "#6b7280" }}>
                            <Shield size={10} />
                            {roleLabels[role] || role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.cellSecondary} style={{ fontSize: 12 }}>{u.tenant_name}</td>
                    <td>
                      <span className={u.is_active ? styles.statusActive : styles.statusInactive}>
                        <span className={u.is_active ? styles.dotActive : styles.dotInactive} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.cellMuted}>
                      <div className={styles.cellWithIcon}>
                        <Calendar size={12} />
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.editBtn} onClick={() => openEditModal(u)} title="Edit user">
                          <Pencil size={13} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => { setDeletingUser(u); setShowDeleteModal(true); }} title="Delete user">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className={styles.emptyState}>No users found</div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconDanger}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle}>Delete User</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete <strong>{deletingUser.name}</strong>? This will deactivate the user account.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeleteUser} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className={styles.modalOverlay} onClick={() => setEditingUser(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit User</h2>
              <button className={styles.modalClose} onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <form className={styles.modalBody} onSubmit={handleEditUser}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name *</label>
                  <input className={styles.input} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required placeholder="e.g. John Doe" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email *</label>
                  <input className={styles.input} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required placeholder="user@example.com" />
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>Roles *</label>
                <div className={styles.roleCheckList}>
                  {assignableRoles.map((role) => (
                    <label key={role} className={styles.roleCheckItem}>
                      <input type="checkbox" checked={editForm.roles.includes(role)} onChange={() => toggleEditRole(role)} />
                      <span className={styles.roleCheckBadge} style={{ background: `${roleColors[role] || "#6b7280"}18`, color: roleColors[role] || "#6b7280" }}>
                        <Shield size={10} />
                        {roleLabels[role]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>Account Status</label>
                <label className={styles.statusToggle}>
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                  <span className={editForm.isActive ? styles.statusActive : styles.statusInactive}>
                    <span className={editForm.isActive ? styles.dotActive : styles.dotInactive} />
                    {editForm.isActive ? "Active" : "Deactivated"}
                  </span>
                </label>
              </div>

              {editError && (
                <div className={styles.submitError}>
                  <AlertTriangle size={14} />
                  {editError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={savingEdit || editForm.roles.length === 0}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New User</h2>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form className={styles.modalBody} onSubmit={handleAddUser}>
              <div className={styles.fieldGrid}>
                {isSuper && (
                  <div className={styles.field}>
                    <label className={styles.label}>Tenant *</label>
                    <select className={styles.select} value={formData.tenantId} onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })} required>
                      <option value="">Select tenant...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label}>Full Name *</label>
                  <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. John Doe" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email *</label>
                  <input className={styles.input} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="user@example.com" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Password *</label>
                  <div className={styles.pwInputWrap}>
                    <input className={styles.input} type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder="Min 8 characters" />
                    <button type="button" className={styles.pwToggle} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>Roles *</label>
                <div className={styles.roleCheckList}>
                  {assignableRoles.map((role) => (
                    <label key={role} className={styles.roleCheckItem}>
                      <input type="checkbox" checked={formData.roles.includes(role)} onChange={() => toggleRole(role)} />
                      <span className={styles.roleCheckBadge} style={{ background: `${roleColors[role] || "#6b7280"}18`, color: roleColors[role] || "#6b7280" }}>
                        <Shield size={10} />
                        {roleLabels[role]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {submitError && (
                <div className={styles.submitError}>
                  <AlertTriangle size={14} />
                  {submitError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={saving || formData.roles.length === 0}>
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
