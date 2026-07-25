import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as subscriptionPlanService from '../services/subscriptionPlanService';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const coerceNum = (min = 0) => z.coerce.number().min(min);
const coerceInt = (min = 1) => z.coerce.number().int().min(min);

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  tier: z.string().min(1, 'Plan tier is required'),
  priceMonthly: coerceNum(0),
  priceYearly: coerceNum(0),
  maxUsers: coerceInt(1),
  maxVehicles: coerceInt(1),
  maxStorageGb: coerceNum(0),
  features: z.array(z.string()).default([]),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  tier: z.string().min(1).optional(),
  priceMonthly: coerceNum(0).optional(),
  priceYearly: coerceNum(0).optional(),
  maxUsers: coerceInt(1).optional(),
  maxVehicles: coerceInt(1).optional(),
  maxStorageGb: coerceNum(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function listPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const plans = await subscriptionPlanService.listPlans(isActive);
    return sendSuccess(res, plans, 'Plans retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await subscriptionPlanService.getPlanById(req.params.id);
    if (!plan) {
      return next(new NotFoundError('Plan not found'));
    }
    return sendSuccess(res, plan, 'Plan retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await subscriptionPlanService.createPlan(req.body);
    return sendSuccess(res, plan, 'Plan created successfully', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await subscriptionPlanService.updatePlan(req.params.id, req.body);
    if (!plan) {
      return next(new NotFoundError('Plan not found'));
    }
    return sendSuccess(res, plan, 'Plan updated');
  } catch (err) {
    next(err);
  }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await subscriptionPlanService.softDeletePlan(req.params.id);
    if (!plan) {
      return next(new NotFoundError('Plan not found'));
    }
    return sendSuccess(res, plan, 'Plan deactivated');
  } catch (err) {
    next(err);
  }
}

export async function hardDeletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await subscriptionPlanService.hardDeletePlan(req.params.id);
    if (!deleted) {
      return next(new NotFoundError('Plan not found'));
    }
    return sendSuccess(res, null, 'Plan permanently deleted');
  } catch (err) {
    next(err);
  }
}
