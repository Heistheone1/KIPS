import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, MenuItem, Stack, Alert, Typography, Avatar, Paper,
  Button, Chip, Tooltip, IconButton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Divider, InputAdornment,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  fetchTermResults, fetchResultStatus, fetchResultMeta, generateTermResults, recalculateScope,
} from '../../../redux/resultRelated/resultHandle';
import { resultReset } from '../../../redux/resultRelated/resultSlice';
import { fetchAcademicYears, fetchTerms, fetchClasses } from '../../../redux/academicRelated/academicHandle';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';

const BASE_PATH = { ADMIN: 'admin', DOS: 'dos', CLASS_TEACHER: 'class-teacher', TEACHER: 'teacher' };
const ACCENT = '#0ea5e9';
const ACCENT_BG = '#f0f9ff';

const display = (v, digits = 2) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits));

const rankStyle = (rank) => {
  if (rank === 1) return { bg: '#fef3c7', color: '#d97706' };
  if (rank === 2) return { bg: '#f1f5f9', color: '#64748b' };
  if (rank === 3) return { bg: '#fef2f2', color: '#dc2626' };
  return null;
};

const gradeColor = (grade) => {
  if (!grade) return null;
  const g = String(grade).toUpperCase();
  if (g.startsWith('A')) return { bg: '#dcfce7', color: '#16a34a' };
  if (g.startsWith('B')) return { bg: '#dbeafe', color: '#2563eb' };
  if (g.startsWith('C')) return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#fee2e2', color: '#dc2626' };
};

const filterSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

const StudentCell = ({ result }) => {
  const name = `${result.student?.firstName || ''} ${result.student?.lastName || ''}`.trim() || 'Unknown student';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.7rem', fontWeight: 700 }}>
        {initials}
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{name}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{result.student?.admissionNumber || '—'}</Typography>
      </Box>
    </Box>
  );
};

const ResultPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { termResults, resultMeta, resultStatus, loading, error, success } = useSelector((s) => s.result);
  const { academicYears, terms, classes } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const basePath = BASE_PATH[currentRole] || 'admin';
  const canManage = ['ADMIN', 'DOS'].includes(currentRole);

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [missingPolicy, setMissingPolicy] = useState('ZERO');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const rows = Array.isArray(termResults) ? termResults : [];

  useEffect(() => {
    dispatch(fetchResultMeta());
    dispatch(fetchAcademicYears());
    dispatch(fetchTerms());
    dispatch(fetchClasses());
  }, [dispatch]);

  // Default to the active academic year once years load.
  useEffect(() => {
    if (filterYear || !academicYears?.length) return;
    const active = academicYears.find((y) => y.status === 'ACTIVE');
    if (active) setFilterYear(active._id);
  }, [academicYears, filterYear]);

  // Default to the active term of the selected year.
  useEffect(() => {
    if (filterTerm || !filterYear || !terms?.length) return;
    const yearTerms = terms.filter((t) => (t.academicYear?._id || t.academicYear) === filterYear);
    const active = yearTerms.find((t) => t.status === 'ACTIVE') || yearTerms[0];
    if (active) setFilterTerm(active._id);
  }, [terms, filterYear, filterTerm]);

  const buildQs = () => {
    const p = new URLSearchParams();
    if (filterYear) p.set('academicYear', filterYear);
    if (filterTerm) p.set('term', filterTerm);
    if (filterClass) p.set('class', filterClass);
    if (filterType) p.set('resultType', filterType);
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  };

  const refetch = () => {
    dispatch(fetchTermResults(buildQs()));
    dispatch(fetchResultStatus(buildQs()));
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterTerm, filterClass, filterType, dispatch]);

  useEffect(() => { if (success) dispatch(resultReset()); }, [success, dispatch]);

  const yearsForFilter = academicYears || [];
  const termsForFilter = (filterYear
    ? (terms || []).filter((t) => (t.academicYear?._id || t.academicYear) === filterYear)
    : (terms || []));
  const classesForFilter = (filterYear
    ? (classes || []).filter((c) => (c.academicYear?._id || c.academicYear) === filterYear)
    : (classes || []));

  const scopeReady = Boolean(filterYear && filterTerm && filterClass);

  const handleGenerate = () => {
    if (!scopeReady) return;
    setLastRun(null);
    dispatch(generateTermResults(
      { academicYear: filterYear, term: filterTerm, class: filterClass, missingPolicy },
      (out) => {
        setLastRun(out);
        refetch();
      },
    ));
  };

  const handleRecalculate = () => {
    if (!scopeReady) return;
    setLastRun(null);
    dispatch(recalculateScope(
      { academicYear: filterYear, term: filterTerm, class: filterClass },
      (out) => {
        setLastRun(out);
        refetch();
      },
    ));
  };

  // ── Derived, truthful statistics ─────────────────────────────────────────
  const stats = useMemo(() => {
    const withAverage = rows.filter((r) => typeof r.average === 'number' && !Number.isNaN(r.average));
    const classAverage = withAverage.length
      ? withAverage.reduce((sum, r) => sum + r.average, 0) / withAverage.length
      : null;
    return {
      students: rows.length,
      complete: rows.filter((r) => r.status === 'COMPLETE').length,
      incomplete: rows.filter((r) => r.status === 'INCOMPLETE').length,
      ranked: rows.filter((r) => r.rank !== null && r.rank !== undefined).length,
      stale: rows.filter((r) => r.isStale).length,
      classAverage,
    };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.toLowerCase();
      return name.includes(q) || String(r.student?.admissionNumber || '').toLowerCase().includes(q);
    });
  }, [rows, search]);

  const columns = useMemo(() => [
    {
      key: 'rank', label: 'Rank',
      render: (r) => {
        const rs = rankStyle(r.rank);
        if (r.rank === null || r.rank === undefined) {
          return <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</Typography>;
        }
        return (
          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.3, borderRadius: 99, bgcolor: rs?.bg || '#f1f5f9' }}>
              {r.rank <= 3 && <EmojiEventsIcon sx={{ fontSize: 14, color: rs?.color || '#64748b' }} />}
              <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: rs?.color || '#64748b' }}>#{r.rank}</Typography>
            </Box>
            {r.rankOutOf ? (
              <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, pl: 0.5 }}>of {r.rankOutOf}</Typography>
            ) : null}
          </Box>
        );
      },
    },
    { key: 'student', label: 'Student', render: (r) => <StudentCell result={r} /> },
    {
      key: 'subjectsCounted', label: 'Subjects',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
          {r.subjectsCounted ?? 0} <Typography component="span" sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {r.subjectsTotal ?? 0}</Typography>
        </Typography>
      ),
    },
    {
      key: 'average', label: 'Average',
      render: (r) => (
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: r.average === null ? '#94a3b8' : ACCENT }}>
          {display(r.average)}
        </Typography>
      ),
    },
    {
      key: 'grade', label: 'Grade',
      render: (r) => {
        const gc = gradeColor(r.grade);
        if (!r.grade) return <Typography sx={{ color: '#94a3b8' }}>—</Typography>;
        return (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: gc?.bg || '#f1f5f9' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: gc?.color || '#64748b' }}>{r.grade}</Typography>
          </Box>
        );
      },
    },
    { key: 'remark', label: 'Remark', render: (r) => <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>{r.remark || '—'}</Typography> },
    {
      key: 'resultType', label: 'Window',
      render: (r) => (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f5f3ff' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed' }}>{r.resultType || '—'}</Typography>
        </Box>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <StatusBadge value={r.status} />
        {r.isStale && (
          <Tooltip title="Marks changed since this result was generated">
            <Chip label="STALE" size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
          </Tooltip>
        )}
      </Box>
    ) },
  ], []);

  const filters = (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1.5, alignItems: 'center' }}>
      <TextField select label="Year" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterTerm(''); setFilterClass(''); }} size="small" sx={{ minWidth: 150, ...filterSx }}>
        <MenuItem value="">All Years</MenuItem>
        {yearsForFilter.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
      </TextField>
      <TextField select label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} size="small" sx={{ minWidth: 130, ...filterSx }}>
        <MenuItem value="">All Terms</MenuItem>
        {termsForFilter.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
      </TextField>
      <TextField select label="Class" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} size="small" sx={{ minWidth: 150, ...filterSx }}>
        <MenuItem value="">All Classes</MenuItem>
        {classesForFilter.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField select label="Window" value={filterType} onChange={(e) => setFilterType(e.target.value)} size="small" sx={{ minWidth: 130, ...filterSx }}>
        <MenuItem value="">All Windows</MenuItem>
        {(resultMeta?.resultTypes || ['TERM', 'CUMULATIVE', 'ANNUAL']).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
      <TextField size="small" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
        sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
    </Stack>
  );

  const actions = (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
      <TextField select size="small" label="Missing marks" value={missingPolicy} onChange={(e) => setMissingPolicy(e.target.value)}
        sx={{ minWidth: 150, ...filterSx }} disabled={!canManage}>
        {(resultMeta?.missingMarkPolicies || ['ZERO', 'MINIMUM', 'PENDING']).map((p) => (
          <MenuItem key={p} value={p}>{p}</MenuItem>
        ))}
      </TextField>
      <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refetch}
        sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
        Refresh
      </Button>
      {canManage && (
        <>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleRecalculate}
            disabled={!scopeReady || loading}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: ACCENT, color: ACCENT, '&:hover': { bgcolor: ACCENT_BG } }}>
            Recalculate
          </Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleGenerate}
            disabled={!scopeReady || loading}
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, #0284c7)`, borderRadius: 2, fontWeight: 700, px: 2.5, boxShadow: `0 4px 14px ${ACCENT}33`, '&:hover': { background: 'linear-gradient(135deg, #0284c7, #0369a1)' } }}>
            Generate Results
          </Button>
        </>
      )}
    </Stack>
  );

  const detailSubjects = detail?.subjects || [];
  const detailName = `${detail?.student?.firstName || ''} ${detail?.student?.lastName || ''}`.trim() || 'Student';

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(resultReset())}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(resultReset())}>{success}</Alert>}
      {lastRun?.failures?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {lastRun.failures.length} student(s) could not be calculated: {lastRun.failures.slice(0, 3).map((f) => f.error).join('; ')}
        </Alert>
      )}
      {lastRun?.summary && (
        <Alert severity={lastRun.success ? 'success' : 'info'} sx={{ mb: 2, borderRadius: 2 }}>
          {lastRun.summary.resultType || lastRun.resultType || 'TERM'} window · {lastRun.summary.succeeded ?? 0} students saved ·
          {' '}{lastRun.summary.complete ?? 0} complete · {lastRun.summary.incomplete ?? 0} incomplete ·
          {' '}class average {display(lastRun.summary.classAverage)}
        </Alert>
      )}

      <PageLayout
        title="Term Results"
        subtitle="Authoritative student results computed from recorded assessment marks"
        icon={TableChartIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        canAdd={false}
        searchable={false}
        columns={columns}
        rows={visibleRows}
        loading={loading}
        headerActions={(
          <Button variant="outlined" size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`/${basePath}/results/subjects`)}
            sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.8rem', borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
            Subject Results
          </Button>
        )}
        beforeFilters={(
          <>
            {/* Scope statistics, derived from the rows currently displayed */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
              {[
                { label: 'Students', value: stats.students, color: ACCENT },
                { label: 'Class Average', value: display(stats.classAverage), color: '#2563eb' },
                { label: 'Complete', value: stats.complete, color: '#16a34a' },
                { label: 'Incomplete', value: stats.incomplete, color: '#d97706' },
                { label: 'Ranked', value: stats.ranked, color: '#7c3aed' },
              ].map((s) => (
                <Paper key={s.label} sx={{ flex: '1 1 130px', p: 2.5, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none' }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
                </Paper>
              ))}
            </Box>

            <Box sx={{ mb: 2 }}>{actions}</Box>
            {!scopeReady && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Select a year, term and class to generate or recalculate results. Showing all existing results below.
              </Alert>
            )}
          </>
        )}
        emptyMessage={scopeReady
          ? 'No results for this scope yet — click Generate Results.'
          : 'No results yet. Pick a year, term and class, then generate results.'}
        filters={filters}
        extraActions={(row) => (
          <Tooltip title="View full result">
            <IconButton size="small" onClick={() => setDetail(row)} sx={{ color: '#64748b', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      />

      {/* Result detail */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', pb: 1 }}>
          {detailName} — {detail?.resultType} result
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Average</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: ACCENT }}>{display(detail?.average)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Grade</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{detail?.grade || '—'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Rank</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {detail?.rank ? `#${detail.rank} of ${detail.rankOutOf ?? '—'}` : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Subjects</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {detail?.subjectsCounted ?? 0} / {detail?.subjectsTotal ?? 0}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Status</Typography>
              <Box sx={{ mt: 0.5 }}><StatusBadge value={detail?.status || 'INCOMPLETE'} /></Box>
            </Box>
          </Stack>

          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1 }}>
            {detail?.class?.name || '—'} · {detail?.term?.name || '—'} · Missing-mark policy: {detail?.missingPolicy || '—'}
          </Typography>
          <Divider sx={{ mb: 1.5 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['Subject', 'Value', 'Grade', 'Status'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {detailSubjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                      No subject breakdown stored for this result. Recalculate to rebuild it.
                    </TableCell>
                  </TableRow>
                )}
                {detailSubjects.map((s, i) => {
                  const gc = gradeColor(s.grade);
                  return (
                    <TableRow key={`${s.subject?._id || s.subject || i}`} sx={{ '& td': { borderBottom: '1px solid #f8fafc' } }}>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                        {s.subject?.name || s.subject?.code || 'Unknown subject'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700, color: s.value === null ? '#94a3b8' : '#0f172a' }}>
                        {display(s.value)}
                      </TableCell>
                      <TableCell>
                        {s.grade
                          ? <Chip label={s.grade} size="small" sx={{ bgcolor: gc?.bg, color: gc?.color, fontWeight: 700, fontSize: '0.7rem' }} />
                          : <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: s.status === 'COMPLETE' ? '#16a34a' : '#d97706' }}>
                          {s.status || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetail(null)} sx={{ borderRadius: 2, fontWeight: 600, color: '#64748b' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResultPage;
