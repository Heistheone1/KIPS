'use strict';

const School = require('../models/School');
const auditService = require('../services/auditService');

const createSchool = async (req, res, next) => {
  try {
    const { name, code, email, phone, address, logoUrl } = req.body;

    const school = new School({ name, code, email, phone, address, logoUrl });
    await school.save();

    await auditService.log({
      actor: req.user,
      action: 'SCHOOL_CREATED',
      entityType: 'School',
      entityId: school._id,
      metadata: { name: school.name, code: school.code },
      req,
    });

    res.status(201).json({ school });
  } catch (err) {
    next(err);
  }
};

const getSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    // School scoping: a user may only read their OWN school's record.
    // Multi-tenant isolation — no role (including ADMIN) may read another
    // school's contact details by guessing an id. Returns 404 (not 403) so
    // the existence of other schools is not leaked.
    if (school._id.toString() !== req.user.school._id.toString()) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json({ school });
  } catch (err) {
    next(err);
  }
};

const updateSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    // Explicit whitelist
    const { name, email, phone, address, logoUrl, status, reportHeader } = req.body;
    if (name !== undefined) school.name = name;
    if (email !== undefined) school.email = email;
    if (phone !== undefined) school.phone = phone;
    if (address !== undefined) school.address = address;
    if (logoUrl !== undefined) school.logoUrl = logoUrl;
    if (status !== undefined) school.status = status;
    if (reportHeader !== undefined) school.reportHeader = { ...(school.reportHeader || {}), ...reportHeader };

    await school.save();

    await auditService.log({
      actor: req.user,
      action: 'SCHOOL_UPDATED',
      entityType: 'School',
      entityId: school._id,
      metadata: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({ school });
  } catch (err) {
    next(err);
  }
};

const listSchools = async (req, res, next) => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json({ schools });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSchool, getSchool, updateSchool, listSchools };
