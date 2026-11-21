'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const Assessment = require('./models/Assessment');

(async () => {
  await odm.connect();
  const a = await Assessment.findById('bba58176ba0f61f076a790f7');
  console.log('Math Exam assessment:');
  console.log('  name:', a.name, 'type:', a.type, 'class:', a.class, 'subject:', a.subject, 'term:', a.term, 'year:', a.academicYear);
  
  // Also check what assessments exist for P1 class (1a79b25157b67e1a843b8f0d) in year 6939fa2c0947070c3b7f37bc
  const assessments = await Assessment.find({ class: '1a79b25157b67e1a843b8f0d', academicYear: '6939fa2c0947070c3b7f37bc' }).limit(5);
  console.log('\nAssessments for P1 (2025-2026):', assessments.length);
  assessments.forEach(a => console.log('  -', a.name, a.type, a._id, 'subject:', a.subject));
  
  await odm.disconnect();
})();
