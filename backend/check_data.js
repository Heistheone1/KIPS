'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const School = require('./models/School');
const AcademicYear = require('./models/AcademicYear');
const Term = require('./models/Term');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Student = require('./models/Student');

(async () => {
  await odm.connect();
  const school = await School.findOne({ code: 'KIPS' });
  console.log('School:', school ? school.name : 'NOT FOUND', school ? school._id : '');
  
  const years = await AcademicYear.find({ school: school._id });
  console.log('Academic years:', years.length);
  years.forEach(y => console.log('  -', y.name, y.code, y._id));
  
  const terms = await Term.find({ school: school._id });
  console.log('Terms:', terms.length);
  terms.forEach(t => console.log('  -', t.name, t.code, t._id));
  
  const classes = await Class.find({ school: school._id });
  console.log('Classes:', classes.length);
  classes.forEach(c => console.log('  -', c.name, c.code, c._id));
  
  const subjects = await Subject.find({ school: school._id });
  console.log('Subjects:', subjects.length);
  subjects.forEach(s => console.log('  -', s.name, s.code, s._id));
  
  const students = await Student.find({ school: school._id });
  console.log('Students:', students.length);
  students.forEach(s => console.log('  -', s.admissionNumber, s.firstName, s.lastName, s._id));
  
  await odm.disconnect();
})();
