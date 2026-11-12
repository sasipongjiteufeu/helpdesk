import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must contain at least 32 random characters');
  }
  return randomBytes(48).toString('hex');
}

/** Browser mutations must originate from the configured application. CORS alone is insufficient. */
export function originProtection(frontendUrl: string) {
  const allowed = new URL(frontendUrl).origin;
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    let origin = req.get('origin');
    if (!origin && req.get('referer')) {
      try { origin = new URL(req.get('referer')!).origin; } catch { /* Reject below. */ }
    }
    if (origin !== allowed) return res.status(403).json({ message: 'Untrusted request origin' });
    return next();
  };
}
