import { z } from 'zod';

export const createDriverSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  employeeCode: z.string().max(50).optional(),
  licenseNumber: z.string().max(100).optional(),
  licenseExpiry: z.string().optional(),
  licenseCategory: z.string().max(20).optional(),
  passportNumber: z.string().max(50).optional(),
  nationality: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  hireDate: z.string().optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  bloodType: z.string().max(5).optional(),
  medicalFitnessExpiry: z.string().optional(),
  status: z.enum(['active', 'suspended', 'terminated', 'on_leave']).default('active'),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  employeeCode: z.string().max(50).optional(),
  licenseNumber: z.string().max(100).optional(),
  licenseExpiry: z.string().optional(),
  licenseCategory: z.string().max(20).optional(),
  passportNumber: z.string().max(50).optional(),
  nationality: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  hireDate: z.string().optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  bloodType: z.string().max(5).optional(),
  medicalFitnessExpiry: z.string().optional(),
  status: z.enum(['active', 'suspended', 'terminated', 'on_leave']).optional(),
});

export const listDriversQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'suspended', 'terminated', 'on_leave']).optional(),
  nationality: z.string().optional(),
  search: z.string().optional(),
});

export const createDriverDocSchema = z.object({
  documentType: z.enum(['license', 'passport', 'visa', 'id_card', 'medical', 'contract', 'training_cert', 'other']),
  documentNumber: z.string().max(100).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;
export type CreateDriverDocInput = z.infer<typeof createDriverDocSchema>;
