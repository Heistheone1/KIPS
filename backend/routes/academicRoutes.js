'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireClassTeacherClassAccess } = require('../middleware/authorize');
const { csrfProtect } = require('../middleware/csrf');
const { validate } = require('../validators/authValidators');
const {
  createAcademicYearSchema, updateAcademicYearSchema,
  createTermSchema, updateTermSchema,
  createClassSchema, updateClassSchema,
  createStudentSchema, updateStudentSchema,
  createEnrollmentSchema, updateEnrollmentSchema,
  createSubjectSchema, updateSubjectSchema,
  createTeacherAssignmentSchema, updateTeacherAssignmentSchema,
  createClassTeacherAssignmentSchema, updateClassTeacherAssignmentSchema,
} = require('../validators/academicValidators');

const academicYearCtrl = require('../controllers/academicYearController');
const termCtrl = require('../controllers/termController');
const classCtrl = require('../controllers/classController');
const studentCtrl = require('../controllers/studentController');
const enrollmentCtrl = require('../controllers/enrollmentController');
const subjectCtrl = require('../controllers/subjectController');
const teacherAssignmentCtrl = require('../controllers/teacherAssignmentController');
const classTeacherAssignmentCtrl = require('../controllers/classTeacherAssignmentController');

router.use(requireAuth);

// ─── Academic Years ───────────────────────────────────────────────────────────
router.get('/academic-years', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), academicYearCtrl.listAcademicYears);
router.post('/academic-years', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createAcademicYearSchema), academicYearCtrl.createAcademicYear);
router.get('/academic-years/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), academicYearCtrl.getAcademicYear);
router.put('/academic-years/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateAcademicYearSchema), academicYearCtrl.updateAcademicYear);

// ─── Terms ────────────────────────────────────────────────────────────────────
router.get('/terms', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), termCtrl.listTerms);
router.post('/terms', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createTermSchema), termCtrl.createTerm);
router.get('/terms/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), termCtrl.getTerm);
router.put('/terms/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateTermSchema), termCtrl.updateTerm);

// ─── Classes ──────────────────────────────────────────────────────────────────
router.get('/classes', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), classCtrl.listClasses);
router.post('/classes', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createClassSchema), classCtrl.createClass);
router.post('/classes/bulk', requireRole('ADMIN', 'DOS'), csrfProtect, classCtrl.bulkCreateClasses);
router.get('/classes/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), classCtrl.getClass);
router.put('/classes/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateClassSchema), classCtrl.updateClass);
router.delete('/classes/:id', requireRole('ADMIN', 'DOS'), csrfProtect, classCtrl.deleteClass);

// ─── Students ─────────────────────────────────────────────────────────────────
router.get('/students', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), studentCtrl.listStudents);
router.post('/students', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createStudentSchema), studentCtrl.createStudent);
router.get('/students/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), studentCtrl.getStudent);
router.put('/students/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER'), csrfProtect, validate(updateStudentSchema), requireClassTeacherClassAccess, studentCtrl.updateStudent);
router.delete('/students/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER'), csrfProtect, requireClassTeacherClassAccess, studentCtrl.deleteStudent);

// ─── Enrollments ──────────────────────────────────────────────────────────────
router.get('/enrollments', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), enrollmentCtrl.listEnrollments);
router.post('/enrollments', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER'), csrfProtect, validate(createEnrollmentSchema), enrollmentCtrl.createEnrollment);
router.get('/enrollments/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), enrollmentCtrl.getEnrollment);
router.put('/enrollments/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER'), csrfProtect, validate(updateEnrollmentSchema), enrollmentCtrl.updateEnrollment);

// ─── Subjects ─────────────────────────────────────────────────────────────────
router.get('/subjects', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), subjectCtrl.listSubjects);
router.post('/subjects', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createSubjectSchema), subjectCtrl.createSubject);
router.get('/subjects/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), subjectCtrl.getSubject);
router.put('/subjects/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateSubjectSchema), subjectCtrl.updateSubject);

// ─── Teacher Assignments ──────────────────────────────────────────────────────
router.get('/teacher-assignments', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), teacherAssignmentCtrl.listTeacherAssignments);
router.post('/teacher-assignments', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createTeacherAssignmentSchema), teacherAssignmentCtrl.createTeacherAssignment);
router.get('/teacher-assignments/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), teacherAssignmentCtrl.getTeacherAssignment);
router.put('/teacher-assignments/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateTeacherAssignmentSchema), teacherAssignmentCtrl.updateTeacherAssignment);
router.delete('/teacher-assignments/:id', requireRole('ADMIN', 'DOS'), csrfProtect, teacherAssignmentCtrl.deleteTeacherAssignment);

// ─── Class Teacher Assignments ────────────────────────────────────────────────
router.get('/class-teacher-assignments', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), classTeacherAssignmentCtrl.listClassTeacherAssignments);
router.post('/class-teacher-assignments', requireRole('ADMIN', 'DOS'), csrfProtect, validate(createClassTeacherAssignmentSchema), classTeacherAssignmentCtrl.createClassTeacherAssignment);
router.get('/class-teacher-assignments/:id', requireRole('ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'), classTeacherAssignmentCtrl.getClassTeacherAssignment);
router.put('/class-teacher-assignments/:id', requireRole('ADMIN', 'DOS'), csrfProtect, validate(updateClassTeacherAssignmentSchema), classTeacherAssignmentCtrl.updateClassTeacherAssignment);

module.exports = router;
