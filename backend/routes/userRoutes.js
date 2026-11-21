'use strict';

const router = require('express').Router();
const { createUser, listUsers, getUser, updateUser, updateProfile, changePassword } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireSelf } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate, createUserSchema, updateUserSchema, updateProfileSchema, changePasswordSchema } = require('../validators/authValidators');

router.use(requireAuth);

// POST /api/users — ADMIN only, CSRF protected
router.post('/', requireRole('ADMIN'), csrfProtect, validate(createUserSchema), createUser);

// GET /api/users — ADMIN or DOS
router.get('/', requireRole('ADMIN', 'DOS'), listUsers);

// GET /api/users/:userId — ADMIN, DOS, or self
router.get('/:userId', requireSelf('userId'), getUser);

// PUT /api/users/:userId — ADMIN or self, CSRF protected
router.put('/:userId', requireSelf('userId'), csrfProtect, validate(updateUserSchema), updateUser);

// PUT /api/users/me/profile — self only, CSRF protected
router.put('/me/profile', requireAuth, csrfProtect, validate(updateProfileSchema), updateProfile);

// PUT /api/users/me/password — self only, CSRF protected
router.put('/me/password', requireAuth, csrfProtect, validate(changePasswordSchema), changePassword);

module.exports = router;
