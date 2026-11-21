require('dotenv').config();
const odm = require('./lib/pg-odm');
const XLSX = require('xlsx');
const Student = require('./models/Student');
const Enrollment = require('./models/Enrollment');
const Class = require('./models/Class');
const AcademicYear = require('./models/AcademicYear');

async function main() {
  await odm.connect();
  
  const year = await AcademicYear.findOne({ code: '2026-2027' });
  if (!year) throw new Error('2026-2027 not found');
  
  const classMap = {};
  const classes = await Class.find({ academicYear: year._id });
  classes.forEach(c => { classMap[c.code] = c._id; });
  
  const wb = XLSX.readFile('C:/Users/Inezaye Hirwa savior/Downloads/LIST OF ALL KIPS STUDENTS 2026-2027.xlsx');
  const ws = wb.Sheets['Sheet1'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const classSections = [
    { name: 'PRIMARY ONE', code: 'P1', start: 2, end: 32 },
    { name: 'PRIMARY TWO', code: 'P2', start: 35, end: 75 },
    { name: 'PRIMARY THREE', code: 'P3', start: 78, end: 121 },
    { name: 'PRIMARY FOUR', code: 'P4', start: 124, end: 171 },
    { name: 'PRIMARY FIVE', code: 'P5', start: 174, end: 213 },
  ];
  
  let totalCreated = 0;
  
  for (const section of classSections) {
    const classId = classMap[section.code];
    if (!classId) {
      console.log('Class not found:', section.code);
      continue;
    }
    
    console.log('\n=== ' + section.name + ' (' + section.code + ') ===');
    
    for (let i = section.start; i <= section.end; i++) {
      const row = data[i];
      if (!row || !row[0] || typeof row[0] !== 'number') continue;
      
      const fullName = (row[1] || '').trim();
      if (!fullName) continue;
      
      const nameParts = fullName.split(/\s+/).filter(p => p.length > 0);
      if (nameParts.length < 2) continue;
      
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      const admissionNumber = section.code + '-' + String(row[0]).padStart(3, '0');
      
      const existing = await Student.findOne({ admissionNumber });
      if (existing) {
        console.log('  Skip: ' + admissionNumber + ' already exists');
        continue;
      }
      
      const student = await Student.create({
        school: '530b767975a6b8423702dd4c',
        admissionNumber,
        firstName,
        lastName,
        gender: 'M',
        status: 'ACTIVE',
      });
      
      await Enrollment.create({
        school: '530b767975a6b8423702dd4c',
        student: student._id,
        class: classMap[section.code],
        academicYear: year._id,
        status: 'ACTIVE',
      });
      
      console.log('  Created: ' + admissionNumber + ' - ' + firstName + ' ' + lastName);
      totalCreated++;
    }
  }
  
  console.log('\n=== Total students created: ' + totalCreated + ' ===');
  await odm.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });