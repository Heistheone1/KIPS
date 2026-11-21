import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, MenuItem, Stack, Alert, Typography, Avatar, Paper,
  Button, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PublishIcon from '@mui/icons-material/Publish';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  fetchReports, generateReports, generatePeriodReports, reviewReport, approveReport, publishReport, invalidateReport,
} from '../../../redux/reportRelated/reportHandle';
import { reportReset } from '../../../redux/reportRelated/reportSlice';
import { fetchAcademicYears, fetchTerms, fetchClasses } from '../../../redux/academicRelated/academicHandle';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';

const BASE_PATH = { ADMIN: 'admin', DOS: 'dos', CLASS_TEACHER: 'class-teacher', TEACHER: 'teacher' };
const ACCENT = '#8b5cf6';
const ACCENT_BG = '#f5f3ff';

const STATUS_PIPELINE = ['GENERATED', 'REVIEWED', 'APPROVED', 'PUBLISHED'];
const PERIOD_TYPES = ['CAT', 'MID_TERM', 'QUIZ', 'TEST'];
const STATUS_STYLES = {
  GENERATED: { bg: '#dbeafe', color: '#2563eb' },
  REVIEWED:  { bg: '#f3e8ff', color: '#7c3aed' },
  APPROVED:  { bg: '#dcfce7', color: '#16a34a' },
  PUBLISHED: { bg: '#dcfce7', color: '#059669' },
};

const filterSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

const ReportCardsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { reports, loading, error, success } = useSelector((s) => s.report);
  const { academicYears, terms, classes } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const basePath = BASE_PATH[currentRole] || 'admin';

  const canGenerate = ['ADMIN', 'DOS'].includes(currentRole);
  const canReview = ['ADMIN', 'DOS', 'CLASS_TEACHER'].includes(currentRole);
  const canApprovePublish = ['ADMIN', 'DOS'].includes(currentRole);

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStale, setFilterStale] = useState('');
  const [filterPeriodType, setFilterPeriodType] = useState('');
  const [noteDialog, setNoteDialog] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchTerms());
    dispatch(fetchClasses());
  }, [dispatch]);

  const buildQs = () => {
    const p = new URLSearchParams();
    if (filterYear) p.set('academicYear', filterYear);
    if (filterTerm) p.set('term', filterTerm);
    if (filterClass) p.set('class', filterClass);
    if (filterStatus) p.set('status', filterStatus);
    if (filterStale) p.set('stale', filterStale);
    if (filterPeriodType) p.set('periodType', filterPeriodType);
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  };

  useEffect(() => {
    dispatch(fetchReports(buildQs()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterTerm, filterClass, filterStatus, filterStale, filterPeriodType, dispatch]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => dispatch(reportReset()), 2500); return () => clearTimeout(t); }
  }, [success, dispatch]);

  const refetch = () => dispatch(fetchReports(buildQs()));

  const openNote = (action, id) => { setNoteDialog({ action, id }); setNote(''); };

  const submitNote = () => {
    if (!noteDialog) return;
    const { action, id } = noteDialog;
    const done = () => { setNoteDialog(null); setNote(''); refetch(); };
    if (action === 'review') dispatch(reviewReport(id, note, done));
    else if (action === 'approve') dispatch(approveReport(id, note, done));
    else if (action === 'invalidate') dispatch(invalidateReport(id, note, done));
    else done();
  };

  const doAction = (action, id) => {
    if (action === 'publish') dispatch(publishReport(id, refetch));
    else openNote(action, id);
  };

  // Status counts for pipeline display
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_PIPELINE.forEach((s) => { counts[s] = 0; });
    reports.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return counts;
  }, [reports]);

  const columns = useMemo(() => [
    {
      key: 'student', label: 'Student',
      render: (r) => {
        const name = `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.7rem', fontWeight: 700 }}>
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{name}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.student?.admissionNumber || '—'}</Typography>
            </Box>
          </Box>
        );
      },
    },
    { key: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
    { key: 'term', label: 'Term', render: (r) => r.term?.name || '—' },
    {
      key: 'currentVersion', label: 'Version',
      render: (r) => (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f1f5f9', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
          v{r.currentVersion}
        </Box>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (r) => {
        const s = STATUS_STYLES[r.status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: s.bg }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, mr: 0.75 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{r.status}</Typography>
          </Box>
        );
      },
    },
    {
      key: 'isStale', label: 'Stale',
      render: (r) => r.isStale
        ? <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#fef3c7' }}>
            <WarningAmberIcon sx={{ fontSize: 12, color: '#d97706' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>STALE</Typography>
          </Box>
        : <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</Typography>,
    },
  ], []);

  const extraActions = (row) => (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="View Report">
        <IconButton size="small" onClick={() => navigate(`/${basePath}/reports/${row._id}`)}
          sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT_BG } }}>
          <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {row.status === 'GENERATED' && !row.isStale && canReview && (
        <Tooltip title="Review">
          <IconButton size="small" onClick={() => doAction('review', row._id)}
            sx={{ color: '#7c3aed', '&:hover': { bgcolor: '#f5f3ff' } }}>
            <RateReviewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      {row.status === 'REVIEWED' && !row.isStale && canApprovePublish && (
        <Tooltip title="Approve">
          <IconButton size="small" onClick={() => doAction('approve', row._id)}
            sx={{ color: '#16a34a', '&:hover': { bgcolor: '#dcfce7' } }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      {row.status === 'APPROVED' && !row.isStale && canApprovePublish && (
        <Tooltip title="Publish">
          <IconButton size="small" onClick={() => doAction('publish', row._id)}
            sx={{ color: '#059669', '&:hover': { bgcolor: '#d1fae5' } }}>
            <PublishIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      {row.status === 'PUBLISHED' && canApprovePublish && (
        <Tooltip title="Invalidate">
          <IconButton size="small" onClick={() => doAction('invalidate', row._id)}
            sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
            <BlockIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const filters = (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1.5 }}>
      <TextField select label="Year" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterTerm(''); }} size="small" sx={{ minWidth: 160, ...filterSx }}>
        <MenuItem value="">All Years</MenuItem>
        {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
      </TextField>
      <TextField select label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} size="small" sx={{ minWidth: 140, ...filterSx }}>
        <MenuItem value="">All Terms</MenuItem>
        {(filterYear ? terms.filter((t) => (t.academicYear?._id || t.academicYear) === filterYear) : terms).map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
      </TextField>
      <TextField select label="Class" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} size="small" sx={{ minWidth: 140, ...filterSx }}>
        <MenuItem value="">All Classes</MenuItem>
        {classes.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField select label="Report Type" value={filterPeriodType} onChange={(e) => setFilterPeriodType(e.target.value)} size="small" sx={{ minWidth: 150, ...filterSx }}>
        <MenuItem value="">Term Reports</MenuItem>
        {PERIOD_TYPES.map((p) => <MenuItem key={p} value={p}>{p} Reports</MenuItem>)}
      </TextField>
      <TextField select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small" sx={{ minWidth: 140, ...filterSx }}>
        <MenuItem value="">All Statuses</MenuItem>
        {STATUS_PIPELINE.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
      <TextField select label="Stale" value={filterStale} onChange={(e) => setFilterStale(e.target.value)} size="small" sx={{ minWidth: 120, ...filterSx }}>
        <MenuItem value="">Any</MenuItem>
        <MenuItem value="true">Stale only</MenuItem>
        <MenuItem value="false">Not stale</MenuItem>
      </TextField>
    </Stack>
  );

  const noteTitle = noteDialog
    ? { review: 'Review Report', approve: 'Approve Report', invalidate: 'Invalidate Report' }[noteDialog.action]
    : '';

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(reportReset())}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* Workflow pipeline */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {STATUS_PIPELINE.map((s) => {
          const st = STATUS_STYLES[s];
          return (
            <Paper key={s} sx={{ flex: '1 1 140px', p: 2.5, borderRadius: 2.5, border: `1px solid ${st.bg}`, boxShadow: 'none', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${st.color}20` } }}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s}</Typography>
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: st.color, lineHeight: 1.2 }}>{statusCounts[s]}</Typography>
              {filterStatus === s && <Box sx={{ width: 24, height: 3, bgcolor: st.color, borderRadius: 2, mt: 0.5 }} />}
            </Paper>
          );
        })}
        {canGenerate && (
          <Stack direction="row" spacing={1} sx={{ flex: '1 1 140px' }}>
            <Paper sx={{ flex: '1 1 140px', p: 2.5, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Button variant="contained" startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
                disabled={!filterYear || !filterTerm || !filterClass || loading} onClick={() => dispatch(generateReports({ academicYear: filterYear, term: filterTerm, class: filterClass }, refetch))}
                sx={{ background: `linear-gradient(135deg, ${ACCENT}, #7c3aed)`, borderRadius: 2, fontWeight: 700, fontSize: '0.82rem', boxShadow: `0 4px 14px ${ACCENT}33`, '&:hover': { background: `linear-gradient(135deg, #7c3aed, #6d28d9)` }, '&:disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' } }}>
                Generate Term
              </Button>
            </Paper>
            <Paper sx={{ flex: '1 1 140px', p: 2.5, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<ArticleIcon />}
                disabled={!filterYear || !filterTerm || !filterClass || loading} onClick={() => dispatch(generatePeriodReports({ academicYear: filterYear, term: filterTerm, class: filterClass, periodType: filterPeriodType || 'CAT' }, refetch))}
                sx={{ background: `linear-gradient(135deg, #06b6d4, #0891b2)`, borderRadius: 2, fontWeight: 700, fontSize: '0.82rem', boxShadow: '0 4px 14px #06b6d433', '&:hover': { background: `linear-gradient(135deg, #0891b2, #0e7490)` }, '&:disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' } }}>
                Generate {filterPeriodType || 'CAT'}
              </Button>
            </Paper>
          </Stack>
        )}
      </Box>

      <PageLayout
        title="Report Cards"
        subtitle="Generate, review, approve and publish student report cards"
        icon={ArticleIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        canAdd={false}
        columns={columns}
        rows={reports}
        loading={loading}
        extraActions={extraActions}
        emptyMessage="No report cards yet. Generate results first, then generate reports for a class and term."
        filters={filters}
      />

      <Dialog open={Boolean(noteDialog)} onClose={() => setNoteDialog(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>{noteTitle}</DialogTitle>
        <DialogContent>
          {noteDialog?.action === 'invalidate' && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Invalidating flags this report as stale. Correct the data, recalculate, regenerate and re-approve before publishing again.
            </Alert>
          )}
          <TextField autoFocus margin="dense" fullWidth multiline minRows={2}
            label={noteDialog?.action === 'invalidate' ? 'Reason (optional)' : 'Note (optional)'}
            value={note} onChange={(e) => setNote(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNoteDialog(null)} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" disabled={loading} onClick={submitNote}
            color={noteDialog?.action === 'invalidate' ? 'error' : 'primary'}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : noteDialog?.action === 'invalidate' ? 'Invalidate' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportCardsPage;
