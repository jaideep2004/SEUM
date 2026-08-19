import { z } from 'zod';

export const CONTRACT_TYPES = ['full_time', 'part_time', 'fixed_term', 'probation', 'internship', 'consultant', 'freelance'] as const;
export const CONTRACT_STATUSES = ['draft', 'active', 'expired', 'terminated'] as const;
export const DOCUMENT_TYPES = ['id_card', 'passport', 'visa', 'iqama', 'work_permit', 'license', 'insurance', 'academic', 'certificate', 'medical', 'bank', 'other'] as const;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional();
const uuidField = z.string().uuid();

export const createContractSchema = z.object({
  employee_id: uuidField,
  contract_type: z.enum(CONTRACT_TYPES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  salary: z.coerce.number().min(0).optional(),
  benefits: z.string().max(2000).optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
});

export const updateContractSchema = z.object({
  contract_type: z.enum(CONTRACT_TYPES).optional(),
  start_date: dateField,
  end_date: dateField,
  salary: z.coerce.number().min(0).optional(),
  benefits: z.string().max(2000).optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
});

export const listContractsQuerySchema = z.object({
  employee_id: uuidField.optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  expiring_within: z.coerce.number().int().min(0).max(365).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createDocumentSchema = z.object({
  employee_id: uuidField,
  document_type: z.enum(DOCUMENT_TYPES).optional(),
  number: z.string().max(100).optional(),
  issue_date: dateField,
  expiry_date: dateField,
  notes: z.string().max(1000).optional(),
});

export const updateDocumentSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES).optional(),
  number: z.string().max(100).optional(),
  issue_date: dateField,
  expiry_date: dateField,
  notes: z.string().max(1000).optional(),
});

export const listDocumentsQuerySchema = z.object({
  employee_id: uuidField.optional(),
  document_type: z.enum(DOCUMENT_TYPES).optional(),
  expiring_within: z.coerce.number().int().min(0).max(365).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const expiryAlertsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;