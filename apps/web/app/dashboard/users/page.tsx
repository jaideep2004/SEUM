"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import {
  Search, Users as UsersIcon, Shield, Mail, Calendar, Plus, Pencil, Trash2, AlertTriangle, X, Eye, EyeOff,
} from "lucide-react";
import {
  ASSIGNABLE_ROLES,
  ROLE_COLORS,
  SUPER_ADMIN_ROLE,
  roleLabel,
} from "@/lib/access";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
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

/**
 * Roles the client offers today: company admin and operations manager.
 * A super admin may also create another super admin. Legacy roles
 * (fleet_manager, hr_manager, …) still render on existing users but are no
 * longer offered when creating or editing one.
 */
function getIsSuperAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("seum_user");
    if (!stored) return false;
    const user = JSON.parse(stored);
    return (user.roles || []).includes(SUPER_ADMIN_ROLE);
  } catch {
    return false;
  }
}

export default function UsersPage() {
  const { lang, t } = useLanguage();
  const [isSuper] = useState(getIsSuperAdmin);
  const assignableRoles: string[] = isSuper
    ? [SUPER_ADMIN_ROLE, ...ASSIGNABLE_ROLES]
    : [...ASSIGNABLE_ROLES];
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
      setError(err.message || t("admin.users.loadFailed"));
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
      setSubmitError(err?.message || t("admin.users.createFailed"));
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
      setEditError(err?.message || t("admin.users.updateFailed"));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <UsersIcon size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("admin.users.title")}</h1>
          <p className={styles.headerSub}>{formatNumber(users.length, lang)} {users.length === 1 ? t("admin.users.unitSingular") : t("admin.users.unitPlural")} {t("admin.users.across")}</p>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <Plus size={16} />
          {t("admin.users.add")}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={t("admin.users.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">{t("admin.users.allRoles")}</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>{t("admin.users.loading")}</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("admin.users.colName")}</th>
                  <th>{t("admin.users.colEmail")}</th>
                  <th>{t("admin.users.colRoles")}</th>
                  <th>{t("admin.users.colTenant")}</th>
                  <th>{t("admin.users.colStatus")}</th>
                  <th>{t("admin.users.colCreated")}</th>
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
                          <span key={role} className={styles.roleBadge} style={{ background: `${ROLE_COLORS[role] || "#6b7280"}18`, color: ROLE_COLORS[role] || "#6b7280" }}>
                            <Shield size={10} />
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.cellSecondary} style={{ fontSize: 12 }}>{u.tenant_name}</td>
                    <td>
                      <span className={u.is_active ? styles.statusActive : styles.statusInactive}>
                        <span className={u.is_active ? styles.dotActive : styles.dotInactive} />
                        {u.is_active ? t("admin.users.active") : t("admin.users.inactive")}
                      </span>
                    </td>
                    <td className={styles.cellMuted}>
                      <div className={styles.cellWithIcon}>
                        <Calendar size={12} />
                        {formatDate(u.created_at, lang)}
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.editBtn} onClick={() => openEditModal(u)} title={t("admin.users.editTitle")}>
                          <Pencil size={13} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => { setDeletingUser(u); setShowDeleteModal(true); }} title={t("admin.users.deleteTitle")}>
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
            <div className={styles.emptyState}>{t("admin.users.empty")}</div>
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
            <h3 className={styles.modalTitle}>{t("admin.users.deleteModal")}</h3>
            <p className={styles.modalText}>
              {t("admin.users.deleteTextA")}<strong>{deletingUser.name}</strong>{t("admin.users.deleteTextB")}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>{t("admin.users.cancel")}</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeleteUser} disabled={deleting}>
                {deleting ? t("admin.users.deleting") : t("admin.users.deleteModal")}
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
              <h2 className={styles.modalTitle}>{t("admin.users.editModal")}</h2>
              <button className={styles.modalClose} onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <form className={styles.modalBody} onSubmit={handleEditUser}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("admin.users.fullName")}</label>
                  <input className={styles.input} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required placeholder={t("admin.users.namePh")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("admin.users.emailLabel")}</label>
                  <input className={styles.input} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required placeholder={t("admin.users.emailPh")} />
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>{t("admin.users.rolesLabel")}</label>
                <div className={styles.roleCheckList}>
                  {assignableRoles.map((role) => (
                    <label key={role} className={styles.roleCheckItem}>
                      <input type="checkbox" checked={editForm.roles.includes(role)} onChange={() => toggleEditRole(role)} />
                      <span className={styles.roleCheckBadge} style={{ background: `${ROLE_COLORS[role] || "#6b7280"}18`, color: ROLE_COLORS[role] || "#6b7280" }}>
                        <Shield size={10} />
                        {roleLabel(role)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>{t("admin.users.accountStatus")}</label>
                <label className={styles.statusToggle}>
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                  <span className={editForm.isActive ? styles.statusActive : styles.statusInactive}>
                    <span className={editForm.isActive ? styles.dotActive : styles.dotInactive} />
                    {editForm.isActive ? t("admin.users.active") : t("admin.users.deactivated")}
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
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingUser(null)}>{t("admin.users.cancel")}</button>
                <button type="submit" className={styles.submitBtn} disabled={savingEdit || editForm.roles.length === 0}>
                  {savingEdit ? t("admin.users.saving") : t("admin.users.saveChanges")}
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
              <h2 className={styles.modalTitle}>{t("admin.users.add")}</h2>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form className={styles.modalBody} onSubmit={handleAddUser}>
              <div className={styles.fieldGrid}>
                {isSuper && (
                  <div className={styles.field}>
                    <label className={styles.label}>{t("admin.users.tenantLabel")}</label>
                    <select className={styles.select} value={formData.tenantId} onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })} required>
                      <option value="">{t("admin.users.tenantPh")}</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label}>{t("admin.users.fullName")}</label>
                  <input className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder={t("admin.users.namePh")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("admin.users.emailLabel")}</label>
                  <input className={styles.input} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder={t("admin.users.emailPh")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("admin.users.passwordLabel")}</label>
                  <div className={styles.pwInputWrap}>
                    <input className={styles.input} type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder={t("admin.users.passwordPh")} />
                    <button type="button" className={styles.pwToggle} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.label}>{t("admin.users.rolesLabel")}</label>
                <div className={styles.roleCheckList}>
                  {assignableRoles.map((role) => (
                    <label key={role} className={styles.roleCheckItem}>
                      <input type="checkbox" checked={formData.roles.includes(role)} onChange={() => toggleRole(role)} />
                      <span className={styles.roleCheckBadge} style={{ background: `${ROLE_COLORS[role] || "#6b7280"}18`, color: ROLE_COLORS[role] || "#6b7280" }}>
                        <Shield size={10} />
                        {roleLabel(role)}
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
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>{t("admin.users.cancel")}</button>
                <button type="submit" className={styles.submitBtn} disabled={saving || formData.roles.length === 0}>
                  {saving ? t("admin.users.creating") : t("admin.users.createUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
