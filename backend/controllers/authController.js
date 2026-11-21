'use strict';

const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { AUTH_COOKIE } = require('../middleware/auth');
const { ensureSecret, csrfTokenController } = require('../middleware/csrf');
const env = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  signed: true,
  // maxAge matches JWT expiry — 8 hours in ms
  maxAge: 8 * 60 * 60 * 1000,
};

const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    // Set JWT in HttpOnly signed cookie — never in response body
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);

    // Ensure CSRF secret cookie exists after login
    ensureSecret(req, res);

    await auditService.log({
      actor: user,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user._id,
      req,
    });

    // Return only safe user data — NO token in body
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    if (err.statusCode === 401) {
      await auditService.log({
        actor: null,
        action: 'LOGIN_FAILED',
        metadata: { email: req.body.email },
        req,
      });
    }
    next(err);
  }
};

const logoutController = async (req, res) => {
  // Clear the auth cookie
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    signed: true,
  });

  // Clear the CSRF secret cookie
  res.clearCookie('kips_csrf_secret', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    signed: true,
  });

  if (req.user) {
    await auditService.log({
      actor: req.user,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user._id,
      req,
    });
  }

  res.json({ message: 'Signed out successfully' });
};

const getMeController = async (req, res) => {
  const userData = req.user.toSafeObject
    ? req.user.toSafeObject()
    : {
        _id: req.user._id,
        school: req.user.school,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        status: req.user.status,
        lastLoginAt: req.user.lastLoginAt,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      };
  res.json({ user: userData });
};

module.exports = { loginController, logoutController, getMeController, csrfTokenController };
