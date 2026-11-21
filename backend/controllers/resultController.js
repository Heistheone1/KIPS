'use strict';

const resultService = require('../services/resultService');
const auditService = require('../services/auditService');
const assessmentService = require('../services/assessmentService');
const { RANK_TIE_POLICIES, DEFAULT_RANK_TIE_POLICY, RESULT_TYPES, RESULT_STATUSES, CALCULATION_VERSION, MISSING_MARK_POLICIES, policyConfig } = require('../services/markEngine');

const ALL_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];
const MANAGE_ROLES = ['ADMIN', 'DOS'];

const isStaff = (role) => role === 'TEACHER' || role === 'CLASS_TEACHER';

/** Public metadata so React never hardcodes engine constants. */
const getResultMeta = (req, res) => {
  res.json({
    rankTiePolicies: RANK_TIE_POLICIES,
    defaultRankTiePolicy: DEFAULT_RANK_TIE_POLICY,
    resultTypes: RESULT_TYPES,
    resultStatuses: RESULT_STATUSES,
    calculationVersion: CALCULATION_VERSION,
    missingMarkPolicies: MISSING_MARK_POLICIES,
    defaultMissingPolicy: policyConfig.defaultMissingPolicy,
    defaultBands: resultService.DEFAULT_BANDS,
  });
};

// ─── Generation (authoritative; ADMIN/DOS only) ────────────────────────────

const generateSubject = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId, subject, missingPolicy } = req.body;
    const school = req.user.school._id;
    const out = await resultService.generateSubjectResults({ school, academicYear, term, class: classId, subject, missingPolicy, calculatedBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'RESULTS_GENERATED', entityType: 'SubjectResult', metadata: { scope: 'SUBJECT', term, class: classId, subject, academicYear, success: out.success, ...out.summary }, req });
    res.status(out.success ? 200 : 207).json({ ...out, message: out.success ? 'Subject results generated' : 'Subject results generated with per-student failures — inspect failures array' });
  } catch (err) { next(err); }
};

const generateTerm = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId, missingPolicy } = req.body;
    const school = req.user.school._id;
    const out = await resultService.generateTermResults({ school, academicYear, term, class: classId, missingPolicy, calculatedBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'RESULTS_GENERATED', entityType: 'TermResult', metadata: { scope: out.resultType, term, class: classId, academicYear, success: out.success, ...out.summary }, req });
    res.status(out.success ? 200 : 207).json({ ...out, message: out.success ? 'Term results generated' : 'Term results generated with per-student failures — inspect failures array' });
  } catch (err) { next(err); }
};

const recalculate = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId, subject } = req.body;
    const school = req.user.school._id;
    const out = await resultService.recalculateScope({ school, academicYear, term, class: classId, subject, calculatedBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'RESULTS_RECALCULATED', entityType: subject ? 'SubjectResult' : 'TermResult', metadata: { term, class: classId, subject: subject || null, academicYear, success: out.success, ...out.summary }, req });
    res.status(out.success ? 200 : 207).json(out);
  } catch (err) { next(err); }
};

// ─── Reads ────────────────────────────────────────────────────────────────
// TEACHER / CLASS_TEACHER see only assignment/class-teacher tuples, using the
// same scope model as assessments (no tuple-crossing).
const staffScopeFilter = async (req, rows) => {
  const scope = await assessmentService.getTeacherScope(req.user._id, req.user.school._id);
  return rows.filter((r) => assessmentService.matchesReadScope(scope, { academicYear: r.academicYear._id || r.academicYear, term: r.term._id || r.term, class: r.class._id || r.class, subject: r.subject ? (r.subject._id || r.subject) : null }));
};

const listSubjectResults = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    let docs = await resultService.listSubjectResults(school, req.query);
    if (isStaff(req.user.role)) docs = await staffScopeFilter(req, docs);
    res.json({ results: docs });
  } catch (err) { next(err); }
};

const listTermResults = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    let docs = await resultService.listTermResults(school, req.query);
    if (isStaff(req.user.role)) {
      // Term results have no subject — match class+year+term explicitly
      // (matchesReadScope requires a subject and would throw on null).
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      const covers = (a, y, t, c) =>
        a.academicYear.toString() === y && a.term.toString() === t && a.class.toString() === c;
      docs = docs.filter((r) => {
        const y = (r.academicYear._id || r.academicYear).toString();
        const t = (r.term._id || r.term).toString();
        const c = (r.class._id || r.class).toString();
        return scope.classTeaching.some((a) => covers(a, y, t, c))
          || scope.teaching.some((a) => covers(a, y, t, c));
      });
    }
    res.json({ results: docs });
  } catch (err) { next(err); }
};

const getStatus = async (req, res, next) => {
  try {
    const status = await resultService.resultStatus(req.user.school._id, req.query);
    res.json(status);
  } catch (err) { next(err); }
};

const getSnapshots = async (req, res, next) => {
  try {
    const snapshots = await resultService.snapshotHistory(req.user.school._id, req.query);
    res.json({ snapshots });
  } catch (err) { next(err); }
};

// ─── Grading scales (ADMIN/DOS) ───────────────────────────────────────────
const getGradingScale = async (req, res, next) => {
  try {
    const scale = await resultService.getGradingScale(req.user.school._id, req.query.academicYear);
    res.json({ scale: scale || { bands: resultService.DEFAULT_BANDS } });
  } catch (err) { next(err); }
};

const listGradingScales = async (req, res, next) => {
  try {
    const scales = await resultService.listGradingScales(req.user.school._id, req.query.academicYear);
    res.json({ scales });
  } catch (err) { next(err); }
};

const saveGradingScale = async (req, res, next) => {
  try {
    const { academicYear, name, bands } = req.body;
    const school = req.user.school._id;
    const scale = await resultService.saveGradingScale({ school, academicYear, name, bands, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'GRADING_SCALE_SAVED', entityType: 'GradingScale', entityId: scale._id, metadata: { academicYear, name: scale.name, bands: scale.bands.length }, req });
    res.status(201).json({ scale, message: 'Grading scale saved — existing results flagged stale for recalculation' });
  } catch (err) { next(err); }
};

module.exports = {
  getResultMeta, generateSubject, generateTerm, recalculate,
  listSubjectResults, listTermResults, getStatus, getSnapshots,
  getGradingScale, listGradingScales, saveGradingScale,
  ALL_ROLES, MANAGE_ROLES, isStaff,
};
