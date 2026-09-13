import type { Request } from 'express';

/** IP + user-agent request untuk audit/login history (jangan percaya body). */
export function reqMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ??
    req.socket.remoteAddress ??
    null;
  return { ip, userAgent: req.headers['user-agent'] ?? null };
}
