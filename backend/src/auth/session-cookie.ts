import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = '__host.sid';

export function sessionCookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';
  if (process.env.FRONTEND_URL?.startsWith('https://') && !secure) {
    throw new Error('HTTPS deployments require COOKIE_SECURE=true');
  }
  return { path: '/', httpOnly: true, secure, sameSite: 'lax' };
}
