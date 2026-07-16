export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: { field?: string; message: string }[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'operations_manager'
  | 'fleet_manager'
  | 'driver'
  | 'hr_manager'
  | 'finance_accountant'
  | 'monitoring_control'
  | 'customer_service'
  | 'executive'
  | 'maintenance_workshop';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  contactEmail: string;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  resource: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
}
