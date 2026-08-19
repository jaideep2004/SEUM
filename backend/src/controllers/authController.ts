import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, ValidationError } from '../utils/errors';
import { config } from '../config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const COOKIE_ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 min
const COOKIE_REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  tenantId: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  roles: z.array(z.string()).min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const ipAddress = req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const result = await authService.loginUser(email, password, ipAddress, userAgent);

    res.cookie('access_token', result.tokens.accessToken, { ...COOKIE_OPTIONS, maxAge: COOKIE_ACCESS_MAX_AGE });
    res.cookie('refresh_token', result.tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: COOKIE_REFRESH_MAX_AGE });

    return sendSuccess(res, { user: result.user }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const { roles, tenantId } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');

      if (!isSuperAdmin && data.roles.includes('super_admin')) {
        return next(new ForbiddenError('Cannot assign the super_admin role'));
      }
      if (!isSuperAdmin && !tenantId) {
        return next(new ForbiddenError('No tenant context for user creation'));
      }
      if (isSuperAdmin && !data.tenantId) {
        return next(new ValidationError('tenantId is required'));
      }

      const user = await authService.registerUser(
        (isSuperAdmin ? data.tenantId : tenantId) as string,
        data.email,
        data.password,
        data.name,
        data.roles
      );
      return sendSuccess(res, user, 'User registered successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token || refreshSchema.parse(req.body).refreshToken;
    if (!refreshToken) throw new Error('Refresh token required');
    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('access_token', result.tokens.accessToken, { ...COOKIE_OPTIONS, maxAge: COOKIE_ACCESS_MAX_AGE });
    res.cookie('refresh_token', result.tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: COOKIE_REFRESH_MAX_AGE });

    return sendSuccess(res, { tokens: result.tokens }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await authService.logoutUser(req.user!.userId, refreshToken);
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    return sendSuccess(res, null, 'If the email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    return sendSuccess(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserProfile(req.user!.userId);
    return sendSuccess(res, user, 'User profile');
  } catch (err) {
    next(err);
  }
}
