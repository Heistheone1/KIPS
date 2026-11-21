'use strict';

const User = require('../models/User');
const auditService = require('../services/auditService');

// ADMIN only: create a new user (DOS, CLASS_TEACHER, TEACHER)
// ADMIN accounts are created via a separate seeding/setup process — not via this endpoint
const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    // Always use the authenticated user's school — never trust client-supplied school
    const school = req.user.school._id || req.user.school;

    if (role === 'ADMIN') {
      return res.status(403).json({ message: 'ADMIN accounts cannot be created through this endpoint' });
    }

    const user = new User({
      school,
      firstName,
      lastName,
      email,
      phone,
      passwordHash: password,
      role,
      status: 'active',
    });

    await user.save();

    await auditService.log({
      actor: req.user,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      metadata: { email: user.email, role: user.role },
      req,
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ADMIN or DOS: list users in the same school
const listUsers = async (req, res, next) => {
  try {
    const schoolId = req.user.role === 'ADMIN'
      ? (req.query.school || req.user.school._id)
      : req.user.school._id;

    const users = await User.find({ school: schoolId }).select('-passwordHash');
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    next(err);
  }
};

// ADMIN or self: get a single user
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // School scope check for non-ADMIN
    if (req.user.role !== 'ADMIN' && user.school.toString() !== req.user.school._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ADMIN or self: update permitted fields only
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // School scope check for non-ADMIN
    if (req.user.role !== 'ADMIN' && user.school.toString() !== req.user.school._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Explicit whitelist — only these fields can be updated through this endpoint
    const { firstName, lastName, phone, status } = req.body;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    // Only ADMIN can change status
    if (status !== undefined && req.user.role === 'ADMIN') {
      user.status = status;
    }

    await user.save();

    await auditService.log({
      actor: req.user,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      metadata: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// Self: update own profile details (firstName, lastName, phone)
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { firstName, lastName, phone } = req.body;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    await auditService.log({
      actor: req.user,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: user._id,
      metadata: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// Self: change own password (requires current password verification)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await user.verifyPassword(currentPassword);
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword;
    await user.save();

    await auditService.log({
      actor: req.user,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id,
      metadata: {},
      req,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, listUsers, getUser, updateUser, updateProfile, changePassword };
