import { z } from 'zod';

export const upsertSalaryStructureSchema = z.object({
  employee_id: z.string().uuid(),
  basic_salary: z.number().min(0).default(0),
  housing_allowance: z.number().min(0).default(0),
  transport_allowance: z.number().min(0).default(0),
  other_allowances: z.number().min(0).default(0),
  insurance_deduction: z.number().min(0).default(0),
  loan_deduction: z.number().min(0).default(0),
  penalty_deductions: z.number().min(0).default(0),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateSalaryStructureSchema = z.object({
  basic_salary: z.number().min(0).optional(),
  housing_allowance: z.number().min(0).optional(),
  transport_allowance: z.number().min(0).optional(),
  other_allowances: z.number().min(0).optional(),
  insurance_deduction: z.number().min(0).optional(),
  loan_deduction: z.number().min(0).optional(),
  penalty_deductions: z.number().min(0).optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const listSalaryStructuresSchema = z.object({
  employee_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const generateEmployeePayrollSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_ids: z.array(z.string().uuid()).optional(),
}).refine(v => v.period_start <= v.period_end, {
  message: 'period_start must not be after period_end',
  path: ['period_start'],
});

export const listEmployeePayrollSchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'approved', 'paid']).optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const payEmployeePayrollSchema = z.object({
  payment_reference: z.string().min(1).max(100),
});

export type UpsertSalaryStructureInput = z.infer<typeof upsertSalaryStructureSchema>;
export type UpdateSalaryStructureInput = z.infer<typeof updateSalaryStructureSchema>;
export type ListSalaryStructuresQuery = z.infer<typeof listSalaryStructuresSchema>;
export type GenerateEmployeePayrollInput = z.infer<typeof generateEmployeePayrollSchema>;
export type ListEmployeePayrollQuery = z.infer<typeof listEmployeePayrollSchema>;
