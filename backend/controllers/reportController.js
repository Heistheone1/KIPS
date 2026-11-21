'use strict';

const reportService = require('../services/reportService');
const auditService = require('../services/auditService');
const assessmentService = require('../services/assessmentService');

const ALL_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];
const GENERATE_ROLES = ['ADMIN', 'DOS'];
// Review may be performed by the class teacher of the report's class;
// approval and publication are management duties (ADMIN/DOS only).
const REVIEW_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER'];
const APPROVE_PUBLISH_ROLES = ['ADMIN', 'DOS'];

const isStaff = (role) => role === 'TEACHER' || role === 'CLASS_TEACHER';

/**
 * Staff scope filter for report lists: TEACHER sees reports only for
 * (year, term, class) tuples where they hold an active teaching assignment;
 * CLASS_TEACHER additionally sees their assigned class tuples. Reports are
 * class-level, so subject-level assignments grant class-window read access
 * exactly like term-result reads.
 */
const staffScopeFilter = async (req, cards) => {
  const scope = await assessmentService.getTeacherScope(req.user._id, req.user.school._id);
  const covers = (a, y, t, c) =>
    a.academicYear.toString() === y && a.term.toString() === t && a.class.toString() === c;
  return cards.filter((r) => {
    const y = (r.academicYear._id || r.academicYear).toString();
    const t = (r.term._id || r.term).toString();
    const c = (r.class._id || r.class).toString();
    return scope.classTeaching.some((a) => covers(a, y, t, c))
      || scope.teaching.some((a) => covers(a, y, t, c));
  });
};

/** Single-report access check for staff (IDOR protection beyond school scope). */
const assertStaffCanAccess = async (req, card) => {
  if (!isStaff(req.user.role)) return;
  const scope = await assessmentService.getTeacherScope(req.user._id, req.user.school._id);
  // Cards from getReportDetail are fully populated — unwrap refs to ids.
  const idOf = (v) => (v && v._id ? v._id.toString() : v.toString());
  const y = idOf(card.academicYear);
  const t = idOf(card.term);
  const c = idOf(card.class);
  const covers = (a) => idOf(a.academicYear) === y && idOf(a.term) === t && idOf(a.class) === c;
  const allowed = scope.classTeaching.some(covers) || scope.teaching.some(covers);
  if (!allowed) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }
};

// ─── Reads ─────────────────────────────────────────────────────────────────
const listReports = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    let cards = await reportService.listReports(school, req.query);
    if (isStaff(req.user.role)) cards = await staffScopeFilter(req, cards);
    res.json({ reports: cards });
  } catch (err) { next(err); }
};

const getReport = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { card, version } = await reportService.getReportDetail(req.params.id, school);
    await assertStaffCanAccess(req, card);
    res.json({ report: card, version });
  } catch (err) { next(err); }
};

const getReportVersion = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { card, version } = await reportService.getReportVersion(req.params.id, req.params.version, school);
    await assertStaffCanAccess(req, card);
    res.json({ report: card, version });
  } catch (err) { next(err); }
};

const getReportVersions = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const versions = await reportService.listVersions(req.params.id, school);
    res.json({ versions });
  } catch (err) { next(err); }
};

// ─── Generation (ADMIN/DOS only) ───────────────────────────────────────────
const generate = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId } = req.body;
    const school = req.user.school._id;
    const out = await reportService.generateReports({ school, academicYear, term, class: classId, generatedBy: req.user._id });
    await auditService.log({
      actor: req.user, action: 'REPORT_GENERATED', entityType: 'ReportCard',
      metadata: { term, class: classId, academicYear, resultType: out.resultType, success: out.success, ...out.summary },
      req,
    });
    res.status(out.success ? 200 : 207).json({
      ...out,
      message: out.success
        ? `Reports generated (${out.resultType}) for ${out.summary.succeeded} student(s)`
        : `Generated with ${out.failures.length} failure(s) — inspect the failures array`,
    });
  } catch (err) { next(err); }
};

// ─── Period/CAT Generation (ADMIN/DOS only) ─────────────────────────────────
const generatePeriod = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId, catAssessment, periodType = 'CAT' } = req.body;
    const school = req.user.school._id;
    const out = await reportService.generatePeriodReports({ school, academicYear, term, class: classId, catAssessment, periodType, generatedBy: req.user._id });
    await auditService.log({
      actor: req.user, action: 'PERIOD_REPORT_GENERATED', entityType: 'ReportCard',
      metadata: { term, class: classId, academicYear, catAssessment, periodType, resultType: out.resultType, success: out.success, ...out.summary },
      req,
    });
    res.status(out.success ? 200 : 207).json({
      ...out,
      message: out.success
        ? `Period reports generated (${out.periodType}) for ${out.summary.succeeded} student(s)`
        : `Generated with ${out.failures.length} failure(s) — inspect the failures array`,
    });
  } catch (err) { next(err); }
};

// ─── Lifecycle transitions ────────────────────────────────────────────────
const TRANSITION_AUDIT = { review: 'REPORT_REVIEWED', approve: 'REPORT_APPROVED', publish: 'REPORT_PUBLISHED' };

const transition = (action) => async (req, res, next) => {
  try {
    const school = req.user.school._id;
    // CLASS_TEACHER may only act on reports within their assigned class scope
    if (req.user.role === 'CLASS_TEACHER') {
      const { card } = await reportService.getReportDetail(req.params.id, school);
      await assertStaffCanAccess(req, card);
    }
    const { card, version, republished } = await reportService.transition({
      reportId: req.params.id,
      action,
      actor: req.user._id,
      school,
      note: req.body?.note || null,
    });
    await auditService.log({
      actor: req.user, action: TRANSITION_AUDIT[action], entityType: 'ReportCard',
      entityId: card._id,
      metadata: {
        version: version.version, student: card.student, class: card.class,
        term: card.term, academicYear: card.academicYear, republished,
      },
      req,
    });
    if (action === 'publish' && republished) {
      await auditService.log({
        actor: req.user, action: 'REPORT_REPUBLISHED', entityType: 'ReportCard',
        entityId: card._id,
        metadata: { version: version.version, student: card.student, class: card.class, term: card.term },
        req,
      });
    }
    res.json({ report: card, version, message: `Report ${action}d successfully` });
  } catch (err) { next(err); }
};

const invalidate = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const card = await reportService.invalidate({
      reportId: req.params.id, school, actor: req.user._id, reason: req.body?.reason || null,
    });
    await auditService.log({
      actor: req.user, action: 'REPORT_INVALIDATED', entityType: 'ReportCard',
      entityId: card._id,
      metadata: { student: card.student, class: card.class, term: card.term, academicYear: card.academicYear, reason: req.body?.reason || null },
      req,
    });
    res.json({ report: card, message: 'Report invalidated — regenerate, review and approve a new version before publishing' });
  } catch (err) { next(err); }
};

module.exports = {
  listReports, getReport, getReportVersion, getReportVersions,
  generate, generatePeriod, transition, invalidate,
  ALL_ROLES, GENERATE_ROLES, REVIEW_ROLES, APPROVE_PUBLISH_ROLES, isStaff,
};

