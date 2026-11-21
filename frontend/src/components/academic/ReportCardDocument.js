import { Box, Chip, Stack, Alert } from '@mui/material';
import logo from '../../assets/logo.png';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (v, d = 1) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(d));
const isNurseryClass = (cn = '') => /nursery|nur|^n[1-3]$/i.test(cn.trim());
const isBehaviourSubj = (name = '') => /behaviour|conduite/i.test(name);
const sortedTerms = (arr = []) => [...arr].sort((a, b) => a.sequence - b.sequence);

// resultType: TERM = term1 only, CUMULATIVE = t1+t2, ANNUAL = t1+t2+t3
const isAnnual = (resultType) => resultType === 'ANNUAL';

// ─── Nursery colour bands ────────────────────────────────────────────────────
const NURSERY_BANDS = [
  { min: 90, max: 100, color: '#2e7d32', label: 'Excellent', range: '100-90' },
  { min: 70, max: 89,  color: '#1565c0', label: 'TRES Bien', range: '89-70'  },
  { min: 50, max: 69,  color: '#c62828', label: 'BIEN',      range: '69-50'  },
  { min: 0,  max: 49,  color: '#f9a825', label: 'ECHEC',     range: '49-0'   },
];
const nurseryColor = (v) => {
  if (v === null || v === undefined) return '#2e7d32';
  const n = Number(v);
  for (const b of NURSERY_BANDS) if (n >= b.min && n <= b.max) return b.color;
  return '#2e7d32';
};

// ─── border / cell styles ────────────────────────────────────────────────────
const B = '1px solid #aaa';
const tdBase = {
  border: B, padding: '2px 3px', fontSize: 9,
  textAlign: 'center', whiteSpace: 'nowrap',
};
const thBase = { ...tdBase, fontWeight: 700, background: '#f0f0f0' };

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSIONAL SCHOOL HEADER  (matches image exactly)
// ═══════════════════════════════════════════════════════════════════════════
const SchoolHeader = ({ p }) => {
  const rh = p.reportHeader || {};
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, border: '2px solid #1b5e20' }}>
      <tbody>
        <tr>
          {/* circular logo */}
          <td style={{
            width: 90, verticalAlign: 'middle', textAlign: 'center',
            background: '#1b5e20', padding: 6, border: 'none',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: '3px solid #fff', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', margin: '0 auto',
            }}>
              <img
                src={p.schoolLogoUrl || logo}
                alt="logo"
                style={{ width: 68, height: 68, objectFit: 'contain' }}
                onError={(e) => { e.target.src = logo; }}
              />
            </div>
          </td>

          {/* name + address */}
          <td style={{ background: '#1b5e20', padding: 0, verticalAlign: 'middle' }}>
            {/* orange school name bar */}
            <div style={{
              background: '#e65100', color: '#fff',
              fontWeight: 900, fontSize: 19, letterSpacing: 0.8,
              padding: '4px 14px', textTransform: 'uppercase',
            }}>
              {p.schoolName || 'SCHOOL NAME'}
            </div>
            {/* address */}
            <div style={{ color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 14px 1px', letterSpacing: 0.2 }}>
              {p.schoolAddress || rh.tagline || ''}
            </div>
            {/* phone / email */}
            <div style={{ color: '#fff', fontSize: 9, padding: '1px 14px 5px' }}>
              {p.schoolPhone ? `TELEPHONE NUMBER: ${p.schoolPhone}` : ''}
              {p.schoolPhone && p.schoolEmail ? '  ' : ''}
              {p.schoolEmail ? `Email: ${p.schoolEmail}` : ''}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SHARED FOOTER  (checkboxes only on ANNUAL)
// ═══════════════════════════════════════════════════════════════════════════
const ReportFooter = ({ p, showCheckboxes }) => {
  const rh = p.reportHeader || {};
  const city = rh.reportCity || 'KIGALI';
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;

  return (
    <>
      {/* checkboxes — ANNUAL only */}
      {showCheckboxes && (
        <div style={{ fontSize: 9, marginBottom: 8, lineHeight: '17px' }}>
          {['Promoted','Advised to repeat','Promoted elsewhere','Repeat elsewhere'].map((lbl) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 9, height: 9, border: '1px solid #333', flexShrink: 0 }} />
              <span>{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3-column signature table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: B, marginBottom: 5 }}>
        <tbody>
          <tr>
            <td style={{ border: B, padding: '4px 8px', width: '33%', verticalAlign: 'top', fontSize: 9, color: '#555' }}>
              Class teacher&apos;s signature
              <div style={{ minHeight: 50 }} />
            </td>
            <td style={{ border: B, padding: '4px 8px', width: '34%', verticalAlign: 'top', fontSize: 9, color: '#555' }}>
              Parent&apos;s signature
              <div style={{ minHeight: 50 }} />
            </td>
            <td style={{ border: B, padding: '4px 8px', width: '33%', verticalAlign: 'top', fontSize: 9 }}>
              <div>Done at {city}, on {dateStr}</div>
              <div style={{ minHeight: 28 }} />
              <div style={{ textAlign: 'center', color: '#555' }}>
                ( {rh.stampLabel || 'Stamp and signature'} )
              </div>
              <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 700, marginTop: 3 }}>
                {rh.headmistressName
                  ? <><em>{rh.headmistressName}</em>, {rh.headmistressTitle || 'Headmistress'}</>
                  : <em>Headmistress</em>}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* comment box */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: B, marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', fontSize: 9, color: '#555', minHeight: 30 }}>
              Class teacher&apos;s comment
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontSize: 8, color: '#888' }}>
        <em>School report generated by <strong>SchoolGEAR</strong> (https://theschoolgear.com)</em>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY REPORT CARD
// ═══════════════════════════════════════════════════════════════════════════
const PrimaryReportCard = ({ p }) => {
  const terms = sortedTerms(p.termsIncluded || []);
  const numT = terms.length;
  const subjects = p.subjects || [];
  const annual = isAnnual(p.resultType);

  const getBD = (subj, termId) =>
    (subj.termBreakdown || []).find((b) => String(b.termId) === String(termId)) || {};

  const getMax = (subj) => {
    const beh = isBehaviourSubj(subj.subjectName);
    const bd0 = (subj.termBreakdown || [])[0] || {};
    if (beh) {
      const eM = bd0.examMax || 40;
      return { testMax: 0, examMax: eM, totMax: eM };
    }
    const tM = bd0.testMax || 100;
    const eM = bd0.examMax || 100;
    return { testMax: tM, examMax: eM, totMax: tM + eM };
  };

  const getAnnual = (subj) => {
    const { totMax } = getMax(subj);
    const annMax = totMax * numT;
    const annTotal = terms.reduce((acc, t) => {
      const bd = getBD(subj, t.id);
      return acc + (bd.total != null ? Number(bd.total) : 0);
    }, 0);
    const annPct = annMax > 0 ? (annTotal / annMax) * 100 : null;
    return { annMax, annTotal, annPct };
  };

  // grand totals
  const grandMaxTest = subjects.reduce((a, s) => a + getMax(s).testMax, 0);
  const grandMaxExam = subjects.reduce((a, s) => a + getMax(s).examMax, 0);
  const grandMaxTot  = subjects.reduce((a, s) => a + getMax(s).totMax, 0);
  const grandAnnMax  = grandMaxTot * numT;

  const termGT = terms.map((t) => {
    let testSum = 0, examSum = 0, totSum = 0;
    subjects.forEach((s) => {
      const bd = getBD(s, t.id);
      if (!isBehaviourSubj(s.subjectName)) {
        testSum += bd.test != null ? Number(bd.test) : 0;
        examSum += bd.exam != null ? Number(bd.exam) : 0;
      }
      totSum += bd.total != null ? Number(bd.total) : 0;
    });
    return { testSum, examSum, totSum };
  });

  const grandAnnTotal = termGT.reduce((a, t) => a + t.totSum, 0);
  const grandAnnPct   = grandAnnMax > 0 ? (grandAnnTotal / grandAnnMax) * 100 : null;

  const studentName = [p.student?.firstName, p.student?.middleName, p.student?.lastName]
    .filter(Boolean).join(' ');

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <SchoolHeader p={p} />

      <div style={{ textAlign: 'center', marginBottom: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 400 }}>{p.schoolCode}-{p.student?.admissionNumber} </span>
        <strong>{studentName}</strong>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, marginBottom: 2 }}>
        {p.classCode} - {p.className}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        REPORT CARD <strong>{p.academicYearName}</strong>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: B, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', width: 100, border: B }} rowSpan={2}>SUBJECTS</th>
            <th style={{ ...thBase, border: B }} colSpan={3}>MAXIMA</th>
            {terms.map((t) => (
              <th key={t.id} style={{ ...thBase, border: B }} colSpan={3}>{t.name.toUpperCase()}</th>
            ))}
            {/* ANNUAL columns: show MAX only when 3 terms */}
            {numT === 3 && <th style={{ ...thBase, border: B }} colSpan={3}>ANNUAL</th>}
            {numT === 2 && <th style={{ ...thBase, border: B }} colSpan={2}>ANNUAL</th>}
            {numT === 1 && <th style={{ ...thBase, border: B }} colSpan={2}>ANNUAL</th>}
          </tr>
          <tr>
            <th style={{ ...thBase, border: B }}>TEST</th>
            <th style={{ ...thBase, border: B }}>EXAM</th>
            <th style={{ ...thBase, border: B }}>TOT</th>
            {terms.map((t) => (
              [
                <th key={`${t.id}-t`} style={{ ...thBase, border: B }}>TEST</th>,
                <th key={`${t.id}-e`} style={{ ...thBase, border: B }}>EXAM</th>,
                <th key={`${t.id}-o`} style={{ ...thBase, border: B }}>TOT</th>,
              ]
            ))}
            {numT === 3 && <th style={{ ...thBase, border: B }}>MAX</th>}
            <th style={{ ...thBase, border: B }}>O.P</th>
            <th style={{ ...thBase, border: B }}>%</th>
          </tr>
        </thead>

        <tbody>
          {subjects.map((s, i) => {
            const beh = isBehaviourSubj(s.subjectName);
            const { testMax, examMax, totMax } = getMax(s);
            const { annMax, annTotal, annPct } = getAnnual(s);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...tdBase, textAlign: 'left', fontWeight: 500, border: B }}>{s.subjectName}</td>
                {/* MAXIMA */}
                {beh ? (
                  [<td key="t" style={{ ...tdBase, border: B }} />,
                   <td key="e" style={{ ...tdBase, border: B }}>{examMax}</td>,
                   <td key="o" style={{ ...tdBase, border: B }} />]
                ) : (
                  [<td key="t" style={{ ...tdBase, border: B }}>{testMax}</td>,
                   <td key="e" style={{ ...tdBase, border: B }}>{examMax}</td>,
                   <td key="o" style={{ ...tdBase, border: B }}>{totMax}</td>]
                )}
                {/* per-term */}
                {terms.map((t) => {
                  const bd = getBD(s, t.id);
                  if (beh) return [
                    <td key={`${t.id}-t`} style={{ ...tdBase, border: B }} />,
                    <td key={`${t.id}-e`} style={{ ...tdBase, border: B }}>{fmt(bd.total)}</td>,
                    <td key={`${t.id}-o`} style={{ ...tdBase, border: B }} />,
                  ];
                  return [
                    <td key={`${t.id}-t`} style={{ ...tdBase, border: B }}>{fmt(bd.test)}</td>,
                    <td key={`${t.id}-e`} style={{ ...tdBase, border: B }}>{fmt(bd.exam)}</td>,
                    <td key={`${t.id}-o`} style={{ ...tdBase, border: B }}>{fmt(bd.total)}</td>,
                  ];
                })}
                {/* ANNUAL */}
                {numT === 3 && <td style={{ ...tdBase, border: B }}>{annMax || ''}</td>}
                <td style={{ ...tdBase, border: B }}>{fmt(annTotal, 1)}</td>
                <td style={{ ...tdBase, border: B }}>{annPct !== null ? `${fmt(annPct, 2)} %` : ''}</td>
              </tr>
            );
          })}

          {/* Total */}
          <tr style={{ fontWeight: 700, background: '#f5f5f5' }}>
            <td style={{ ...tdBase, textAlign: 'left', fontWeight: 700, border: B }}>Total</td>
            <td style={{ ...tdBase, fontWeight: 700, border: B }}>{grandMaxTest}</td>
            <td style={{ ...tdBase, fontWeight: 700, border: B }}>{grandMaxExam}</td>
            <td style={{ ...tdBase, fontWeight: 700, border: B }}>{grandMaxTot}</td>
            {terms.map((t, ti) => {
              const gt = termGT[ti];
              return [
                <td key={`${t.id}-t`} style={{ ...tdBase, fontWeight: 700, border: B }}>{fmt(gt.testSum, 1)}</td>,
                <td key={`${t.id}-e`} style={{ ...tdBase, fontWeight: 700, border: B }}>{fmt(gt.examSum, 1)}</td>,
                <td key={`${t.id}-o`} style={{ ...tdBase, fontWeight: 700, border: B }}>{fmt(gt.totSum, 1)}</td>,
              ];
            })}
            {numT === 3 && <td style={{ ...tdBase, fontWeight: 700, border: B }}>{grandAnnMax}</td>}
            <td style={{ ...tdBase, fontWeight: 700, border: B }}>{fmt(grandAnnTotal, 2)}</td>
            <td style={{ ...tdBase, fontWeight: 700, border: B }}>{grandAnnPct !== null ? `${fmt(grandAnnPct, 2)} %` : ''}</td>
          </tr>

          {/* Percentage */}
          <tr>
            <td style={{ ...tdBase, textAlign: 'left', border: B }}>Percentage</td>
            <td style={{ ...tdBase, border: B }} colSpan={3} />
            {terms.map((t, ti) => {
              const gt = termGT[ti];
              const pv = grandMaxTot > 0 ? (gt.totSum / grandMaxTot) * 100 : null;
              return [
                <td key={`${t.id}-t`} style={{ ...tdBase, border: B }} />,
                <td key={`${t.id}-e`} style={{ ...tdBase, border: B }} />,
                <td key={`${t.id}-o`} style={{ ...tdBase, fontWeight: 600, border: B }}>{pv !== null ? `${fmt(pv, 1)}%` : ''}</td>,
              ];
            })}
            {numT === 3 && <td style={{ ...tdBase, border: B }} />}
            <td style={{ ...tdBase, fontWeight: 600, border: B }} colSpan={2}>
              {grandAnnPct !== null ? `${fmt(grandAnnPct, 2)} %` : ''}
            </td>
          </tr>

          {/* Position */}
          <tr>
            <td style={{ ...tdBase, textAlign: 'left', border: B }}>Position</td>
            <td style={{ ...tdBase, border: B }} colSpan={3} />
            {terms.map((t) => [
              <td key={`${t.id}-t`} style={{ ...tdBase, border: B }} />,
              <td key={`${t.id}-e`} style={{ ...tdBase, border: B }} />,
              <td key={`${t.id}-o`} style={{ ...tdBase, fontWeight: 600, border: B }}>
                {p.rank != null ? `${p.rank}/${p.rankOutOf ?? '—'}` : ''}
              </td>,
            ])}
            {numT === 3 && <td style={{ ...tdBase, border: B }} />}
            <td style={{ ...tdBase, fontWeight: 600, border: B }} colSpan={2}>
              {p.rank != null ? `${p.rank}/${p.rankOutOf ?? '—'}` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <ReportFooter p={p} showCheckboxes={annual} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// NURSERY REPORT CARD
// ═══════════════════════════════════════════════════════════════════════════
const NurseryReportCard = ({ p }) => {
  const terms = sortedTerms(p.termsIncluded || []);
  const subjects = p.subjects || [];
  const annual = isAnnual(p.resultType);

  const studentName = [p.student?.firstName, p.student?.middleName, p.student?.lastName]
    .filter(Boolean).join(' ');

  const getBD = (subj, termId) =>
    (subj.termBreakdown || []).find((b) => String(b.termId) === String(termId)) || {};

  const ColorBar = ({ color }) => (
    <div style={{ height: 20, background: color, position: 'relative', overflow: 'hidden' }}>
      {[3, 7, 11, 15, 19].map((top) => (
        <div key={top} style={{
          position: 'absolute', top, left: 0, right: 0,
          height: 1.5, background: 'rgba(255,255,255,0.35)',
        }} />
      ))}
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <SchoolHeader p={p} />

      <div style={{ textAlign: 'center', marginBottom: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 400 }}>{p.schoolCode}-{p.student?.admissionNumber} </span>
        <strong>{studentName}</strong>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, marginBottom: 2 }}>
        {p.classCode} - {p.className}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        REPORT CARD <strong>{p.academicYearName}</strong>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: B, marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', width: 170, border: B, fontSize: 10 }}>SUBJECTS</th>
            {terms.map((t) => (
              <th key={t.id} style={{ ...thBase, border: B, fontSize: 10 }}>{t.name.toUpperCase()}</th>
            ))}
          </tr>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', border: B, fontSize: 8 }} />
            {terms.map((t) => (
              <th key={t.id} style={{ ...thBase, border: B, fontSize: 8 }}>RANKS</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, i) => (
            <tr key={i}>
              <td style={{ ...tdBase, textAlign: 'left', border: B, fontSize: 10 }}>{s.subjectName}</td>
              {terms.map((t) => {
                const bd = getBD(s, t.id);
                const val = bd.percentage ?? bd.total;
                return (
                  <td key={t.id} style={{ border: B, padding: 0 }}>
                    <ColorBar color={nurseryColor(val)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
        {NURSERY_BANDS.map((b) => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
            <div style={{ width: 30, height: 14, background: b.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>{b.range}</div>
              <div>{b.label}</div>
            </div>
          </div>
        ))}
      </div>

      <ReportFooter p={p} showCheckboxes={annual} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_COLORS = {
  GENERATED: 'info', REVIEWED: 'secondary', APPROVED: 'primary', PUBLISHED: 'success',
};

const ReportCardDocument = ({ payload: p, card }) => {
  if (!p || !p.student) return null;
  const status  = card?.status || p.status;
  const isStale = Boolean(card?.isStale);
  const nursery = isNurseryClass(p.className || '');

  return (
    <Box
      id="report-card-document"
      className="report-printable"
      data-testid="report-document"
      sx={{
        backgroundColor: '#fff',
        color: '#000',
        maxWidth: '210mm',
        mx: 'auto',
        p: { xs: 2, md: '10mm 12mm' },
        boxShadow: 1,
        fontFamily: 'Arial, Helvetica, sans-serif',
        '@media print': { boxShadow: 'none', maxWidth: 'none', p: '8mm 10mm' },
      }}
    >
      {/* screen-only status chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1, '@media print': { display: 'none' } }}>
        <Chip size="small" label={`Status: ${status}`} color={STATUS_COLORS[status] || 'default'} />
        <Chip size="small" label={`v${card?.currentVersion ?? '—'}`} variant="outlined" />
        {isStale && <Chip size="small" label="STALE" color="warning" />}
        {p.status === 'INCOMPLETE' && <Chip size="small" label="INCOMPLETE" color="warning" />}
        <Chip size="small" label={nursery ? 'NURSERY' : 'PRIMARY'} variant="outlined" color="info" />
        <Chip size="small" label={p.resultType || '—'} variant="outlined" />
      </Stack>

      {isStale && (
        <Alert severity="warning" sx={{ mb: 1, '@media print': { display: 'none' } }}>
          Stale — recalculate results and generate a new version before publishing.
        </Alert>
      )}

      {nursery
        ? <NurseryReportCard p={p} card={card} />
        : <PrimaryReportCard p={p} card={card} />
      }
    </Box>
  );
};

export default ReportCardDocument;
