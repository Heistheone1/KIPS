'use strict';

const router = require('express').Router();
const { createSchool, getSchool, updateSchool, listSchools } = require('../controllers/schoolController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate, createSchoolSchema, updateSchoolSchema } = require('../validators/authValidators');

router.use(requireAuth);

// GET /api/schools — ADMIN only
router.get('/', requireRole('ADMIN'), listSchools);

// POST /api/schools — ADMIN only, CSRF protected
router.post('/', requireRole('ADMIN'), csrfProtect, validate(createSchoolSchema), createSchool);

// GET /api/schools/:schoolId
router.get('/:schoolId', getSchool);

// PUT /api/schools/:schoolId — ADMIN only, CSRF protected
router.put('/:schoolId', requireRole('ADMIN'), csrfProtect, validate(updateSchoolSchema), updateSchool);

module.exports = router;
