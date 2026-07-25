import { Request, Response, NextFunction } from 'express';
import * as accountService from '../services/accountService';
import { createAccountSchema, updateAccountSchema } from '../validators/accounts';
import { sendSuccess } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAccountSchema.parse(req.body);
    const result = await accountService.createAccount(req.user!.tenantId, {
      code: input.code, name: input.name, type: input.type,
      parentAccountId: input.parent_account_id, isActive: input.is_active,
      description: input.description,
    });
    sendSuccess(res, result, 'Account created', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await accountService.listAccounts(req.user!.tenantId);
    sendSuccess(res, result, 'Accounts fetched');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAccountSchema.parse(req.body);
    const result = await accountService.updateAccount(req.user!.tenantId, req.params.id, {
      code: input.code, name: input.name, type: input.type,
      parentAccountId: input.parent_account_id, isActive: input.is_active,
      description: input.description,
    });
    sendSuccess(res, result, 'Account updated');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await accountService.getAccountDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Account detail fetched');
  } catch (err) { next(err); }
}
