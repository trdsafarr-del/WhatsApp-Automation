import crypto from 'node:crypto';
import type { Express, NextFunction, Request, Response } from 'express';

export const DASHBOARD_COOKIE_NAME = 'op_dash_session';
export const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function getConfiguredDashboardPasscode(): string {
  const envPass = (process.env.DASHBOARD_PASSCODE || '').trim();
  return envPass || '5060';
}

export function getDashboardSigningSecret(): string {
  const baseSecret =
    (process.env.DASHBOARD_AUTH_SECRET || '').trim() ||
    (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim() ||
    (process.env.SHOPIFY_CLIENT_SECRET || '').trim() ||
    'orderpulse-broomies-dash-hmac-v1';
  // Mix configured passcode hash so changing DASHBOARD_PASSCODE invalidates prior sessions
  return crypto
    .createHash('sha256')
    .update(`${baseSecret}:${getConfiguredDashboardPasscode()}`, 'utf8')
    .digest('hex');
}

export function verifyPasscodeMatch(submitted: string, expected: string): boolean {
  const cleanSubmitted = String(submitted || '').trim();
  const cleanExpected = String(expected || '').trim();
  if (!cleanSubmitted || !cleanExpected) return false;
  const submittedDigest = crypto.createHash('sha256').update(cleanSubmitted, 'utf8').digest();
  const expectedDigest = crypto.createHash('sha256').update(cleanExpected, 'utf8').digest();
  return crypto.timingSafeEqual(submittedDigest, expectedDigest);
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64').toString('utf8');
}

export function createDashboardSessionToken(
  signingSecret: string,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
  nowMs = Date.now()
): string {
  const payload = {
    v: 1,
    iat: nowMs,
    exp: nowMs + Math.max(60, ttlSeconds) * 1000,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', signingSecret).update(encodedPayload, 'utf8').digest();
  return `${encodedPayload}.${toBase64Url(sig)}`;
}

export function verifyDashboardSessionToken(
  token: string | undefined,
  signingSecret: string,
  nowMs = Date.now()
): boolean {
  const raw = String(token || '').trim();
  if (!raw) return false;
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0 || dotIdx === raw.length - 1) return false;

  const encodedPayload = raw.slice(0, dotIdx);
  const encodedSig = raw.slice(dotIdx + 1);
  if (!encodedPayload || !encodedSig) return false;

  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', signingSecret).update(encodedPayload, 'utf8').digest()
  );
  const sigBuf = Buffer.from(encodedSig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as { v?: number; exp?: number };
    if (parsed.v !== 1 || typeof parsed.exp !== 'number') return false;
    return parsed.exp > nowMs;
  } catch {
    return false;
  }
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
  targetName: string
): string {
  if (!cookieHeader) return '';
  const pairs = cookieHeader.split(';');
  for (const part of pairs) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === targetName) {
      const val = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return '';
}

/**
 * Only storefront widgets, Shopify App Proxy pages/sitemaps, Shopify webhooks,
 * health monitors, and auth endpoints bypass the admin dashboard password gate.
 */
export function isPublicApiPath(pathname: string): boolean {
  const clean = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/api/health') return true;
  if (clean === '/api/auth/status' || clean === '/api/auth/login' || clean === '/api/auth/logout') {
    return true;
  }
  if (clean.startsWith('/api/webhooks/shopify/')) return true;
  if (clean === '/api/shopify-proxy' || clean.startsWith('/api/shopify-proxy/')) return true;
  if (
    clean === '/api/storefront/widget.js' ||
    clean === '/api/storefront/auto-pincode' ||
    clean === '/api/storefront/reverse-pincode' ||
    clean === '/api/storefront/pincode-check' ||
    clean === '/api/storefront/preview'
  ) {
    return true;
  }
  return false;
}

function extractRequestDashboardToken(req: Request): string {
  const headerToken = req.get('x-dashboard-token')?.trim();
  if (headerToken) return headerToken;

  const authHeader = req.get('authorization')?.trim() || '';
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  return parseCookieHeader(req.headers.cookie, DASHBOARD_COOKIE_NAME);
}

function buildSessionCookieString(token: string, maxAgeSeconds: number, isHttps: boolean): string {
  const parts = [
    `${DASHBOARD_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.max(0, maxAgeSeconds)}`,
  ];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

function isRequestHttps(req: Request): boolean {
  if (req.secure) return true;
  const fwd = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return fwd.includes('https');
}

export function extractPasscodeFromBody(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as { passcode?: unknown; password?: unknown };
        const val = parsed.passcode ?? parsed.password;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).trim();
        }
      } catch {
        return '';
      }
    }
    return '';
  }
  if (typeof body === 'object') {
    const record = body as { passcode?: unknown; password?: unknown };
    const val = record.passcode ?? record.password;
    if (typeof val === 'string' || typeof val === 'number') {
      return String(val).trim();
    }
  }
  return '';
}

export function registerDashboardAuth(app: Express): void {
  app.set('trust proxy', 1);

  // Status check (always public)
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const token = extractRequestDashboardToken(req);
    const authenticated = verifyDashboardSessionToken(token, getDashboardSigningSecret());
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, authenticated });
  });

  // Unlock with dashboard password
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const submitted = extractPasscodeFromBody(req.body);
    const expected = getConfiguredDashboardPasscode();

    if (!verifyPasscodeMatch(submitted, expected)) {
      // Gentle constant delay on wrong password to slow brute force without disrupting legitimate login
      await new Promise((r) => setTimeout(r, 350));
      res.status(401).json({
        ok: false,
        error: 'Incorrect password. Please try again.',
      });
      return;
    }

    const token = createDashboardSessionToken(getDashboardSigningSecret());
    res.setHeader(
      'Set-Cookie',
      buildSessionCookieString(token, DEFAULT_SESSION_TTL_SECONDS, isRequestHttps(req))
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, authenticated: true, token });
  });

  // Lock dashboard session
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.setHeader('Set-Cookie', buildSessionCookieString('', 0, isRequestHttps(req)));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, authenticated: false });
  });

  // Global guard for all protected /api/* routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api/') && req.path !== '/api') {
      next();
      return;
    }
    if (req.method === 'OPTIONS' || isPublicApiPath(req.path)) {
      next();
      return;
    }
    const token = extractRequestDashboardToken(req);
    if (!verifyDashboardSessionToken(token, getDashboardSigningSecret())) {
      res.status(401).json({
        ok: false,
        authRequired: true,
        error: 'Dashboard locked. Enter password to unlock.',
      });
      return;
    }
    next();
  });
}
