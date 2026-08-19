import { z } from 'zod';

export const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required').max(255),
  code: z.string().min(1, 'Route code is required').max(50),
  origin: z.string().min(1, 'Origin is required').max(255),
  destination: z.string().min(1, 'Destination is required').max(255),
  distanceKm: z.number().positive().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
  routeType: z.enum(['regular', 'hajj', 'umrah', 'charter', 'shuttle']).default('regular'),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
});

export const updateRouteSchema = createRouteSchema.partial();

export const createStopSchema = z.object({
  stopName: z.string().min(1, 'Stop name is required').max(255),
  stopOrder: z.number().int().min(0),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimatedArrivalMinutes: z.number().int().positive().optional(),
});

export const routeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  routeType: z.enum(['regular', 'hajj', 'umrah', 'charter', 'shuttle']).optional(),
  search: z.string().optional(),
});

// ─── Trips ───
export const TRIP_TYPES = ['single', 'round'] as const;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

export const tripLegSchema = z.object({
  origin: z.string().min(1, 'Leg origin is required').max(255),
  destination: z.string().min(1, 'Leg destination is required').max(255),
  legDate: z.string().regex(DATE_REGEX, 'Leg date must be YYYY-MM-DD'),
  departureTime: z.string().regex(TIME_REGEX, 'Invalid departure time').optional(),
  arrivalTime: z.string().regex(TIME_REGEX, 'Invalid arrival time').optional(),
  overnightFlag: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const flightSchema = z.object({
  flightNo: z.string().max(50).optional(),
  airline: z.string().max(100).optional(),
  from: z.string().max(255).optional(),
  to: z.string().max(255).optional(),
  date: z.string().regex(DATE_REGEX).optional(),
  time: z.string().regex(TIME_REGEX).optional(),
});

export const hotelSchema = z.object({
  city: z.string().max(255).optional(),
  hotel: z.string().max(255).optional(),
  from: z.string().regex(DATE_REGEX).optional(),
  to: z.string().regex(DATE_REGEX).optional(),
});

export const manifestSchema = z.object({
  tripTitle: z.string().max(255).optional(),
  vehicleType: z.string().max(100).optional(),
  groupLeader: z.string().max(255).optional(),
  groupLeaderNo: z.string().max(50).optional(),
  nationality: z.string().max(100).optional(),
  agent: z.string().max(255).optional(),
  groupNo: z.string().max(50).optional(),
  noOfPax: z.number().int().min(0).optional(),
  nusukInfo: z.record(z.unknown()).optional(),
  flights: z.array(flightSchema).optional(),
  hotels: z.array(hotelSchema).optional(),
});

export const createTripSchemaBase = manifestSchema.extend({
  routeId: z.string().min(1, 'Route is required').optional(),
  busId: z.string().min(1, 'Bus is required').optional(),
  driverId: z.string().optional(),
  tripType: z.enum(TRIP_TYPES).default('single'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  scheduledStartTime: z.string().min(1, 'Start time is required'),
  scheduledEndTime: z.string().optional(),
  legs: z.array(tripLegSchema).optional(),
  notes: z.string().max(1000).optional(),
});

export const createTripSchema = createTripSchemaBase.refine(v => v.tripType !== 'round' || (v.legs && v.legs.length >= 2), {
  message: 'Round trips require at least 2 legs (stops with dates)',
  path: ['legs'],
});

export const updateTripSchema = createTripSchemaBase.partial().omit({ routeId: true, busId: true }).refine(
  v => v.tripType !== 'round' || (v.legs !== undefined && v.legs.length >= 2),
  { message: 'Round trips require at least 2 legs (stops with dates)', path: ['legs'] }
);

export const delayTripSchema = z.object({
  delayMinutes: z.number().int().positive('Delay must be positive'),
  delayReason: z.string().min(1, 'Delay reason is required').max(500),
  estimatedNewEndTime: z.string().optional(),
});

export const cancelTripSchema = z.object({
  rejectionReason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export const tripQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['scheduled', 'en_route', 'completed', 'cancelled', 'delayed']).optional(),
  tripType: z.enum(TRIP_TYPES).optional(),
  busId: z.string().optional(),
  routeId: z.string().optional(),
  driverId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export const addPassengerSchema = z.object({
  passengerName: z.string().min(1, 'Passenger name is required').max(255),
  passengerIdNumber: z.string().max(100).optional(),
  contactNumber: z.string().max(50).optional(),
  seatNumber: z.string().max(20).optional(),
  bookingReference: z.string().max(100).optional(),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type CreateStopInput = z.infer<typeof createStopSchema>;
export type RouteQuery = z.infer<typeof routeQuerySchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type DelayTripInput = z.infer<typeof delayTripSchema>;
export type CancelTripInput = z.infer<typeof cancelTripSchema>;
export type TripQuery = z.infer<typeof tripQuerySchema>;
export type AddPassengerInput = z.infer<typeof addPassengerSchema>;

// ─── Driver Assignment ───
export const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
});

export const confirmTripSchema = z.object({
  confirmationStatus: z.enum(['accepted', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export const driverScheduleQuerySchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type ConfirmTripInput = z.infer<typeof confirmTripSchema>;
export type DriverScheduleQuery = z.infer<typeof driverScheduleQuerySchema>;

// ─── Recurring Trip Patterns ───
export const patternLegSchema = z.object({
  origin: z.string().min(1, 'Leg origin is required').max(255),
  destination: z.string().min(1, 'Leg destination is required').max(255),
  dayOffset: z.number().int().min(0).default(0),
  departureTime: z.string().regex(TIME_REGEX, 'Invalid departure time').optional(),
  arrivalTime: z.string().regex(TIME_REGEX, 'Invalid arrival time').optional(),
  overnightFlag: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const createRecurringTripPatternSchemaBase = manifestSchema.extend({
  routeId: z.string().min(1, 'Route is required').optional(),
  busId: z.string().optional(),
  driverId: z.string().optional(),
  tripType: z.enum(TRIP_TYPES).default('single'),
  frequency: z.enum(['daily', 'weekdays', 'weekends', 'custom_days']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  scheduledStartTime: z.string().min(1, 'Start time is required'),
  scheduledEndTime: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  specificDates: z.array(z.string()).optional(),
  legs: z.array(patternLegSchema).optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const createRecurringTripPatternSchema = createRecurringTripPatternSchemaBase.refine(v => v.tripType !== 'round' || (v.legs && v.legs.length >= 2), {
  message: 'Round trip patterns require at least 2 legs',
  path: ['legs'],
});

export const updateRecurringTripPatternSchema = createRecurringTripPatternSchemaBase.partial();

export const recurringTripPatternQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  frequency: z.enum(['daily', 'weekdays', 'weekends', 'custom_days']).optional(),
  search: z.string().optional(),
});

export const generateTripsSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export type CreateRecurringTripPatternInput = z.infer<typeof createRecurringTripPatternSchema>;
export type UpdateRecurringTripPatternInput = z.infer<typeof updateRecurringTripPatternSchema>;
export type RecurringTripPatternQuery = z.infer<typeof recurringTripPatternQuerySchema>;
export type GenerateTripsInput = z.infer<typeof generateTripsSchema>;
