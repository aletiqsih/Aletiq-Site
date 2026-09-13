/**
 * Zero-dependency JWT implementation using Node.js built-in `crypto`.
 *
 * Implements HMAC-SHA256 (HS256) signing and verification.
 * Follows RFC 7519.
 */

import { createHmac } from 'crypto';

const ALGORITHM = 'HS256';

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(input: string): Buffer {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) {
    str += '=';
  }
  return Buffer.from(str, 'base64');
}

export interface InspectorJwtPayload {
  sub: string;
  badgeId: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
  jti: string;
}

export function signJwt(
  payload: Omit<InspectorJwtPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  expiresInSeconds = 8 * 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: InspectorJwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    jti: `${payload.sub}-${now}-${Math.random().toString(36).slice(2)}`,
  };
  const header = b64urlEncode(JSON.stringify({ alg: ALGORITHM, typ: 'JWT' }));
  const body = b64urlEncode(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${b64urlEncode(sig)}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: InspectorJwtPayload;
  reason?: string;
}

export function verifyJwt(token: string, secret: string): VerifyResult {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'Malformed token' };
    const [header, body, signature] = parts;
    const signingInput = `${header}.${body}`;
    const expectedSig = b64urlEncode(
      createHmac('sha256', secret).update(signingInput).digest()
    );
    if (expectedSig !== signature) return { valid: false, reason: 'Invalid signature' };
    const payload: InspectorJwtPayload = JSON.parse(b64urlDecode(body).toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return { valid: false, reason: 'Token expired' };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Token verification error' };
  }
}
