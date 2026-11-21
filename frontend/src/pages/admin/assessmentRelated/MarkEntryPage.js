import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, TextField, InputAdornment, Button, IconButton,
  CircularProgress, Alert, Snackbar, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Avatar, Chip, LinearProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GradingIcon from '@mui/icons-material/Grading';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MarkHistoryDialog from '../../../components/assessment/MarkHistoryDialog';
import {
  getAssessment, fetchEnrollmentsForMarking, fetchMarks, fetchMarkHistory,
  recordMark, bulkRecordMarks,
} from '../../../redux/assessmentRelated/assessmentHandle';
import { assessmentClear } from '../../../redux/assessmentRelated/assessmentSlice';

const ACCENT = '#6366f1';
const ACCENT_BG = '#eef2ff';

const scoreColor = (score, max) => {
  if (score === '' || score === null || score === undefined) return null;
  const pct = (Number(score) / max) * 100;
  if (pct >= 80) return { bg: '#dcfce7', color: '#16a34a' };
  if (pct >= 60) return { bg: '#dbeafe', color: '#2563eb' };
  if (pct >= 40) return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#fee2e2', color: '#dc2626' };
};

const MarkEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRole } = useSelector((s) => s.user);
  const { currentAssessment, enrollments, marks, loading, error: reduxError } = useSelector((s) => s.assessment);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => { if (id) dispatch(getAssessment(id)); }, [dispatch, id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => dispatch(assessmentClear()), [dispatch]);

  useEffect(() => {
    if (!currentAssessment) return;
    const yearId = currentAssessment.academicYear?._id || currentAssessment.academicYear;
    const classId = currentAssessment.class?._id || currentAssessment.class;
    dispatch(fetchEnrollmentsForMarking({ academicYear: yearId, class: classId, status: 'ACTIVE' }));
    dispatch(fetchMarks(`?assessment=${currentAssessment._id}`));
  }, [currentAssessment, dispatch]);

  useEffect(() => {
    if (!currentAssessment) return;
    const markByStudent = {};
    marks.forEach((m) => {
      const sid = m.student?._id || m.student;
      if (sid) markByStudent[sid.toString()] = m;
    });
    setRows(enrollments.map((e) => {
      const sid = (e.student?._id || e.student).toString();
      const m = markByStudent[sid] || null;
      const entered = m ? m.entered === true : false;
      const score = m && m.score !== null && m.score !== undefined ? m.score : '';
      const student = e.student || {};
      return {
        studentId: sid,
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || '—',
        admissionNumber: student.admissionNumber || '—',
        entered, score,
        originalEntered: entered, originalScore: score,
        dirty: false, markId: m?._id || null,
      };
    }));
  }, [currentAssessment, enrollments, marks]);

  const maxMarks = currentAssessment?.maxMarks || 100;
  const canWrite = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'].includes(currentRole);
  const readOnly = !canWrite || ['CLOSED', 'CANCELLED'].includes(currentAssessment?.status);
  const step = 0.01;

  const onScoreChange = (studentId, value) => {
    if (readOnly) return;
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      const newEntered = value !== '';
      const newScore = value === '' ? '' : Number(value);
      const dirty = newEntered !== r.originalEntered || (newEntered && newScore !== r.originalScore);
      return { ...r, score: value, entered: newEntered, dirty };
    }));
  };

  const onClear = (studentId) => {
    if (readOnly) return;
    setRows((prev) => prev.map((r) =>
      r.studentId === studentId ? { ...r, score: '', entered: false, dirty: r.originalEntered === true } : r
    ));
    setConfirmClear(null);
  };

  const validateRow = (r) => {
    if (!r.entered) return null;
    if (r.score === '') return 'Score required';
    const num = Number(r.score);
    if (Number.isNaN(num)) return 'Must be a number';
    if (num < 0) return 'Cannot be negative';
    if (num > maxMarks) return `Max is ${maxMarks}`;
    return null;
  };

  const saveRow = async (r) => {
    const vErr = validateRow(r);
    if (vErr) { setToast(vErr); return; }
    setSavingId(r.studentId);
    await dispatch(recordMark({ assessmentId: id, studentId: r.studentId, entered: r.entered, score: r.entered ? Number(r.score) : null, reason: null }));
    setSavingId(null);
    setToast('Mark saved');
    dispatch(fetchMarks(`?assessment=${id}`));
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.dirty);
    if (!dirty.length) { setToast('No changes to save'); return; }
    for (const r of dirty) {
      const vErr = validateRow(r);
      if (vErr) { setToast(`${r.name}: ${vErr}`); return; }
    }
    setSavingAll(true);
    await dispatch(bulkRecordMarks({ assessmentId: id, marks: dirty.map((r) => ({ studentId: r.studentId, entered: r.entered, score: r.entered ? Number(r.score) : null, reason: null })) }));
    setSavingAll(false);
    setToast('All changes saved');
    dispatch(fetchMarks(`?assessment=${id}`));
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.admissionNumber.toLowerCase().includes(q);
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const dirtyCount = rows.filter((r) => r.dirty).length;
  const enteredCount = rows.filter((r) => r.entered).length;
  const completionPct = rows.length ? Math.round((enteredCount / rows.length) * 100) : 0;

  if (loading && !currentAssessment) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }
  if (!currentAssessment) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{reduxError || 'Assessment not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const STATUS_STYLE = { ACTIVE: { bg: '#dcfce7', color: '#16a34a' }, DRAFT: { bg: '#dbeafe', color: '#2563eb' }, CLOSED: { bg: '#f1f5f9', color: '#64748b' }, CANCELLED: { bg: '#fee2e2', color: '#dc2626' } };
  const ss = STATUS_STYLE[currentAssessment.status] || { bg: '#f1f5f9', color: '#64748b' };

  return (
    <Box>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f1f5f9' } }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Avatar sx={{ width: 44, height: 44, bgcolor: ACCENT_BG, borderRadius: 2 }}>
          <GradingIcon sx={{ color: ACCENT, fontSize: 22 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.2 }}>
            {currentAssessment.name}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {currentAssessment.subject?.name} · {currentAssessment.class?.name} · {currentAssessment.term?.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: ss.bg }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ss.color, mr: 0.75 }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: ss.color }}>{currentAssessment.status}</Typography>
        </Box>
      </Box>

      {/* Stats bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Students', value: rows.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Marks Entered', value: enteredCount, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Missing', value: rows.length - enteredCount, color: '#d97706', bg: '#fef3c7' },
          { label: 'Max Marks', value: maxMarks, color: '#2563eb', bg: '#dbeafe' },
        ].map((s) => (
          <Paper key={s.label} sx={{ flex: '1 1 140px', p: 2, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none' }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Completion bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Completion</Typography>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: ACCENT }}>{completionPct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={completionPct}
          sx={{ height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 4 } }} />
      </Paper>

      {readOnly && (
        <Alert severity="info" icon={<WarningAmberIcon />} sx={{ mb: 2.5, borderRadius: 2, border: '1px solid #bfdbfe' }}>
          This assessment is <strong>{currentAssessment.status}</strong> — marks are read-only.
        </Alert>
      )}
      {reduxError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{reduxError}</Alert>}

      {/* Search + Save All */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search by name or admission no."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
          sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: ACCENT }, '&.Mui-focused fieldset': { borderColor: ACCENT } } }}
        />
        {!readOnly && (
          <Button variant="contained" startIcon={savingAll ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
            disabled={savingAll || dirtyCount === 0} onClick={saveAll}
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, #4f46e5)`, borderRadius: 2, fontWeight: 700, px: 3, boxShadow: `0 4px 14px ${ACCENT}33`, '&:hover': { background: `linear-gradient(135deg, #4f46e5, #4338ca)` }, '&:disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' } }}>
            {savingAll ? 'Saving…' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </Button>
        )}
        {dirtyCount > 0 && (
          <Chip label={`${dirtyCount} unsaved change${dirtyCount > 1 ? 's' : ''}`} size="small"
            sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: '0.75rem' }} />
        )}
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['#', 'Student', `Score / ${maxMarks}`, 'Status', 'Actions'].map((h, i) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, py: 1.5, borderBottom: '1px solid #f1f5f9', textAlign: i === 4 ? 'right' : 'left' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: ACCENT_BG, mx: 'auto', mb: 1.5, borderRadius: 2 }}>
                      <GradingIcon sx={{ color: ACCENT }} />
                    </Avatar>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>No students found.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((r, idx) => {
                const vErr = r.dirty ? validateRow(r) : null;
                const sc = r.entered ? scoreColor(r.score, maxMarks) : null;
                return (
                  <TableRow key={r.studentId} hover sx={{ '&:hover': { bgcolor: '#fafafa' }, '& td': { borderBottom: '1px solid #f8fafc' }, ...(r.dirty ? { bgcolor: '#fefce8' } : {}) }}>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, py: 1.5, width: 48 }}>
                      {page * rowsPerPage + idx + 1}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.7rem', fontWeight: 700 }}>
                          {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{r.name}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.admissionNumber}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, width: 180 }}>
                      <TextField size="small" type="number" value={r.score} disabled={readOnly}
                        error={Boolean(vErr)} helperText={vErr || ''}
                        onChange={(e) => onScoreChange(r.studentId, e.target.value)}
                        inputProps={{ min: 0, max: maxMarks, step }}
                        sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: readOnly ? '#f8fafc' : '#fff', '& fieldset': { borderColor: vErr ? '#ef4444' : '#e2e8f0' }, '&:hover fieldset': { borderColor: vErr ? '#ef4444' : ACCENT }, '&.Mui-focused fieldset': { borderColor: vErr ? '#ef4444' : ACCENT } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      {r.entered ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: sc?.bg || '#f1f5f9' }}>
                          <CheckCircleOutlineIcon sx={{ fontSize: 12, color: sc?.color || '#64748b', mr: 0.5 }} />
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: sc?.color || '#64748b' }}>{r.score}</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: '#fef3c7' }}>
                          <WarningAmberIcon sx={{ fontSize: 12, color: '#d97706', mr: 0.5 }} />
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>Missing</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'right' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {!readOnly && r.dirty && (
                          <Tooltip title="Save this mark">
                            <IconButton size="small" disabled={savingId === r.studentId || Boolean(vErr)} onClick={() => saveRow(r)}
                              sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT_BG } }}>
                              {savingId === r.studentId ? <CircularProgress size={14} sx={{ color: ACCENT }} /> : <SaveIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {!readOnly && (
                          <Tooltip title="Mark as missing">
                            <IconButton size="small" disabled={!r.entered && !r.dirty} onClick={() => setConfirmClear(r)}
                              sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {r.markId && (
                          <Tooltip title="View history">
                            <IconButton size="small" onClick={() => { setHistoryFor(r); dispatch(fetchMarkHistory(r.markId)); }}
                              sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
                              <HistoryIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          sx={{ borderTop: '1px solid #f1f5f9', '& .MuiTablePagination-toolbar': { fontSize: '0.82rem' } }}
        />
      </Paper>

      {historyFor && <MarkHistoryDialog open onClose={() => setHistoryFor(null)} markId={historyFor.markId} studentName={historyFor.name} />}

      <Dialog open={Boolean(confirmClear)} onClose={() => setConfirmClear(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Mark as Missing?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
            This will remove <strong>{confirmClear?.name}</strong>'s score. A real zero is different from a missing mark.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmClear(null)} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => onClear(confirmClear?.studentId)}
            sx={{ borderRadius: 2, fontWeight: 700 }}>Mark Missing</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{ sx: { borderRadius: 2, fontWeight: 600 } }} />
    </Box>
  );
};

export default MarkEntryPage;
