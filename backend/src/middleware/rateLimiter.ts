import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();

if (!process.env.VERCEL) {
  const CLEANUP_INTERVAL = 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipLimits) {
      if (entry.resetAt <= now) ipLimits.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

export function rateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = ipLimits.get(ip);

    if (!entry || entry.resetAt <= now) {
      ipLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return _res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        },
      });
    }

    next();
  };
}

export function strictAuthRateLimit() {
  return rateLimit(60_000, 10);
}
