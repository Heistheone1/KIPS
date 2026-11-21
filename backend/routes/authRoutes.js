'use strict';

const router = require('express').Router();
const {
  loginController,
  logoutController,
  getMeController,
  csrfTokenController,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/security');
const { csrfProtect } = require('../middleware/csrf');
const { validate, loginSchema } = require('../validators/authValidators');

// GET /api/auth/csrf-token — issues a CSRF token (no auth required, GET is safe)
router.get('/csrf-token', csrfTokenController);

// POST /api/auth/login — rate limited, validated, CSRF exempt (no prior session)
router.post('/login', authRateLimiter, validate(loginSchema), loginController);

// POST /api/auth/logout — requires auth + CSRF
router.post('/logout', requireAuth, csrfProtect, logoutController);

// GET /api/auth/me — returns authenticated user from cookie
router.get('/me', requireAuth, getMeController);

module.exports = router;
