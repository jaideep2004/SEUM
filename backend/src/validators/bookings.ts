import { z } from 'zod';

const passengerSchema = z.object({
  passenger_name: z.string().min(1).max(255),
  id_number: z.string().max(100).optional(),
  seat_number: z.number().int().positive().optional(),
  age: z.number().int().positive().max(120).optional(),
  special_requirements: z.string().max(500).optional(),
});

export const CHANNELS = ['internal', 'excel', 'b2b_portal', 'b2c_website', 'cs_employee', 'whatsapp'] as const;
export type BookingChannel = typeof CHANNELS[number];

export const createBookingSchema = z.object({
  customer_id: z.string().uuid(),
  trip_id: z.string().uuid().nullable().optional(),
  seat_numbers: z.array(z.number().int().positive()).min(1).max(100).optional(),
  passengers: z.array(passengerSchema).max(100).optional(),
  total_amount: z.number().min(0).max(99999999.99),
  paid_amount: z.number().min(0).max(99999999.99).optional(),
  notes: z.string().max(2000).optional(),
  channel: z.enum(CHANNELS).optional(),
  pickup_location: z.string().max(255).optional(),
  destination_location: z.string().max(255).optional(),
  requested_date: z.string().optional(),
  requested_time: z.string().optional(),
  trip_type_requested: z.string().max(50).optional(),
});

export const updateBookingSchema = z.object({
  seat_numbers: z.array(z.number().int().positive()).min(1).max(100).optional(),
  passengers: z.array(passengerSchema).max(100).optional(),
  total_amount: z.number().min(0).max(99999999.99).optional(),
  paid_amount: z.number().min(0).max(99999999.99).optional(),
  notes: z.string().max(2000).optional(),
  invoice_reference: z.string().max(100).optional().nullable(),
  quotation_amount: z.number().min(0).max(99999999.99).optional().nullable(),
});

export const listBookingsQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  payment_status: z.string().optional(),
  channel: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const rejectBookingSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const joinWaitlistSchema = z.object({
  trip_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  number_of_passengers: z.number().int().positive().max(100),
});

export const listWaitlistQuerySchema = z.object({
  trip_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
export type ListWaitlistQuery = z.infer<typeof listWaitlistQuerySchema>;