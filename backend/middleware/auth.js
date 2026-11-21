'use strict';

const { verifyToken, getUserFromPayload } = require('../services/authService');

const AUTH_COOKIE = 'kips_auth';

/**
 * requireAuth — reads JWT from the HttpOnly signed cookie kips_auth.
 * Rejects with 401 if cookie is missing, invalid, or expired.
 * Rejects with 403 if the user account is inactive.
 *
 * The JWT is NEVER read from:
 *   - Authorization header
 *   - request body
 *   - query string
 *   - localStorage (that is a frontend concern — we simply do not issue it there)
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = req.signedCookies[AUTH_COOKIE];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    const user = await getUserFromPayload(payload);
    if (!user) {
      return res.status(403).json({ message: 'Account is not active' });
    }

    // Normalize school so req.user.school._id always works,
    // even when pg-odm populate returns a plain string instead of an object.
    if (user.school && typeof user.school === 'string') {
      user.school = { _id: user.school, toString: () => user.school };
    } else if (user.school && !user.school._id) {
      user.school._id = user.school.toString();
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, AUTH_COOKIE };
