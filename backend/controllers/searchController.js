'use strict';
const Student = require('../models/Student');
const Teacher = require('../models/teacherSchema.js');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const schoolId = req.user.school._id;

    if (!q || q.trim().length < 2) {
      return res.json({ students: [], teachers: [], classes: [], subjects: [] });
    }

    const search = { $regex: q.trim(), $options: 'i' };
    const schoolFilter = { school: schoolId };

    const [students, teachers, classes, subjects] = await Promise.all([
      Student.find({ ...schoolFilter, $or: [{ firstName: search }, { lastName: search }, { admissionNumber: search }] }).limit(10),
      Teacher.find({ ...schoolFilter, $or: [{ firstName: search }, { lastName: search }] }).limit(10),
      Class.find({ ...schoolFilter, $or: [{ name: search }, { code: search }] }).limit(10),
      Subject.find({ ...schoolFilter, $or: [{ name: search }, { code: search }] }).limit(10),
    ]);

    res.json({
      students: students.map((s) => ({ id: s._id, name: `${s.firstName} ${s.lastName}`.trim(), admissionNumber: s.admissionNumber, type: 'student' })),
      teachers: teachers.map((t) => ({ id: t._id, name: `${t.firstName} ${t.lastName}`.trim(), type: 'teacher' })),
      classes: classes.map((c) => ({ id: c._id, name: c.name, code: c.code, type: 'class' })),
      subjects: subjects.map((s) => ({ id: s._id, name: s.name, code: s.code, type: 'subject' })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { globalSearch };
