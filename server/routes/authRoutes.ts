/**
 * Aletiq Inspector Authentication Routes
 *
 * POST /api/auth/inspector-login
 *   - Verifies Cloudflare Turnstile token (server-side)
 *   - Validates inspector credentials (scrypt / bootstrap mode)
 *   - Returns a signed JWT on success
 *
 * Security:
 *   - TURNSTILE_SECRET_KEY is read from process.env only -- never sent to client
 *   - JWT_SECRET is read from process.env only -- never sent to client
 *   - IP-based in-memory rate limiting (5 attempts / 60 seconds / IP)
 *   - Generic error messages to avoid user enumeration
 */

import { Router, Request, Response } from 'express';
import { verifyTurnstileToken } from '../services/turnstileService';
import { findInspector, validateInspectorPassword } from '../data/inspectorRegistry';
import { signJwt } from '../utils/jwtUtil';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// In-memory rate limiter: max 5 attempts per IP per 60 seconds
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || entry.resetAt <= now) {
    // First attempt or window expired -- start fresh
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  loginAttempts.set(ip, entry);
  return { allowed: true, retryAfterMs: 0 };
}

// Purge stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (entry.resetAt <= now) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// POST /api/auth/inspector-login
// ---------------------------------------------------------------------------

authRouter.post('/inspector-login', async (req: Request, res: Response) => {
  // Extract client IP
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  // 1. Rate limit check
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      error: `Too many login attempts. Please wait ${retryAfterSec} seconds before trying again.`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  // 2. Parse request body
  const { identifier, password, turnstileToken, rememberMe } = req.body as {
    identifier?: string;
    password?: string;
    turnstileToken?: string;
    rememberMe?: boolean;
  };

  // 3. Input validation
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Inspector ID or official email is required.',
      field: 'identifier',
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Password is required.',
      field: 'password',
    });
  }

  if (!turnstileToken || typeof turnstileToken !== 'string' || !turnstileToken.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Security verification (CAPTCHA) is required. Please complete the challenge.',
      field: 'turnstileToken',
    });
  }

  // 4. Turnstile Siteverify (server-side -- secret never leaves backend)
  const turnstileResult = await verifyTurnstileToken(turnstileToken.trim(), clientIp);

  if (!turnstileResult.success) {
    const errorCodes = turnstileResult.errorCodes;
    console.warn('[Auth] Turnstile verification failed:', errorCodes, '| IP:', clientIp);

    // Check for specific error types
    if (errorCodes.includes('timeout-or-duplicate')) {
      return res.status(400).json({
        success: false,
        error: 'Security challenge expired or was already used. Please refresh the CAPTCHA and try again.',
        turnstileError: true,
      });
    }

    if (errorCodes.includes('network-error') || errorCodes.includes('siteverify-http-error')) {
      return res.status(503).json({
        success: false,
        error: 'Security verification service is temporarily unavailable. Please try again in a moment.',
        turnstileError: true,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Security verification failed. Please complete the challenge and try again.',
      turnstileError: true,
    });
  }

  // 5. Inspector credential validation
  const account = findInspector(identifier.trim());

  // Generic error -- do not reveal whether identifier exists
  const INVALID_CREDENTIALS_MSG = 'Invalid Inspector ID or password. Please verify your credentials.';

  if (!account) {
    console.warn('[Auth] Login attempt for unknown identifier:', identifier.substring(0, 30), '| IP:', clientIp);
    return res.status(401).json({ success: false, error: INVALID_CREDENTIALS_MSG });
  }

  const passwordValid = validateInspectorPassword(account, password);
  if (!passwordValid) {
    console.warn('[Auth] Invalid password for inspector:', account.id, '| IP:', clientIp);
    return res.status(401).json({ success: false, error: INVALID_CREDENTIALS_MSG });
  }

  // 6. JWT issuance
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET is not configured -- cannot issue session token');
    return res.status(500).json({
      success: false,
      error: 'Authentication service is not properly configured. Please contact your system administrator.',
    });
  }

  const sessionDurationSeconds = rememberMe ? 7 * 24 * 60 * 60 : 8 * 60 * 60;
  const token = signJwt(
    {
      sub: account.id,
      badgeId: account.badgeId,
      name: account.name,
      role: account.role,
    },
    jwtSecret,
    sessionDurationSeconds
  );

  const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000).toISOString();

  // 7. Build response user object (NO passwordHash, NO sensitive fields)
  const responseUser = {
    id: account.id,
    badgeId: account.badgeId,
    name: account.name,
    designation: account.designation,
    department: account.department,
    zone: account.zone,
    email: account.email,
    phone: account.phone,
    role: account.role,
    jurisdiction: account.jurisdiction,
    activeSince: account.activeSince,
    lastLogin: new Date().toISOString(),
  };

  console.log('[Auth] Successful inspector login:', account.id, account.badgeId, '| IP:', clientIp);

  return res.status(200).json({
    success: true,
    user: responseUser,
    token,
    expiresAt,
    rememberMe: Boolean(rememberMe),
  });
});
