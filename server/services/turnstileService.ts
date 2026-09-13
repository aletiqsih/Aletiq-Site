/**
 * Cloudflare Turnstile server-side verification service.
 *
 * SECURITY: The secret key is only read from process.env on the server.
 * It is never exported, returned in responses, or logged.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 6000; // 6 second network timeout

export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes: string[];
}

/**
 * Verify a Turnstile challenge token with Cloudflare Siteverify.
 *
 * @param token - The cf-turnstile-response token from the frontend
 * @param remoteip - Optional client IP for additional validation
 */
export async function verifyTurnstileToken(
  token: string,
  remoteip?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('[Turnstile] TURNSTILE_SECRET_KEY is not configured');
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token.trim(),
  });

  if (remoteip && remoteip !== 'unknown' && !remoteip.includes('127.0.0.1') && !remoteip.includes('::1')) {
    body.set('remoteip', remoteip);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);

  let cfResponse: Response;
  try {
    cfResponse = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (networkErr: any) {
    clearTimeout(timeoutId);
    if (networkErr?.name === 'AbortError') {
      console.error('[Turnstile] Cloudflare Siteverify request timed out after', SITEVERIFY_TIMEOUT_MS, 'ms');
      return { success: false, errorCodes: ['network-timeout'] };
    }
    console.error('[Turnstile] Network error reaching Cloudflare Siteverify:', networkErr?.message);
    return { success: false, errorCodes: ['network-error'] };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!cfResponse.ok) {
    console.error('[Turnstile] Cloudflare Siteverify returned HTTP', cfResponse.status);
    return { success: false, errorCodes: ['siteverify-http-error'] };
  }

  let cfData: any;
  try {
    cfData = await cfResponse.json();
  } catch {
    console.error('[Turnstile] Failed to parse Cloudflare Siteverify response');
    return { success: false, errorCodes: ['siteverify-parse-error'] };
  }

  return {
    success: Boolean(cfData.success),
    errorCodes: Array.isArray(cfData['error-codes']) ? cfData['error-codes'] : [],
  };
}
