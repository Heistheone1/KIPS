'use strict';

const crypto = require('crypto');

/**
 * markEngine.js — Authoritative Mark Calculation Service
 *
 * This is the SINGLE SOURCE OF TRUTH for all academic mark calculations.
 * No other module (controller, route, React, PDF) should duplicate these calculations.
 *
 * Missing-mark policies:
 *   ZERO    — missing mark contributes 0 to calculations
 *   MINIMUM — missing mark contributes MISSING_MINIMUM_VALUE
 *   PENDING — missing marks make the result incomplete (cannot be finalized)
 *
 * Precision:
 *   All intermediate calculations use full floating-point precision.
 *   Rounding is applied ONLY at the final display/output stage.
 *   Never round intermediate values before passing them to the next calculation.
 */

const MISSING_MARK_POLICIES = ['ZERO', 'MINIMUM', 'PENDING'];

// ─── Centralised configuration ────────────────────────────────────────────────
// All missing-mark / correction policy values live HERE and nowhere else.
// Never hardcode 0.1, 'ZERO', or reason rules anywhere else in the codebase.

const parsePolicy = (value, fallback) =>
  MISSING_MARK_POLICIES.includes(value) ? value : fallback;

const parseNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// policyConfig is exported so tests (and future admin configuration) can
// temporarily override it. Always restore after mutating.
const policyConfig = {
  // The value used when policy = MINIMUM (env override: MARK_MISSING_MINIMUM).
  missingMinimum: parseNumber(process.env.MARK_MISSING_MINIMUM, 0.1),
  // Default missing-mark policy (env override: MARK_MISSING_POLICY).
  defaultMissingPolicy: parsePolicy(process.env.MARK_MISSING_POLICY, 'ZERO'),
  // When true, correcting an existing mark requires a reason
  // (env override: MARK_REASON_REQUIRED=true).
  requireCorrectionReason: process.env.MARK_REASON_REQUIRED === 'true',
};

// Backwards-compatible constants — always read from policyConfig.
const MISSING_MINIMUM_VALUE = policyConfig.missingMinimum;
const DEFAULT_MISSING_POLICY = policyConfig.defaultMissingPolicy;

// Display precision for final output (decimal places)
const DISPLAY_PRECISION = 2;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a raw score against an assessment's maxMarks.
 * Returns { valid: true } or { valid: false, message: string }.
 */
const validateMark = (score, maxMarks) => {
  if (typeof maxMarks !== 'number' || maxMarks <= 0) {
    return { valid: false, message: 'Assessment maxMarks must be a positive number' };
  }
  if (typeof score !== 'number') {
    return { valid: false, message: 'Score must be a number' };
  }
  if (score < 0) {
    return { valid: false, message: `Score cannot be negative (got ${score})` };
  }
  if (score > maxMarks) {
    return { valid: false, message: `Score ${score} exceeds maxMarks ${maxMarks}` };
  }
  return { valid: true };
};

/**
 * Validate that assessment weights in a collection sum to a valid total.
 * For a given class+term+subject, weights should sum to <= 100.
 * Returns { valid: true } or { valid: false, message: string }.
 */
const validateAssessmentWeights = (assessments) => {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return { valid: true, total: 0 };
  }
  const total = assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
  if (total > 100) {
    return {
      valid: false,
      message: `Assessment weights sum to ${roundForDisplay(total)}%, which exceeds 100%`,
      total,
    };
  }
  return { valid: true, total };
};

// ─── Core Calculations ────────────────────────────────────────────────────────

/**
 * Resolve a mark value according to the missing-mark policy.
 * Returns the numeric value to use in calculations, or null if PENDING.
 *
 * @param {object} markRecord  - { score, entered } from AssessmentMark
 * @param {string} policy      - 'ZERO' | 'MINIMUM' | 'PENDING'
 * @returns {number|null}
 */
const resolveMissingMark = (markRecord, policy) => {
  // Mark has been explicitly entered — use the actual score (including real zero).
  // NEVER treat score 0 as missing: `entered` is the only source of truth.
  if (markRecord && markRecord.entered === true) {
    return markRecord.score;
  }

  const effectivePolicy = policy || policyConfig.defaultMissingPolicy;

  // Mark is missing — apply policy
  switch (effectivePolicy) {
    case 'ZERO':
      return 0;
    case 'MINIMUM':
      return policyConfig.missingMinimum;
    case 'PENDING':
      return null; // Signals that result cannot be finalized
    default:
      return 0;
  }
};

/**
 * Normalize a raw mark payload into the canonical stored shape.
 * Ensures missing marks always store score = null and real zeros keep score = 0.
 *
 * @param {*} score       - raw score from input
 * @param {*} entered     - raw entered flag from input
 * @returns {{ score: number|null, entered: boolean }}
 */
const normalizeMark = (score, entered) => {
  if (entered === true) {
    const numeric = typeof score === 'string' ? Number(score) : score;
    if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
      throw new Error('Score must be a number when entered is true');
    }
    return { score: numeric, entered: true };
  }
  // Missing mark — never store 0 for a missing mark
  return { score: null, entered: false };
};

/**
 * Calculate the percentage score for a single mark.
 * Returns full precision float.
 *
 * @param {number} score
 * @param {number} maxMarks
 * @returns {number} percentage (0–100)
 */
const calculatePercentage = (score, maxMarks) => {
  if (maxMarks <= 0) return 0;
  return (score / maxMarks) * 100;
};

/**
 * Calculate the weighted contribution of an assessment to a subject total.
 * Returns full precision float.
 *
 * Example:
 *   score = 40, maxMarks = 50 → percentage = 80%
 *   weight = 20 → contribution = 80% * 20% = 16 (out of 100)
 *
 * @param {number} score
 * @param {number} maxMarks
 * @param {number} weight  - assessment weight as a percentage (0–100)
 * @returns {number}
 */
const calculateAssessmentContribution = (score, maxMarks, weight) => {
  const percentage = calculatePercentage(score, maxMarks);
  return (percentage * weight) / 100;
};

/**
 * Calculate the total subject score from an array of assessment marks.
 * Returns { total, isPending, assessmentResults }.
 *
 * @param {Array}  assessments  - array of { assessment: { maxMarks, weight }, mark: { score, entered } }
 * @param {string} missingPolicy
 * @returns {{ total: number, isPending: boolean, assessmentResults: Array }}
 */
const calculateSubjectTotal = (assessments, missingPolicy) => {
  const policy = missingPolicy || policyConfig.defaultMissingPolicy;
  let total = 0;
  let isPending = false;
  const assessmentResults = [];

  for (const item of assessments) {
    const { assessment, mark } = item;
    const resolvedScore = resolveMissingMark(mark, policy);

    if (resolvedScore === null) {
      isPending = true;
      assessmentResults.push({
        assessmentId: assessment._id,
        score: null,
        maxMarks: assessment.maxMarks,
        weight: assessment.weight,
        percentage: null,
        contribution: null,
        missing: true,
        pending: true,
      });
      continue;
    }

    const percentage = calculatePercentage(resolvedScore, assessment.maxMarks);
    const contribution = calculateAssessmentContribution(resolvedScore, assessment.maxMarks, assessment.weight);
    total += contribution;

    assessmentResults.push({
      assessmentId: assessment._id,
      score: resolvedScore,
      maxMarks: assessment.maxMarks,
      weight: assessment.weight,
      percentage,
      contribution,
      missing: !(mark && mark.entered === true),
      pending: false,
    });
  }

  return { total, isPending, assessmentResults };
};

/**
 * Calculate the average across multiple subject totals.
 * Returns full precision float.
 *
 * @param {number[]} subjectTotals
 * @returns {number}
 */
const calculateTermAverage = (subjectTotals) => {
  const valid = subjectTotals.filter((t) => typeof t === 'number' && !isNaN(t));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, t) => sum + t, 0) / valid.length;
};

/**
 * Calculate the average percentage achieved across a student's assessments
 * in one subject (unweighted mean of assessment percentages).
 * Pending assessments are excluded under PENDING policy; a real zero counts.
 * Returns full precision float, or null when no usable data exists.
 *
 * @param {Array}  assessments - array of { assessment: { maxMarks }, mark: { score, entered } }
 * @param {string} missingPolicy
 * @returns {number|null}
 */
const calculateSubjectAverage = (assessments, missingPolicy) => {
  const policy = missingPolicy || policyConfig.defaultMissingPolicy;
  const percentages = [];

  for (const item of assessments) {
    const resolved = resolveMissingMark(item.mark, policy);
    if (resolved === null) continue; // PENDING — excluded from average
    percentages.push(calculatePercentage(resolved, item.assessment.maxMarks));
  }

  if (percentages.length === 0) return null;
  return percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
};

/**
 * Determine a grade from a percentage score.
 * Grade boundaries are configurable — this default is a starting point.
 *
 * @param {number} percentage
 * @returns {string}
 */
const determineGrade = (percentage) => {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

/**
 * Calculate class statistics for an assessment.
 * Returns { count, entered, missing, highest, lowest, average, passCount, passRate }.
 *
 * @param {Array} marks  - array of { score, entered } from AssessmentMark
 * @param {number} maxMarks
 * @param {number} passThreshold  - percentage to pass (default 50)
 * @returns {object}
 */
const calculateClassStatistics = (marks, maxMarks, passThreshold = 50) => {
  const enteredMarks = marks.filter((m) => m.entered === true);
  const scores = enteredMarks.map((m) => m.score);

  if (scores.length === 0) {
    return {
      count: marks.length,
      entered: 0,
      missing: marks.length,
      highest: null,
      lowest: null,
      average: null,
      passCount: 0,
      passRate: null,
    };
  }

  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const average = scores.reduce((s, v) => s + v, 0) / scores.length;
  const passCount = scores.filter((s) => calculatePercentage(s, maxMarks) >= passThreshold).length;

  return {
    count: marks.length,
    entered: enteredMarks.length,
    missing: marks.length - enteredMarks.length,
    highest,
    lowest,
    average,
    passCount,
    passRate: (passCount / scores.length) * 100,
  };
};
// ─── Phase 4 — Result, Grading & Ranking primitives ───────────────────────────
//
// These functions are PURE. They take already-loaded values (never query the
// database) so the result service can stay a thin orchestrator and there is
// exactly one place where result mathematics lives.

// Ranking tie policy — COMPETITION (1,1,3) is the single documented default.
const RANK_TIE_POLICIES = ['COMPETITION', 'DENSE', 'NONE'];
const DEFAULT_RANK_TIE_POLICY = 'COMPETITION';

// Result scopes. TERM = single term, CUMULATIVE = terms 1..n (n not last),
// ANNUAL = every configured term of the academic year.
const RESULT_TYPES = ['TERM', 'CUMULATIVE', 'ANNUAL'];

// Calculation status of a derived result.
const RESULT_STATUSES = ['COMPLETE', 'INCOMPLETE'];

// Bump when the mathematics or the persisted shape changes so historical
// snapshots remain interpretable.
const CALCULATION_VERSION = 1;

const GRADE_SCALE_MIN = 0;
const GRADE_SCALE_MAX = 100;

/**
 * Validate a configurable grading scale.
 *
 * Rules (all enforced, never silently normalised):
 *   - at least one band is required
 *   - every band needs a unique non-empty grade label
 *   - minPercentage < maxPercentage, both within 0..100
 *   - bands must not overlap. Adjacency IS allowed and is unambiguous because
 *     boundary behaviour is documented as "lower bound inclusive, upper bound
 *     exclusive" (a band whose maxPercentage is 100 is inclusive at 100).
 *
 * Gaps between bands are permitted but are NOT silently filled: a percentage
 * that lands in a gap resolves to null (see resolveGrade) and the owning result
 * is reported with grade = null so the gap is visible instead of hidden.
 *
 * @param {Array<{grade:string,minPercentage:number,maxPercentage:number,remark?:string}>} bands
 * @returns {{valid:true,bands:Array}|{valid:false,message:string}}
 */
const validateGradeBands = (bands) => {
  if (!Array.isArray(bands) || bands.length === 0) {
    return { valid: false, message: 'At least one grade band is required' };
  }

  const seen = new Set();
  for (const b of bands) {
    if (!b || typeof b.grade !== 'string' || !b.grade.trim()) {
      return { valid: false, message: 'Every grade band requires a non-empty grade label' };
    }
    const min = Number(b.minPercentage);
    const max = Number(b.maxPercentage);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { valid: false, message: `Grade "${b.grade}" requires numeric min and max percentages` };
    }
    if (min < GRADE_SCALE_MIN || max > GRADE_SCALE_MAX) {
      return {
        valid: false,
        message: `Grade "${b.grade}" percentages must be between ${GRADE_SCALE_MIN} and ${GRADE_SCALE_MAX}`,
      };
    }
    if (min >= max) {
      return { valid: false, message: `Grade "${b.grade}" min percentage must be less than max percentage` };
    }
    const key = b.grade.trim().toUpperCase();
    if (seen.has(key)) {
      return { valid: false, message: `Duplicate grade label: ${key}` };
    }
    seen.add(key);
  }

  const sorted = [...bands]
    .map((b) => ({ ...b, minPercentage: Number(b.minPercentage), maxPercentage: Number(b.maxPercentage) }))
    .sort((a, b) => a.minPercentage - b.minPercentage);

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].minPercentage < sorted[i - 1].maxPercentage) {
      return {
        valid: false,
        message: `Grade bands "${sorted[i - 1].grade}" and "${sorted[i].grade}" overlap — boundaries must not overlap`,
      };
    }
  }

  return { valid: true, bands: sorted };
};



/**
 * resolveGrade(percentage, bands) — deterministic grade lookup.
 * Lower bound INCLUSIVE, upper bound EXCLUSIVE; max 100 inclusive at 100.
 * Gaps resolve to null (never silently filled). Null/NaN/out-of-range -> null.
 */
const resolveGrade = (percentage, bands) => {
  if (typeof percentage !== 'number' || isNaN(percentage)) return { grade: null, remark: null };
  if (percentage < GRADE_SCALE_MIN || percentage > GRADE_SCALE_MAX) return { grade: null, remark: null };
  if (!Array.isArray(bands)) return { grade: null, remark: null };
  for (const b of bands) {
    const min = Number(b.minPercentage);
    const max = Number(b.maxPercentage);
    const inBand = percentage >= min && (percentage < max || (max === GRADE_SCALE_MAX && percentage === GRADE_SCALE_MAX));
    if (inBand) return { grade: b.grade, remark: b.remark || null };
  }
  return { grade: null, remark: null };
};

/**
 * aggregateSubjectValues(values, missingPolicy) — mean of UNROUNDED subject values.
 * PENDING: any null makes the aggregate INCOMPLETE. ZERO/MINIMUM: nulls excluded.
 */
const aggregateSubjectValues = (values, missingPolicy) => {
  const policy = missingPolicy || policyConfig.defaultMissingPolicy;
  const list = Array.isArray(values) ? values : [];
  const usable = list.filter((v) => typeof v === 'number' && !isNaN(v));
  if (policy === 'PENDING' && usable.length !== list.length) {
    return { average: null, status: 'INCOMPLETE', counted: usable.length, total: list.length };
  }
  if (usable.length === 0) {
    return { average: null, status: 'INCOMPLETE', counted: 0, total: list.length };
  }
  const average = usable.reduce((sum, v) => sum + v, 0) / usable.length;
  return { average, status: 'COMPLETE', counted: usable.length, total: list.length };
};

/**
 * assignRanks(rows, tiePolicy) — deterministic COMPETITION ranking (1,1,3 default).
 * Equal UNROUNDED averages share a rank; ties break by student id string compare.
 * Ineligible rows are never ranked. NEVER pass rounded display values.
 */
const assignRanks = (rows, tiePolicy) => {
  const policy = RANK_TIE_POLICIES.includes(tiePolicy) ? tiePolicy : DEFAULT_RANK_TIE_POLICY;
  const result = new Map();
  if (!Array.isArray(rows)) return result;
  if (policy === 'NONE') {
    for (const r of rows) result.set(r.student.toString(), null);
    return result;
  }
  const eligible = rows
    .filter((r) => r.eligible === true && typeof r.average === 'number' && !isNaN(r.average))
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.student.toString().localeCompare(b.student.toString());
    });
  let position = 0;
  let denseRank = 0;
  let prevAverage = null;
  let competitionRank = 0;
  for (const row of eligible) {
    position += 1;
    if (prevAverage === null || row.average !== prevAverage) {
      denseRank += 1;
      competitionRank = position;
      prevAverage = row.average;
    }
    result.set(row.student.toString(), policy === 'DENSE' ? denseRank : competitionRank);
  }
  for (const r of rows) {
    if (!result.has(r.student.toString())) result.set(r.student.toString(), null);
  }
  return result;
};

/**
 * hashResultConfig(parts) — sha1 of every input affecting a computed result.
 */
const hashResultConfig = (parts) => crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex');

// Display Rounding ─────────────────────────────────────────────────────────

/**
 * Round a value for display output only.
 * Never use this during intermediate calculations.
 *
 * @param {number|null} value
 * @param {number} precision
 * @returns {number|null}
 */
const roundForDisplay = (value, precision = DISPLAY_PRECISION) => {
  if (value === null || value === undefined || isNaN(value)) return null;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

module.exports = {
  // Constants
  MISSING_MARK_POLICIES,
  MISSING_MINIMUM_VALUE,
  DEFAULT_MISSING_POLICY,
  DISPLAY_PRECISION,
  policyConfig,

  // Validation
  validateMark,
  validateAssessmentWeights,

  // Core calculations
  normalizeMark,
  resolveMissingMark,
  calculatePercentage,
  calculateAssessmentContribution,
  calculateSubjectTotal,
  calculateSubjectAverage,
  calculateTermAverage,
  determineGrade,
  calculateClassStatistics,

  // Display
  resolveGrade,
  aggregateSubjectValues,
  assignRanks,
  hashResultConfig,
  RANK_TIE_POLICIES,
  DEFAULT_RANK_TIE_POLICY,
  RESULT_TYPES,
  RESULT_STATUSES,
  CALCULATION_VERSION,
  GRADE_SCALE_MIN,
  GRADE_SCALE_MAX,
  validateGradeBands,

  // Display
  roundForDisplay,
};
