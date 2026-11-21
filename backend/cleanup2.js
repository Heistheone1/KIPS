require('dotenv').config();
const odm = require('./lib/pg-odm');
const Subject = require('./models/Subject');
const School = require('./models/School');
const ReportCard = require('./models/ReportCard');
const ReportVersion = require('./models/ReportVersion');
const SubjectResult = require('./models/SubjectResult');
const TermResult = require('./models/TermResult');

(async () => {
  await odm.connect();
  
  const school = await School.findOne({ code: 'KIPS' });
  
  // Keep only standard subject codes (remove duplicates)
  const keepCodes = [
    'DECOUP', 'COLLAGE', 'PIQUET', 'ACT-SENS', 'ACT-PSY', 'ACT-EXPL',
    'PRE-LECT', 'EXPR', 'PRE-ECR', 'PRE-CALC', 'COLOR', 'FR-NUR',
    'KIN-NUR', 'PEINT', 'SET-ICT', 'SST-RS', 'FR-PRI', 'CRE-ART',
    'PES', 'KINY', 'MATH', 'ENG', 'KINYARWANDA', 'MATH', 'ENGLISH',
    'BEHAVIOUR', 'MATHEMATICS', 'ENGLISH', 'SET___ICT', 'SST_RS',
    'FRANCAIS', 'CREATIVE_ARTS', 'PH_E_S_PES_'
  ];
  
  // Actually, let me define the canonical subjects to KEEP
  const canonicalSubjects = [
    { name: 'Découpage', code: 'DECOUP' },
    { name: 'Collage', code: 'COLLAGE' },
    { name: 'Piquettage', code: 'PIQUET' },
    { name: 'Activités Sensorielles', code: 'ACT-SENS' },
    { name: 'Activités Psychomotrices', code: 'ACT-PSY' },
    { name: 'Activités Exploratoires', code: 'ACT-EXPL' },
    { name: 'Pré-lecture', code: 'PRE-LECT' },
    { name: 'Expression', code: 'EXPR' },
    { name: 'Pré-écriture', code: 'PRE-ECR' },
    { name: 'Pré-calcul', code: 'PRE-CALC' },
    { name: 'Coloriage', code: 'COLOR' },
    { name: 'Français', code: 'FR-NUR' },
    { name: 'Kinyarwanda', code: 'KIN-NUR' },
    { name: 'Peinture', code: 'PEINT' },
    { name: 'SET & ICT', code: 'SET-ICT' },
    { name: 'SST & RS', code: 'SST-RS' },
    { name: 'Français', code: 'FR-PRI' },
    { name: 'Creative Arts', code: 'CRE-ART' },
    { name: 'P.E. & Sports', code: 'PES' },
    { name: 'Kinyarwanda', code: 'KINY' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Behaviour', code: 'BEHAVIOUR' },
    { name: 'Mathematics', code: 'MATHEMATICS' },
    { name: 'English', code: 'ENGLISH' },
    { name: 'SET & ICT', code: 'SET___ICT' },
    { name: 'SST & RS', code: 'SST_RS' },
    { name: 'Français', code: 'FRANCAIS' },
    { name: 'Creative Arts', code: 'CREATIVE_ARTS' },
    { name: 'P.E. & Sports', code: 'PH_E_S_PES_' },
  ];
  
  // Get all subjects
  const allSubjects = await Subject.find({ school: school._id });
  console.log('Total subjects before:', allSubjects.length);
  
  // Find duplicates - group by name
  const byName = {};
  allSubjects.forEach(s => {
    if (!byName[s.name]) byName[s.name] = [];
    byName[s.name].push(s);
  });
  
  // Delete duplicates (keep first one for each name)
  let deleted = 0;
  for (const [name, subjects] of Object.entries(byName)) {
    if (subjects.length > 1) {
      for (let i = 1; i < subjects.length; i++) {
        await Subject.findByIdAndDelete(subjects[i]._id);
        deleted++;
        console.log('Deleted duplicate:', name, subjects[i].code);
      }
    }
  }
  
  // Also remove weird duplicate codes like "MATH" vs "MATHEMATICS" - keep standard ones
  // Actually let's just delete the clearly duplicate/weird ones
  const weirdCodes = [
    'PR__LECTURE', 'PR___CRITURE', 'PR__CALCUL', 'COLORIAGE', 'FRAN_AIS',
    'KINYARWANDA', 'MATH-TEST', 'D_COUPAGE', 'PIQUETTAGE', 'ACT_SENSORIELLES',
    'ACT_PSYCHO', 'ACTIVIT_S__XPLORATRI', 'EXPRESSION', 'PEINTURE',
    'SET___ICT', 'SST_RS', 'FRANCAIS', 'CREATIVE_ARTS', 'PH_E_S_PES_'
  ];
  
  for (const code of weirdCodes) {
    const subj = await Subject.findOne({ code, school: school._id });
    if (subj) {
      await Subject.findByIdAndDelete(subj._id);
      deleted++;
      console.log('Deleted weird:', subj.name, code);
    }
  }
  
  // Remove reports
  const rcDel = await ReportCard.deleteMany({});
  console.log('Deleted report cards:', rcDel.deletedCount);
  
  const rvDel = await ReportVersion.deleteMany({});
  console.log('Deleted report versions:', rvDel.deletedCount);
  
  const srDel = await SubjectResult.deleteMany({});
  console.log('Deleted subject results:', srDel.deletedCount);
  
  const trDel = await TermResult.deleteMany({});
  console.log('Deleted term results:', trDel.deletedCount);
  
  // Verify remaining
  const remaining = await Subject.find({ school: school._id });
  console.log('\nRemaining subjects:', remaining.length);
  remaining.forEach(s => console.log('  -', s.name, s.code));
  
  await odm.disconnect();
})();