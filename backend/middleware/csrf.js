'use strict';

const Tokens = require('csrf');
const env = require('../config/env');

const tokens = new Tokens();

const CSRF_COOKIE = 'kips_csrf';
const CSRF_HEADER = 'x-csrf-token';

// Methods that require CSRF validation
const PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Paths exempt from CSRF (login does not require a prior session cookie)
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/health',
]);

/**
 * csrfMiddleware
 *
 * Strategy: Signed double-submit cookie.
 *
 * On every request:
 *   - If no CSRF secret cookie exists, create one (signed, HttpOnly=false so
 *     the frontend can read the token derived from it — but the SECRET itself
 *     is HttpOnly via the signed cookie mechanism).
 *
 * Actually we use the standard csrf library approach:
 *   - A secret is stored in a signed HttpOnly cookie (kips_csrf_secret).
 *   - A token is generated from that secret and sent to the client via a
 *     non-HttpOnly cookie (kips_csrf) so the frontend JS can read it.
 *   - On state-changing requests the frontend sends the token in the
 *     X-CSRF-Token header.
 *   - The middleware verifies the header token against the secret cookie.
 *
 * GET /api/auth/csrf-token endpoint issues a fresh token.
 */

const CSRF_SECRET_COOKIE = 'kips_csrf_secret';

/**
 * Ensure the CSRF secret cookie exists and return the secret.
 */
const ensureSecret = (req, res) => {
  let secret = req.signedCookies[CSRF_SECRET_COOKIE];
  if (!secret) {
    secret = tokens.secretSync();
    res.cookie(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      signed: true,
    });
  }
  return secret;
};

/**
 * GET /api/auth/csrf-token
 * Issues a CSRF token the frontend must include in X-CSRF-Token header
 * for all state-changing requests.
 */
const csrfTokenController = (req, res) => {
  const secret = ensureSecret(req, res);
  const token = tokens.create(secret);
  res.json({ csrfToken: token });
};

/**
 * csrfProtect middleware
 * Applied to all state-changing routes.
 * Exempt paths (login) skip validation.
 */
const csrfProtect = (req, res, next) => {
  if (!PROTECTED_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  const secret = req.signedCookies[CSRF_SECRET_COOKIE];
  if (!secret) {
    return res.status(403).json({ message: 'CSRF validation failed: no session' });
  }

  const token = req.headers[CSRF_HEADER];
  if (!token) {
    return res.status(403).json({ message: 'CSRF validation failed: missing token' });
  }

  if (!tokens.verify(secret, token)) {
    return res.status(403).json({ message: 'CSRF validation failed: invalid token' });
  }

  next();
};

module.exports = { csrfProtect, csrfTokenController, ensureSecret };
