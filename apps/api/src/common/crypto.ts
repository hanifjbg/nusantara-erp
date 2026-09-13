import { createHash } from 'node:crypto';

/** SHA-256 hash untuk refresh token (yang disimpan di sessions.token_hash). */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  orgId: string | null;
  permissions: string[];
  type: 'access' | 'refresh';
  jti: string;
}
