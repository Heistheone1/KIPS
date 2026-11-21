require('dotenv').config();
const odm = require('./lib/pg-odm');
const AcademicYear = require('./models/AcademicYear');
const Term = require('./models/Term');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Assessment = require('./models/Assessment');
const User = require('./models/User');
const School = require('./models/School');
const Enrollment = require('./models/Enrollment');
const TeacherAssignment = require('./models/TeacherAssignment');
const ClassTeacherAssignment = require('./models/ClassTeacherAssignment');
const ReportCard = require('./models/ReportCard');
const ReportVersion = require('./models/ReportVersion');
const SubjectResult = require('./models/SubjectResult');
const TermResult = require('./models/TermResult');
const AssessmentMark = require('./models/AssessmentMark');
const Student = require('./models/Student');

(async () => {
  await odm.connect();
  
  const school = await School.findOne({ code: 'KIPS' });
  console.log('School:', school?.name);
  
  const year = await AcademicYear.findOne({ code: '2026-2027' });
  console.log('\nAcademic Year:', year?.name, year?._id);
  
  const terms = await Term.find({ academicYear: year._id });
  console.log('\nTerms:', terms.length);
  terms.forEach(t => console.log('  -', t.name, t.code, t._id));
  
  const classes = await Class.find({ academicYear: year._id });
  console.log('\nClasses:', classes.length);
  classes.forEach(c => console.log('  -', c.name, c.code, c.level, c._id));
  
  const subjects = await Subject.find({ school: school._id });
  console.log('\nSubjects:', subjects.length);
  subjects.forEach(s => console.log('  -', s.name, s.code, s._id));
  
  const assessments = await Assessment.find({ academicYear: year._id });
  console.log('\nAssessments:', assessments.length);
  for (const a of assessments) {
    const subj = await Subject.findById(a.subject);
    const cls = await Class.findById(a.class);
    const trm = await Term.findById(a.term);
    console.log('  -', a.name, a.type, '|', subj?.name, '|', cls?.name, '|', trm?.name);
  }
  
  const admin = await User.findOne({ role: 'ADMIN' });
  console.log('\nAdmin:', admin?.email, admin?._id, 'school:', admin.school);
  
  const enrollments = await Enrollment.find({});
  console.log('\nEnrollments:', enrollments.length);
  
  const teacherAssigns2 = await TeacherAssignment.find({});
  console.log('Teacher Assignments:', teacherAssigns2.length);
  
  const classTeacherAssigns = await ClassTeacherAssignment.find({});
  console.log('Class Teacher Assignments:', classTeacherAssigns.length);
  
  const rc = await ReportCard.find({});
  console.log('Report Cards:', rc.length);
  
  const rv = await ReportVersion.find({});
  console.log('Report Versions:', rv.length);
  
  const sr = await SubjectResult.find({});
  console.log('Subject Results:', sr.length);
  
  const tr = await TermResult.find({});
  console.log('Term Results:', tr.length);
  
  const am = await AssessmentMark.find({});
  console.log('Assessment Marks:', am.length);
  
  // Full relationship check
  console.log('\n=== FULL RELATIONSHIP CHECK ===');
  let allGood = true;
  
  for (const a of assessments) {
    const subj = await Subject.findById(a.subject);
    const cls = await Class.findById(a.class);
    const trm = await Term.findById(a.term);
    const yr = await AcademicYear.findById(a.academicYear);
    if (!subj || !cls || !trm || !yr) {
      console.log('BROKEN ASSESSMENT:', a.name, a._id);
      allGood = false;
    }
  }
  
  // Check enrollments
  const enrs = await Enrollment.find({});
  for (const e of enrs) {
    const s = await Student.findById(e.student);
    const c = await Class.findById(e.class);
    const y = await AcademicYear.findById(e.academicYear);
    if (!s || !c || !y) {
      console.log('BROKEN ENROLLMENT:', e._id);
      allGood = false;
    }
  }
  
  // Check teacher assignments
  for (const t of teacherAssigns2) {
    const u2 = await User.findById(t.teacher);
    const c2 = await Class.findById(t.class);
    const s2 = await Subject.findById(t.subject);
    const trm2 = await Term.findById(t.term);
    const yr2 = await AcademicYear.findById(t.academicYear);
    if (!u2 || !c2 || !s2 || !trm2 || !yr2) {
      console.log('BROKEN TEACHER ASSIGNMENT:', t._id);
      allGood = false;
    }
  }
  
  // Check class teacher assignments
  const ctas = await ClassTeacherAssignment.find({});
  for (const t of ctas) {
    const u3 = await User.findById(t.teacher);
    const c3 = await Class.findById(t.class);
    const trm3 = await Term.findById(t.term);
    const yr3 = await AcademicYear.findById(t.academicYear);
    if (!u3 || !c3 || !trm3 || !yr3) {
      console.log('BROKEN CLASS TEACHER ASSIGNMENT:', t._id);
      allGood = false;
    }
  }
  
  if (allGood) console.log('\nALL RELATIONSHIPS VALID ✓');
  else console.log('\nSOME RELATIONSHIPS BROKEN ✗');
  
  await odm.disconnect();
})();