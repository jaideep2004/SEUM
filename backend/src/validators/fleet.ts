import { z } from 'zod';

export const createBusSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required').max(50),
  chassisNumber: z.string().max(100).optional(),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.number().int().min(1990, 'Year must be 1990 or later').max(2030),
  capacitySeated: z.number().int().positive('Seated capacity must be positive'),
  capacityStanding: z.number().int().min(0).default(0),
  color: z.string().max(50).optional(),
  vin: z.string().max(100).optional(),
  engineNumber: z.string().max(100).optional(),
  fuelType: z.enum(['diesel', 'petrol', 'electric', 'hybrid', 'cng']).default('diesel'),
  status: z.enum(['active', 'maintenance', 'retired', 'sold']).default('active'),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  assignedDepot: z.string().max(255).optional(),
});

export const updateBusSchema = createBusSchema.partial();

export const listBusesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'maintenance', 'retired', 'sold']).optional(),
  depot: z.string().optional(),
  search: z.string().optional(),
});

// ─── Vehicle Documents ───
export const createDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required').max(100),
  documentNumber: z.string().max(100).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'expired', 'archived']).default('active'),
});

export const updateDocumentSchema = createDocumentSchema.partial();

// ─── Readiness ───
export const updateReadinessSchema = z.object({
  busId: z.string().min(1, 'Bus ID is required'),
  status: z.enum(['ready', 'in_maintenance', 'out_of_service', 'reserved']),
  notes: z.string().max(500).optional(),
  nextScheduledMaintenanceKm: z.number().int().positive().optional(),
  nextScheduledMaintenanceDate: z.string().optional(),
});

export const readinessQuerySchema = z.object({
  status: z.enum(['ready', 'in_maintenance', 'out_of_service', 'reserved']).optional(),
});

// ─── Fuel Tracking ───
export const createFuelLogSchema = z.object({
  busId: z.string().min(1, 'Bus ID is required'),
  date: z.string().optional(),
  liters: z.number().positive('Liters must be positive'),
  costPerLiter: z.number().positive('Cost per liter must be positive'),
  totalCost: z.number().positive('Total cost must be positive'),
  odometerReading: z.number().int().positive().optional(),
  stationName: z.string().max(255).optional(),
  fuelType: z.enum(['diesel', 'petrol', 'electric', 'hybrid', 'cng']).default('diesel'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  filledBy: z.string().optional(),
});

export const fuelLogQuerySchema = z.object({
  busId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Assignments ───
export const createAssignmentSchema = z.object({
  busId: z.string().min(1, 'Bus ID is required'),
  routeName: z.string().max(255).optional(),
  depotName: z.string().max(255).optional(),
  driverId: z.string().optional(),
  driverName: z.string().max(255).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
  notes: z.string().max(500).optional(),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().omit({ busId: true });

export const assignmentQuerySchema = z.object({
  busId: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const calendarQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  busId: z.string().optional(),
});

export type CreateBusInput = z.infer<typeof createBusSchema>;
export type UpdateBusInput = z.infer<typeof updateBusSchema>;
export type ListBusesQuery = z.infer<typeof listBusesQuerySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type UpdateReadinessInput = z.infer<typeof updateReadinessSchema>;
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
export type FuelLogQuery = z.infer<typeof fuelLogQuerySchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
