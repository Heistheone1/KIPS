'use strict';

const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');

/**
 * requireRole(...roles)
 * Allows only users whose role is in the provided list.
 * Must be used AFTER requireAuth.
 *
 * Example:
 *   router.delete('/users/:id', requireAuth, requireRole('ADMIN'), deleteUser);
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

/**
 * requireAnyRole(...roles)
 * Alias for requireRole — semantically clearer when listing multiple allowed roles.
 */
const requireAnyRole = (...roles) => requireRole(...roles);

/**
 * requireSchoolMatch
 * Ensures the authenticated user belongs to the same school as the resource being accessed.
 * Reads schoolId from req.params.schoolId or req.body.school or req.query.school.
 * Must be used AFTER requireAuth.
 *
 * ADMIN can bypass school scoping (full authority).
 */
const requireSchoolMatch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // ADMIN has full authority across the system
  if (req.user.role === 'ADMIN') return next();

  const resourceSchool =
    req.params.schoolId ||
    req.body.school ||
    req.query.school;

  if (!resourceSchool) return next();

  const userSchoolId = req.user.school._id || req.user.school;
  if (userSchoolId.toString() !== resourceSchool.toString()) {
    return res.status(403).json({ message: 'Access denied: school mismatch' });
  }

  next();
};

/**
 * requireSelf(paramName)
 * Ensures the authenticated user is operating on their own resource,
 * OR is an ADMIN or DOS.
 *
 * Example:
 *   router.put('/users/:userId', requireAuth, requireSelf('userId'), updateProfile);
 */
const requireSelf = (paramName = 'userId') => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const isPrivileged = ['ADMIN', 'DOS'].includes(req.user.role);
  const isSelf = req.params[paramName] === req.user._id.toString();

  if (!isPrivileged && !isSelf) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  next();
};

/**
 * requireClassTeacherClassAccess
 * Allows ADMIN/DOS full access. CLASS_TEACHER can only access students
 * enrolled in a class they are assigned to as class teacher (ACTIVE assignment).
 * Must be used AFTER requireAuth.
 */
const requireClassTeacherClassAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // ADMIN and DOS have full authority
  if (['ADMIN', 'DOS'].includes(req.user.role)) return next();

  // CLASS_TEACHER: must be assigned to the student's class
  if (req.user.role === 'CLASS_TEACHER') {
    const studentId = req.params.id || req.body.student;
    if (!studentId) return next();

    try {
      const enrollment = await Enrollment.findOne({ student: studentId, status: 'ACTIVE' });
      if (!enrollment) {
        return res.status(403).json({ message: 'Student is not enrolled in any active class' });
      }

      const assignment = await ClassTeacherAssignment.findOne({
        teacher: req.user._id,
        class: enrollment.class,
        status: 'ACTIVE',
      });

      if (!assignment) {
        return res.status(403).json({ message: 'You are not the class teacher for this student\'s class' });
      }

      return next();
    } catch (err) {
      return res.status(500).json({ message: 'Authorization check failed' });
    }
  }

  return res.status(403).json({ message: 'Insufficient permissions' });
};

module.exports = { requireRole, requireAnyRole, requireSchoolMatch, requireSelf, requireClassTeacherClassAccess };
