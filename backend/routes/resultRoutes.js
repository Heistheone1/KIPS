'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate } = require('../validators/authValidators');
const {
  generateSubjectResultsSchema,
  generateTermResultsSchema,
  recalculateScopeSchema,
  listSubjectResultsSchema,
  listTermResultsSchema,
  snapshotHistorySchema,
  saveGradingScaleSchema,
  listGradingScalesSchema,
  resultStatusSchema,
} = require('../validators/resultValidators');

const resultCtrl = require('../controllers/resultController');

const ALL_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];
const MANAGE_ROLES = ['ADMIN', 'DOS'];

router.use(requireAuth);

// ─── Metadata ──────────────────────────────────────────────────────────────────
router.get('/results/meta', requireRole(...ALL_ROLES), resultCtrl.getResultMeta);

// ─── Authoritative generation (ADMIN/DOS only) ─────────────────────────────────
router.post('/results/subject/generate', requireRole(...MANAGE_ROLES), csrfProtect, validate(generateSubjectResultsSchema), resultCtrl.generateSubject);
router.post('/results/term/generate', requireRole(...MANAGE_ROLES), csrfProtect, validate(generateTermResultsSchema), resultCtrl.generateTerm);
router.post('/results/recalculate', requireRole(...MANAGE_ROLES), csrfProtect, validate(recalculateScopeSchema), resultCtrl.recalculate);

// ─── Reads (staff scope-filtered in controller) ───────────────────────────────
router.get('/results/subject', requireRole(...ALL_ROLES), validate(listSubjectResultsSchema, 'query'), resultCtrl.listSubjectResults);
router.get('/results/term', requireRole(...ALL_ROLES), validate(listTermResultsSchema, 'query'), resultCtrl.listTermResults);
router.get('/results/status', requireRole(...ALL_ROLES), validate(resultStatusSchema, 'query'), resultCtrl.getStatus);
router.get('/results/snapshots', requireRole(...ALL_ROLES), validate(snapshotHistorySchema, 'query'), resultCtrl.getSnapshots);

// ─── Grading scales ───────────────────────────────────────────────────────────
router.get('/results/grading-scale', requireRole(...ALL_ROLES), validate(listGradingScalesSchema, 'query'), resultCtrl.getGradingScale);
router.get('/results/grading-scales', requireRole(...ALL_ROLES), validate(listGradingScalesSchema, 'query'), resultCtrl.listGradingScales);
router.post('/results/grading-scale', requireRole(...MANAGE_ROLES), csrfProtect, validate(saveGradingScaleSchema), resultCtrl.saveGradingScale);

module.exports = router;
