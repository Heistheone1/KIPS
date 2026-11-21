'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const Assessment = require('./models/Assessment');
const AssessmentMark = require('./models/AssessmentMark');

(async () => {
  await odm.connect();
  const assessments = await Assessment.find({}).limit(5);
  console.log('Assessments:', assessments.length);
  assessments.forEach(a => console.log('  -', a.name, a.type, a._id));
  
  const marks = await AssessmentMark.find({}).limit(5);
  console.log('Marks:', marks.length);
  marks.forEach(m => console.log('  - score:', m.score, 'student:', m.student, 'assessment:', m.assessment));
  
  await odm.disconnect();
})();
