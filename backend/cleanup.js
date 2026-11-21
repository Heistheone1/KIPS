require('dotenv').config();
const odm = require('./lib/pg-odm');
const AcademicYear = require('./models/AcademicYear');
const Term = require('./models/Term');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Student = require('./models/Student');
const TeacherAssignment = require('./models/TeacherAssignment');
const ClassTeacherAssignment = require('./models/ClassTeacherAssignment');
const Enrollment = require('./models/Enrollment');
const Assessment = require('./models/Assessment');
const AssessmentMark = require('./models/AssessmentMark');
const SubjectResult = require('./models/SubjectResult');
const TermResult = require('./models/TermResult');
const ReportCard = require('./models/ReportCard');
const ReportVersion = require('./models/ReportVersion');
const User = require('./models/User');

(async () => {
  await odm.connect();
  
  // Keep only 2026-2027
  const keepYearId = 'd6a97c56442836857850017c';
  
  // Get all years to delete
  const yearsToDelete = await AcademicYear.find({ _id: { $ne: keepYearId } });
  const deleteYearIds = yearsToDelete.map(y => y._id);
  console.log('Deleting academic years:', deleteYearIds);
  
  // Delete terms for those years
  const termDel = await Term.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted terms:', termDel.deletedCount);
  
  // Delete classes for those years
  const classDel = await Class.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted classes:', classDel.deletedCount);
  
  // Delete subjects for those years
  const subjDel = await Subject.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted subjects:', subjDel.deletedCount);
  
  // Delete enrollments for those years
  const enrDel = await Enrollment.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted enrollments:', enrDel.deletedCount);
  
  // Delete teacher assignments for those years
  const taDel = await TeacherAssignment.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted teacher assignments:', taDel.deletedCount);
  
  // Delete class teacher assignments for those years
  const ctaDel = await ClassTeacherAssignment.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted class teacher assignments:', ctaDel.deletedCount);
  
  // Delete assessments for those years
  const asmDel = await Assessment.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted assessments:', asmDel.deletedCount);
  
  // Delete assessment marks for those years
  const amDel = await AssessmentMark.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted assessment marks:', amDel.deletedCount);
  
  // Delete subject results for those years
  const srDel = await SubjectResult.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted subject results:', srDel.deletedCount);
  
  // Delete term results for those years
  const trDel = await TermResult.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted term results:', trDel.deletedCount);
  
  // Delete report cards for those years
  const rcDel = await ReportCard.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted report cards:', rcDel.deletedCount);
  
  // Delete report versions for those years
  const rvDel = await ReportVersion.deleteMany({ academicYear: { $in: deleteYearIds } });
  console.log('Deleted report versions:', rvDel.deletedCount);
  
  // Delete academic years
  const ayDel = await AcademicYear.deleteMany({ _id: { $in: deleteYearIds } });
  console.log('Deleted academic years:', ayDel.deletedCount);
  
  // Now delete ALL students
  const stuDel = await Student.deleteMany({});
  console.log('Deleted ALL students:', stuDel.deletedCount);
  
  // Delete ALL teachers (users with role TEACHER, DOS, CLASS_TEACHER)
  const tchDel = await User.deleteMany({ role: { $in: ['TEACHER', 'DOS', 'CLASS_TEACHER'] } });
  console.log('Deleted teachers/DOS/class teachers:', tchDel.deletedCount);
  
  // Show remaining
  const remainingYears = await AcademicYear.find({});
  console.log('\nRemaining academic years:', remainingYears.map(y => y.name + ' (' + y.code + ')'));
  
  const remainingStudents = await Student.find({});
  console.log('Remaining students:', remainingStudents.length);
  
  const remainingTeachers = await User.find({ role: { $in: ['TEACHER', 'DOS', 'CLASS_TEACHER'] } });
  console.log('Remaining teachers:', remainingTeachers.length);
  
  await odm.disconnect();
})();