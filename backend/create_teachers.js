require('dotenv').config();
const odm = require('./lib/pg-odm');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Class = require('./models/Class');
const Term = require('./models/Term');
const AcademicYear = require('./models/AcademicYear');
const TeacherAssignment = require('./models/TeacherAssignment');
const ClassTeacherAssignment = require('./models/ClassTeacherAssignment');

async function main() {
  await odm.connect();
  
  const school = '530b767975a6b8423702dd4c';
  const year = await AcademicYear.findOne({ code: '2026-2027' });
  const term1 = await Term.findOne({ code: 'T1-2627' }); // T1-2627
  
  // Get classes
  const classes = await Class.find({ academicYear: year._id });
  const classMap = {};
  classes.forEach(c => { classMap[c.code] = c._id; });
  
  // Get subjects
  const subjects = await Subject.find({ school: '530b767975a6b8423702dd4c' });
  const subjMap = {};
  subjects.forEach(s => { subjMap[s.code] = s._id; });
  
  console.log('Classes:', Object.keys(classMap));
  console.log('Subjects:', Object.keys(subjMap));
  
  // Teacher definitions
  const teachers = [
    {
      email: 'Olivierirankunda797@gmail.com',
      firstName: 'IRANKUNDA',
      lastName: 'OLIVIER',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'KIN-NUR', classes: ['P4', 'P5', 'P6A', 'P6B'] },
      ],
      classTeacher: 'P6A',
    },
    {
      email: 'hululayinituyishime@gmail.com',
      firstName: 'TUYISHIME',
      lastName: 'HULULAYINI',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'ENG', classes: ['P1', 'P2', 'P3'] },
        { subject: 'FR-PRI', classes: ['P4', 'P5', 'P6A', 'P6B'] },
        { subject: 'CRE-ART', classes: ['P6A', 'P6B'] },
      ],
      classTeacher: null,
    },
    {
      email: 'Manishimwejeanclaude507@gmail.com',
      firstName: 'MANISHIMWE',
      lastName: 'JEAN CLAUDE',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'MATH', classes: ['P1', 'P2'] },
        { subject: 'SET-ICT', classes: ['P3'] },
        { subject: 'SST-RS', classes: ['P3'] },
        { subject: 'PES', classes: ['P4', 'P5', 'P6A', 'P6B'] },
      ],
      classTeacher: 'P3',
    },
    {
      email: 'Omuleegivants2250@gmail.com',
      firstName: 'OMULE',
      lastName: 'EGIVANTS',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'ENG', classes: ['P4', 'P5', 'P6A', 'P6B'] },
      ],
      classTeacher: 'P5',
    },
    {
      email: 'Vedasteniyomugabo09@gmail.com',
      firstName: 'NIYOMUGABO',
      lastName: 'VEDASTE',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'MATH', classes: ['P3', 'P4', 'P5'] },
        { subject: 'CRE-ART', classes: ['P4', 'P5'] },
      ],
      classTeacher: 'P4',
    },
    {
      email: 'Vkasongo81@gmail.com',
      firstName: 'KIUO KASONGO',
      lastName: 'VITAL',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'FR-PRI', classes: ['P1', 'P2', 'P3'] },
        { subject: 'SST-RS', classes: ['P1', 'P2'] },
        { subject: 'SET-ICT', classes: ['P1', 'P2'] },
      ],
      classTeacher: 'P2',
    },
    {
      email: 'Alicedus1234@gmail.com',
      firstName: 'ALICE',
      lastName: 'DUSABE',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'SET-ICT', classes: ['P4', 'P5', 'P6A', 'P6B'] },
      ],
      classTeacher: 'P6B',
    },
    {
      email: 'mizagisele@gmail.com',
      firstName: 'RWIZA MIZERO',
      lastName: 'MARIE GISEL',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'KIN-NUR', classes: ['P1', 'P2', 'P3'] },
        { subject: 'CRE-ART', classes: ['P1', 'P2', 'P3'] },
        { subject: 'PES', classes: ['P1', 'P2', 'P3'] },
      ],
      classTeacher: 'P1',
    },
    {
      email: 'robeniyakaremye@gmail.com',
      firstName: 'IYAKAREMYE',
      lastName: 'ROBEN',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'SST-RS', classes: ['P4', 'P5', 'P6A', 'P6B'] },
      ],
      classTeacher: null,
    },
    {
      email: 'kalambuk@gmail.com',
      firstName: 'KARAMBU KACYUMBA',
      lastName: 'ISA',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        // All nursery subjects except Kinyarwanda for N1, N2, N3
        { subject: 'PRE-LECT', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-ECR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-CALC', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLOR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'FR-NUR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'DECOUP', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLLAGE', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PIQUET', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-SENS', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-PSY', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-EXPL', classes: ['N1', 'N2', 'N3'] },
        { subject: 'EXPR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PEINT', classes: ['N1', 'N2', 'N3'] },
      ],
      classTeacher: 'N3',
    },
    {
      email: 'Allianceirasubiza347@gmail.com',
      firstName: 'IRASUBIZA',
      lastName: 'ALIANCE',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        // All nursery subjects except Kinyarwanda for N1, N2, N3
        { subject: 'PRE-LECT', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-ECR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-CALC', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLOR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'FR-NUR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'DECOUP', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLLAGE', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PIQUET', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-SENS', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-PSY', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-EXPL', classes: ['N1', 'N2', 'N3'] },
        { subject: 'EXPR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PEINT', classes: ['N1', 'N2', 'N3'] },
      ],
      classTeacher: 'N1',
    },
    {
      email: 'Furahajeannedarc@gmail.com',
      firstName: 'FURAHA',
      lastName: 'JEANNE DARC',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        // All nursery subjects except Kinyarwanda for N1, N2, N3
        { subject: 'PRE-LECT', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-ECR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PRE-CALC', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLOR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'FR-NUR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'DECOUP', classes: ['N1', 'N2', 'N3'] },
        { subject: 'COLLAGE', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PIQUET', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-SENS', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-PSY', classes: ['N1', 'N2', 'N3'] },
        { subject: 'ACT-EXPL', classes: ['N1', 'N2', 'N3'] },
        { subject: 'EXPR', classes: ['N1', 'N2', 'N3'] },
        { subject: 'PEINT', classes: ['N1', 'N2', 'N3'] },
      ],
      classTeacher: 'N2',
    },
    {
      email: 'nyandwi.verene@kipschool.ac', // placeholder email
      firstName: 'NYANDWI',
      lastName: 'VERENE',
      role: 'TEACHER',
      password: 'Teacher@2026!',
      assignments: [
        { subject: 'KIN-NUR', classes: ['N3'] },
      ],
      classTeacher: null,
    },
  ];
  
  // Create teachers
  console.log('Creating teachers...');
  const teacherMap = {};
  for (const t of teachers) {
    const existing = await User.findOne({ email: t.email.toLowerCase() });
    if (existing) {
      teacherMap[t.email] = existing._id;
      console.log('  Exists:', t.firstName, t.lastName, existing._id);
    } else {
      const user = await User.create({
        school,
        email: t.email.toLowerCase(),
        firstName: t.firstName,
        lastName: t.lastName,
        role: t.role,
        password: t.password,
        status: 'active',
      });
      teacherMap[t.email] = user._id;
      console.log('  Created:', t.firstName, t.lastName, user._id);
    }
  }
  
  // Create teacher assignments for Term 1
  console.log('\nCreating teacher assignments for Term 1...');
  let assignCount = 0;
  for (const t of teachers) {
    const teacherId = teacherMap[t.email];
    if (!teacherId) continue;
    
    for (const a of t.assignments) {
      const subjId = subjMap[a.subject];
      if (!subjId) {
        console.log('  Subject not found:', a.subject);
        continue;
      }
      for (const classCode of a.classes) {
        const classId = classMap[classCode];
        if (!classId) {
          console.log('  Class not found:', classCode);
          continue;
        }
        
        const existing = await TeacherAssignment.findOne({
          teacher: teacherId,
          academicYear: year._id,
          term: term1._id,
          class: classId,
          subject: subjId,
        });
        if (!existing) {
          await TeacherAssignment.create({
            school,
            teacher: teacherId,
            academicYear: year._id,
            term: term1._id,
            class: classId,
            subject: subjId,
            status: 'ACTIVE',
            assignedBy: 'de145a25cdc33f9b354da7aa', // admin
          });
          assignCount++;
        }
      }
    }
  }
  console.log('Teacher assignments created:', assignCount);
  
  // Create class teacher assignments
  console.log('\nCreating class teacher assignments...');
  let ctCount = 0;
  for (const t of teachers) {
    if (t.classTeacher) {
      const teacherId = teacherMap[t.email];
      const classId = classMap[t.classTeacher];
      if (!teacherId || !classId) {
        console.log('  Missing:', t.email, t.classTeacher);
        continue;
      }
      
      const existing = await ClassTeacherAssignment.findOne({
        teacher: teacherId,
        academicYear: year._id,
        term: term1._id,
        class: classId,
      });
      if (!existing) {
        await ClassTeacherAssignment.create({
          school,
          teacher: teacherId,
          academicYear: year._id,
          term: term1._id,
          class: classId,
          status: 'ACTIVE',
          assignedBy: 'de145a25cdc33f9b354da7aa',
        });
        ctCount++;
        console.log('  Class teacher:', t.firstName, t.lastName, '->', t.classTeacher);
      }
    }
  }
  console.log('Class teacher assignments created:', ctCount);
  
  // Verify
  const totalTA = await TeacherAssignment.count({ academicYear: year._id, term: term1._id });
  const totalCTA = await ClassTeacherAssignment.count({ academicYear: year._id, term: term1._id });
  console.log('\n=== VERIFICATION ===');
  console.log('Total Teacher Assignments:', totalTA);
  console.log('Total Class Teacher Assignments:', totalCTA);
  
  await odm.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });