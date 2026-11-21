'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate } = require('../validators/authValidators');
const {
  createAssessmentSchema,
  updateAssessmentSchema,
  recordMarkSchema,
  bulkRecordMarksSchema,
} = require('../validators/assessmentValidators');

const assessmentCtrl = require('../controllers/assessmentController');
const markCtrl = require('../controllers/assessmentMarkController');

const ALL_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];
const WRITE_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];

router.use(requireAuth);

// ─── Assessments ──────────────────────────────────────────────────────────────
router.get('/assessments/meta', requireRole(...ALL_ROLES), assessmentCtrl.getAssessmentMeta);
router.get('/assessments', requireRole(...ALL_ROLES), assessmentCtrl.listAssessments);
router.post('/assessments', requireRole(...WRITE_ROLES), csrfProtect, validate(createAssessmentSchema), assessmentCtrl.createAssessment);
router.get('/assessments/:id', requireRole(...ALL_ROLES), assessmentCtrl.getAssessment);
router.put('/assessments/:id', requireRole(...WRITE_ROLES), csrfProtect, validate(updateAssessmentSchema), assessmentCtrl.updateAssessment);

// ─── Assessment Marks ─────────────────────────────────────────────────────────
router.get('/assessment-marks', requireRole(...ALL_ROLES), markCtrl.listMarks);
router.post('/assessment-marks', requireRole(...WRITE_ROLES), csrfProtect, validate(recordMarkSchema), markCtrl.recordMark);
router.post('/assessment-marks/bulk', requireRole(...WRITE_ROLES), csrfProtect, validate(bulkRecordMarksSchema), markCtrl.bulkRecordMarks);
router.get('/assessment-marks/:id', requireRole(...ALL_ROLES), markCtrl.getMark);
router.get('/assessment-marks/:id/history', requireRole(...ALL_ROLES), markCtrl.getMarkHistory);

// ─── Mark Corrections (read-only — corrections are created via mark updates) ──
router.get('/mark-corrections/assessment/:assessmentId', requireRole('ADMIN', 'DOS'), markCtrl.getCorrectionsByAssessment);

module.exports = router;
