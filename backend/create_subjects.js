require('dotenv').config();
const odm = require('./lib/pg-odm');
const Subject = require('./models/Subject');
const School = require('./models/School');

async function main() {
  await odm.connect();
  
  const school = await School.findOne({ code: 'KIPS' });
  
  const nurserySubjects = [
    { name: 'Pré-lecture', code: 'PRE-LECT' },
    { name: 'Pré-écriture', code: 'PRE-ECR' },
    { name: 'Pré-calcul', code: 'PRE-CALC' },
    { name: 'Coloriage', code: 'COLOR' },
    { name: 'Français', code: 'FR-NUR' },
    { name: 'Kinyarwanda', code: 'KIN-NUR' },
    { name: 'Découpage', code: 'DECOUP' },
    { name: 'Collage', code: 'COLLAGE' },
    { name: 'Piquettage', code: 'PIQUET' },
    { name: 'Act-sensorielles', code: 'ACT-SENS' },
    { name: 'Act-psycho', code: 'ACT-PSY' },
    { name: 'Activités-éxploratrices', code: 'ACT-EXPL' },
    { name: 'Expression', code: 'EXPR' },
    { name: 'Peinture', code: 'PEINT' },
  ];
  
  const primarySubjects = [
    { name: 'MATHEMATICS', code: 'MATH' },
    { name: 'ENGLISH', code: 'ENG' },
    { name: 'SET & ICT', code: 'SET-ICT' },
    { name: 'SST & RS', code: 'SST-RS' },
    { name: 'FRANCAIS', code: 'FR-PRI' },
    { name: 'CREATIVE ARTS', code: 'CRE-ART' },
    { name: 'P.E. & S (PES)', code: 'PES' },
    { name: 'KINYARWANDA', code: 'KINY' },
  ];
  
  console.log('Creating nursery subjects...');
  for (const s of nurserySubjects) {
    const existing = await Subject.findOne({ code: s.code, school: school._id });
    if (!existing) {
      await Subject.create({ ...s, school: school._id, status: 'ACTIVE' });
      console.log('  Created:', s.name, s.code);
    } else {
      console.log('  Exists:', s.name, s.code);
    }
  }
  
  console.log('\nCreating primary subjects...');
  for (const s of primarySubjects) {
    const existing = await Subject.findOne({ code: s.code, school: school._id });
    if (!existing) {
      await Subject.create({ ...s, school: school._id, status: 'ACTIVE' });
      console.log('  Created:', s.name, s.code);
    } else {
      console.log('  Exists:', s.name, s.code);
    }
  }
  
  const all = await Subject.find({ school: school._id });
  console.log('\nTotal subjects:', all.length);
  all.forEach(s => console.log('  -', s.name, s.code));
  
  await odm.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });