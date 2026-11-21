'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const Class = require('./models/Class');
const Enrollment = require('./models/Enrollment');
const Student = require('./models/Student');

(async () => {
  await odm.connect();
  
  // Classes for year 2025-2026
  const classes2526 = await Class.find({ academicYear: '6939fa2c0947070c3b7f37bc' });
  console.log('Classes for 2025-2026:', classes2526.length);
  classes2526.forEach(c => console.log('  -', c.name, c.code, c._id));
  
  // Classes for year 2026-2027
  const classes2627 = await Class.find({ academicYear: 'd6a97c56442836857850017c' });
  console.log('\nClasses for 2026-2027:', classes2627.length);
  classes2627.forEach(c => console.log('  -', c.name, c.code, c._id));
  
  // Enrollments for student P1-001
  const student = await Student.findOne({ admissionNumber: 'P1-001' });
  console.log('\nStudent P1-001:', student ? student._id : 'NOT FOUND');
  if (student) {
    const enrollments = await Enrollment.find({ student: student._id });
    console.log('Enrollments:', enrollments.length);
    enrollments.forEach(e => console.log('  - class:', e.class, 'year:', e.academicYear, 'status:', e.status));
  }
  
  await odm.disconnect();
})();
