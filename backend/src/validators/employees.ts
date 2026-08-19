import { z } from 'zod';

export const DEPARTMENTS = ['operations', 'finance', 'hr', 'fleet', 'maintenance', 'customer_service', 'executive', 'admin'] as const;
export const EMPLOYEE_STATUSES = ['active', 'suspended', 'terminated', 'on_leave'] as const;

export const createEmployeeSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  employeeCode: z.string().max(50).optional(),
  department: z.enum(DEPARTMENTS).default('operations'),
  designation: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  joinDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  nationality: z.string().max(100).optional(),
  idNumber: z.string().max(100).optional(),
  status: z.enum(EMPLOYEE_STATUSES).default('active'),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  employeeCode: z.string().max(50).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  designation: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Valid email is required').optional(),
  joinDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  nationality: z.string().max(100).optional(),
  idNumber: z.string().max(100).optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
});

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  search: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
