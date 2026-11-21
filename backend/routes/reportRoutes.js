'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate } = require('../validators/authValidators');
const {
  generateReportsSchema,
  reportIdParamSchema,
  reportVersionParamSchema,
  reportTransitionSchema,
  reportInvalidateSchema,
  listReportsSchema,
  generatePeriodReportsSchema,
} = require('../validators/reportValidators');

const reportCtrl = require('../controllers/reportController');

const ALL_ROLES = reportCtrl.ALL_ROLES;
const GENERATE_ROLES = reportCtrl.GENERATE_ROLES;
const REVIEW_ROLES = reportCtrl.REVIEW_ROLES;
const APPROVE_PUBLISH_ROLES = reportCtrl.APPROVE_PUBLISH_ROLES;

router.use(requireAuth);

// ─── Reads (staff scope-filtered in controller) ────────────────────────────
router.get('/reports', requireRole(...ALL_ROLES), validate(listReportsSchema, 'query'), reportCtrl.listReports);
router.get('/reports/:id/versions', requireRole(...ALL_ROLES), validate(reportIdParamSchema, 'params'), reportCtrl.getReportVersions);
router.get('/reports/:id/versions/:version', requireRole(...ALL_ROLES), validate(reportVersionParamSchema, 'params'), reportCtrl.getReportVersion);
router.get('/reports/:id', requireRole(...ALL_ROLES), validate(reportIdParamSchema, 'params'), reportCtrl.getReport);

// ─── Generation (ADMIN/DOS only) ───────────────────────────────────────────
router.post('/reports/generate', requireRole(...GENERATE_ROLES), csrfProtect, validate(generateReportsSchema), reportCtrl.generate);

// ─── Period/CAT Generation (ADMIN/DOS only) ─────────────────────────────────
router.post('/reports/generate-period', requireRole(...GENERATE_ROLES), csrfProtect, validate(generatePeriodReportsSchema), reportCtrl.generatePeriod);

// ─── Lifecycle: GENERATED → REVIEWED → APPROVED → PUBLISHED ────────────────
router.post('/reports/:id/review', requireRole(...REVIEW_ROLES), csrfProtect, validate(reportIdParamSchema, 'params'), validate(reportTransitionSchema), reportCtrl.transition('review'));
router.post('/reports/:id/approve', requireRole(...APPROVE_PUBLISH_ROLES), csrfProtect, validate(reportIdParamSchema, 'params'), validate(reportTransitionSchema), reportCtrl.transition('approve'));
router.post('/reports/:id/publish', requireRole(...APPROVE_PUBLISH_ROLES), csrfProtect, validate(reportIdParamSchema, 'params'), reportCtrl.transition('publish'));

// ─── Invalidation (ADMIN/DOS only) ─────────────────────────────────────────
router.post('/reports/:id/invalidate', requireRole(...APPROVE_PUBLISH_ROLES), csrfProtect, validate(reportIdParamSchema, 'params'), validate(reportInvalidateSchema), reportCtrl.invalidate);

module.exports = router;
