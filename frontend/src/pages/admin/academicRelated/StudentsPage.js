import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  TextField, MenuItem, Stack, Alert, Box, Typography, Avatar,
  Stepper, Step, StepLabel, Button, Divider, Chip, Grid, Paper,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress,
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchStudents, updateStudent, createStudentWithEnrollment,
  fetchAcademicYears, fetchClasses,
} from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import FormDrawer from '../../../components/academic/FormDrawer';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const ACCENT = '#d97706';
const ACCENT_BG = '#fef3c7';
const STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const ENROLL_STATUSES = ['ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN', 'INACTIVE'];
const STEPS = ['Student Info', 'Class Enrollment'];

const LEVEL_COLORS = {
  NURSERY: { bg: '#fce7f3', color: '#db2777' },
  PRIMARY: { bg: '#dbeafe', color: '#2563eb' },
};

const emptyStudent = {
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '',
  guardianEmail: '', status: 'ACTIVE',
};
const emptyEnrollment = { academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const initials = (r) => `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase();

const GENDER_COLORS = {
  MALE: { bg: '#dbeafe', color: '#2563eb' },
  FEMALE: { bg: '#fce7f3', color: '#db2777' },
  OTHER: { bg: '#f1f5f9', color: '#64748b' },
};

// ── Class Card ────────────────────────────────────────────────────────────────
const ClassCard = ({ cls, studentCount, onClick }) => {
  const lc = LEVEL_COLORS[cls.level] || { bg: '#f1f5f9', color: '#64748b' };
  const pct = cls.capacity ? Math.min(100, Math.round((studentCount / cls.capacity) * 100)) : null;
  const barColor = pct === null ? ACCENT : pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.5, borderRadius: 3, border: '1.5px solid #f1f5f9', cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.18s',
        '&:hover': { borderColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}22`, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar sx={{ width: 42, height: 42, bgcolor: ACCENT_BG, borderRadius: 2, fontWeight: 800, fontSize: '0.85rem', color: ACCENT }}>
          {cls.code}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{cls.name}</Typography>
          {cls.academicYear?.name && (
            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{cls.academicYear.name}</Typography>
          )}
        </Box>
        {cls.level && (
          <Box sx={{ px: 1.2, py: 0.3, borderRadius: 99, bgcolor: lc.bg }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: lc.color }}>{cls.level}</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: pct !== null ? 1 : 0 }}>
        <PeopleAltIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
        <Typography sx={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700 }}>
          {studentCount} student{studentCount !== 1 ? 's' : ''}
          {cls.capacity ? ` / ${cls.capacity}` : ''}
        </Typography>
      </Box>

      {pct !== null && (
        <Box>
          <Box sx={{ height: 5, bgcolor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: barColor, borderRadius: 99, transition: 'width 0.4s' }} />
          </Box>
          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mt: 0.4, textAlign: 'right' }}>{pct}% full</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ── Student Detail Dialog ─────────────────────────────────────────────────────
const StudentDetailDialog = ({ student, enrollment, onClose, onEdit, onDelete, canWrite }) => {
  if (!student) return null;
  const gc = GENDER_COLORS[student.gender] || { bg: '#f1f5f9', color: '#64748b' };
  const Row = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9, borderBottom: '1px solid #f8fafc' }}>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</Typography>
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 800, fontSize: '1rem' }}>
            {initials(student)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Adm: {student.admissionNumber}</Typography>
          </Box>
          {student.gender && (
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 99, bgcolor: gc.bg }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: gc.color }}>{student.gender}</Typography>
            </Box>
          )}
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={0}>
          <Row label="Date of Birth" value={student.dateOfBirth?.slice(0, 10)} />
          <Row label="Status" value={student.status} />
          <Row label="Guardian" value={student.guardianName} />
          <Row label="Guardian Phone" value={student.guardianPhone} />
          <Row label="Guardian Email" value={student.guardianEmail} />
        </Stack>
        {enrollment && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', mb: 1 }}>ENROLLMENT</Typography>
            <Row label="Class" value={enrollment.class?.name} />
            <Row label="Academic Year" value={enrollment.academicYear?.name} />
            <Row label="Enrolled On" value={enrollment.enrollmentDate?.slice(0, 10)} />
            <Row label="Enrollment Status" value={enrollment.status} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Close</Button>
        {canWrite && (
          <>
            <Button onClick={() => { onClose(); onEdit(student); }} startIcon={<EditIcon />}
              variant="outlined" sx={{ borderRadius: 2, borderColor: ACCENT, color: ACCENT, fontWeight: 700 }}>
              Edit
            </Button>
            <Button onClick={() => { onClose(); onDelete(student); }} startIcon={<DeleteIcon />}
              variant="outlined" sx={{ borderRadius: 2, borderColor: '#dc2626', color: '#dc2626', fontWeight: 700 }}>
              Delete
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
const DeleteConfirmDialog = ({ student, onClose, onConfirm, loading }) => (
  <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
    <DialogTitle>
      <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>Delete Student?</Typography>
    </DialogTitle>
    <DialogContent>
      <Typography sx={{ fontSize: '0.88rem', color: '#64748b' }}>
        Are you sure you want to delete <strong>{student?.firstName} {student?.lastName}</strong>? This cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Cancel</Button>
      <Button onClick={onConfirm} disabled={loading} variant="contained"
        sx={{ borderRadius: 2, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, fontWeight: 700 }}>
        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Class Students View ───────────────────────────────────────────────────────
const ClassStudentsView = ({ cls, onBack, canWrite, academicYears, classes, allClasses, loading, error, success, dispatch }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [detailStudent, setDetailStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(0);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [enrollForm, setEnrollForm] = useState({ ...emptyEnrollment, class: cls._id, academicYear: cls.academicYear?._id || cls.academicYear || '' });
  const [step1Error, setStep1Error] = useState('');

  const loadEnrollments = useCallback(async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/enrollments?class=${cls._id}`, { withCredentials: true });
      setEnrollments(res.data.enrollments || []);
    } catch { setEnrollments([]); }
    setFetching(false);
  }, [cls._id]);

  useEffect(() => { loadEnrollments(); }, [loadEnrollments]);

  useEffect(() => {
    if (success) {
      setDrawerOpen(false);
      setStep(0);
      setStudentForm(emptyStudent);
      setEnrollForm({ ...emptyEnrollment, class: cls._id, academicYear: cls.academicYear?._id || cls.academicYear || '' });
      dispatch(academicReset());
      loadEnrollments();
    }
  }, [success, dispatch, cls._id, cls.academicYear, loadEnrollments]);

  const handleOpenAdd = () => {
    setEditing(null);
    setStep(0);
    setStep1Error('');
    setStudentForm(emptyStudent);
    setEnrollForm({ ...emptyEnrollment, class: cls._id, academicYear: cls.academicYear?._id || cls.academicYear || '' });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditing(student);
    setStep(0);
    setStep1Error('');
    setStudentForm({
      firstName: student.firstName, middleName: student.middleName || '',
      lastName: student.lastName, dateOfBirth: student.dateOfBirth?.slice(0, 10) || '',
      gender: student.gender || '', guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '', guardianEmail: student.guardianEmail || '',
      status: student.status,
    });
    setDrawerOpen(true);
  };

  const sf = (k) => (e) => setStudentForm((p) => ({ ...p, [k]: e.target.value }));
  const ef = (k) => (e) => setEnrollForm((p) => ({ ...p, [k]: e.target.value }));

  const validateStep1 = () => {
    if (!studentForm.firstName.trim()) return 'First name is required';
    if (!studentForm.lastName.trim()) return 'Last name is required';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setStep1Error(err); return; }
    setStep1Error('');
    setStep(1);
  };

  const handleSubmit = async () => {
    if (editing) {
      const { admissionNumber, ...upd } = studentForm;
      dispatch(updateStudent(editing._id, { ...upd, dateOfBirth: studentForm.dateOfBirth || null, gender: studentForm.gender || null }));
      return;
    }
    if (!enrollForm.academicYear || !enrollForm.class) return;
    await dispatch(createStudentWithEnrollment(
      { ...studentForm, level: classes.find((c) => c._id === enrollForm.class)?.level, dateOfBirth: studentForm.dateOfBirth || null, gender: studentForm.gender || null },
      { academicYear: enrollForm.academicYear, class: enrollForm.class, enrollmentDate: enrollForm.enrollmentDate || undefined, status: enrollForm.status },
    ));
    loadEnrollments();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf-token`, { withCredentials: true });
      await axios.delete(`${BASE_URL}/api/students/${deleteTarget._id}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      });
      setDeleteMsg(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`);
      setDeleteTarget(null);
      loadEnrollments();
    } catch (e) {
      setDeleteMsg(e.response?.data?.message || 'Failed to delete student');
      setDeleteTarget(null);
    }
    setDeleteLoading(false);
  };

  const filteredClasses = enrollForm.academicYear
    ? allClasses.filter((c) => (c.academicYear?._id || c.academicYear) === enrollForm.academicYear)
    : allClasses;

  const filtered = search.trim()
    ? enrollments.filter((e) => {
        const s = e.student;
        if (!s) return false;
        const q = search.toLowerCase();
        return `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(q);
      })
    : enrollments;

  const isStep2Valid = enrollForm.academicYear && enrollForm.class;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <ArrowBackIcon sx={{ fontSize: 18, color: '#64748b' }} />
        </IconButton>
        <Avatar sx={{ width: 44, height: 44, bgcolor: ACCENT_BG, borderRadius: 2, fontWeight: 800, color: ACCENT, fontSize: '0.85rem' }}>
          {cls.code}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>{cls.name}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {cls.academicYear?.name} {cls.level ? `· ${cls.level}` : ''} · {enrollments.length} student{enrollments.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {canWrite && (
          <Button onClick={handleOpenAdd} variant="contained" startIcon={<PeopleAltIcon />}
            sx={{ borderRadius: 2, px: 2.5, fontWeight: 700, fontSize: '0.82rem', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, boxShadow: `0 4px 14px ${ACCENT}33` }}>
            Add Student
          </Button>
        )}
      </Box>

      {deleteMsg && <Alert severity={deleteMsg.includes('deleted') ? 'success' : 'error'} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setDeleteMsg('')}>{deleteMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 0.5 }} /> }}
          sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: ACCENT }, '&.Mui-focused fieldset': { borderColor: ACCENT } } }} />
      </Box>

      {/* Students Table */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {fetching || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: ACCENT }} /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: ACCENT_BG, mx: 'auto', mb: 2, borderRadius: 2.5 }}>
              <PeopleAltIcon sx={{ fontSize: 28, color: ACCENT }} />
            </Avatar>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>No students in this class yet.</Typography>
            {canWrite && <Button onClick={handleOpenAdd} size="small" sx={{ mt: 1.5, color: ACCENT, fontWeight: 700 }}>+ Add Student</Button>}
          </Box>
        ) : (
          <Box>
            {/* Table header */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['Student', 'Gender', 'Guardian', 'Status', 'Actions'].map((h) => (
                <Typography key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</Typography>
              ))}
            </Box>
            {filtered.map((enr) => {
              const s = enr.student;
              if (!s) return null;
              const gc = GENDER_COLORS[s.gender] || { bg: '#f1f5f9', color: '#64748b' };
              return (
                <Box key={enr._id} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', px: 2.5, py: 1.5, borderBottom: '1px solid #f8fafc', alignItems: 'center', '&:hover': { bgcolor: '#fafafa' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.7rem', fontWeight: 700 }}>{initials(s)}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.83rem', color: '#0f172a' }}>{s.firstName} {s.lastName}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.admissionNumber}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    {s.gender ? <Box sx={{ display: 'inline-block', px: 1.2, py: 0.25, borderRadius: 99, bgcolor: gc.bg }}><Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: gc.color }}>{s.gender}</Typography></Box> : <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#334155' }}>{s.guardianName || '—'}</Typography>
                  <Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.2, py: 0.3, borderRadius: 99, bgcolor: s.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9' }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: s.status === 'ACTIVE' ? '#16a34a' : '#94a3b8', mr: 0.6 }} />
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: s.status === 'ACTIVE' ? '#16a34a' : '#64748b' }}>{s.status}</Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="View"><IconButton size="small" onClick={() => setDetailStudent({ student: s, enrollment: enr })} sx={{ color: '#64748b', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}><VisibilityIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    {canWrite && <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenEdit(s)} sx={{ color: '#64748b', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
                    {canWrite && <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(s)} sx={{ color: '#64748b', '&:hover': { color: '#dc2626', bgcolor: '#fee2e2' } }}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
      {!fetching && filtered.length > 0 && (
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1.5, textAlign: 'right' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</Typography>
      )}

      {/* Student Detail Dialog */}
      {detailStudent && (
        <StudentDetailDialog
          student={detailStudent.student}
          enrollment={detailStudent.enrollment}
          onClose={() => setDetailStudent(null)}
          onEdit={(s) => { setDetailStudent(null); handleOpenEdit(s); }}
          onDelete={(s) => { setDetailStudent(null); setDeleteTarget(s); }}
          canWrite={canWrite}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirmDialog student={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleteLoading} />
      )}

      {/* Add / Edit Drawer */}
      <FormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setStep(0); dispatch(academicReset()); }}
        title={editing ? 'Edit Student' : 'Register New Student'}
        subtitle={editing ? `Editing: ${editing.firstName} ${editing.lastName}` : step === 0 ? 'Step 1 of 2 — Student details' : 'Step 2 of 2 — Class enrollment'}
        onSubmit={editing ? handleSubmit : (step === 0 ? handleNext : handleSubmit)}
        submitLabel={editing ? 'Save Changes' : (step === 0 ? 'Next: Enroll in Class' : 'Register & Enroll')}
        submitIcon={editing ? undefined : (step === 0 ? <ArrowForwardIcon /> : <CheckCircleOutlineIcon />)}
        loading={loading}
        error={error}
        accentColor={ACCENT}
        submitDisabled={!editing && step === 1 && !isStep2Valid}
        extraActions={!editing && step === 1 ? (
          <Button startIcon={<ArrowBackIcon />} onClick={() => setStep(0)} sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}>Back</Button>
        ) : undefined}
      >
        {!editing && (
          <Box sx={{ mb: 3 }}>
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.78rem', fontWeight: 600 }, '& .MuiStepIcon-root.Mui-active': { color: ACCENT }, '& .MuiStepIcon-root.Mui-completed': { color: ACCENT } }}>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {(editing || step === 0) && (
          <Stack spacing={2.5}>
            {step1Error && <Alert severity="error" sx={{ borderRadius: 2 }}>{step1Error}</Alert>}
            <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.82rem', bgcolor: '#f0fdf4', color: '#065f46' }}>
              Admission number will be auto-generated as <strong>YEAR + LEVEL + SEQUENCE</strong> (e.g. 20262701001) after enrollment.
            </Alert>
            <Stack direction="row" spacing={2}>
              <TextField label="First Name" value={studentForm.firstName} onChange={sf('firstName')} fullWidth required sx={fieldSx} />
              <TextField label="Last Name" value={studentForm.lastName} onChange={sf('lastName')} fullWidth required sx={fieldSx} />
            </Stack>
            <TextField label="Middle Name" value={studentForm.middleName} onChange={sf('middleName')} fullWidth sx={fieldSx} />
            <TextField label="Date of Birth" type="date" value={studentForm.dateOfBirth} onChange={sf('dateOfBirth')} fullWidth InputLabelProps={{ shrink: true }} sx={fieldSx} />
            <TextField select label="Gender" value={studentForm.gender} onChange={sf('gender')} fullWidth sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
            <Divider sx={{ my: 0.5 }}><Chip label="Guardian Info" size="small" sx={{ fontSize: '0.7rem', bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 700 }} /></Divider>
            <TextField label="Guardian Name" value={studentForm.guardianName} onChange={sf('guardianName')} fullWidth sx={fieldSx} />
            <Stack direction="row" spacing={2}>
              <TextField label="Guardian Phone" value={studentForm.guardianPhone} onChange={sf('guardianPhone')} fullWidth sx={fieldSx} />
              <TextField label="Guardian Email" type="email" value={studentForm.guardianEmail} onChange={sf('guardianEmail')} fullWidth sx={fieldSx} />
            </Stack>
            <TextField select label="Status" value={studentForm.status} onChange={sf('status')} fullWidth sx={fieldSx}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
        )}

        {!editing && step === 1 && (
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.82rem' }}>
              Enrolling <strong>{studentForm.firstName} {studentForm.lastName}</strong> — class is pre-selected.
            </Alert>
            <TextField select label="Academic Year" value={enrollForm.academicYear}
              onChange={(e) => setEnrollForm((p) => ({ ...p, academicYear: e.target.value, class: '' }))}
              fullWidth required sx={fieldSx}>
              <MenuItem value="">— Select Academic Year —</MenuItem>
              {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
            </TextField>
            <TextField select label="Class" value={enrollForm.class} onChange={ef('class')} fullWidth required sx={fieldSx}
              disabled={!enrollForm.academicYear} helperText={!enrollForm.academicYear ? 'Select an academic year first' : ''}>
              <MenuItem value="">— Select Class —</MenuItem>
              {filteredClasses.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}{c.section ? ` (${c.section})` : ''}</MenuItem>)}
            </TextField>
            <TextField label="Enrollment Date" type="date" value={enrollForm.enrollmentDate} onChange={ef('enrollmentDate')} fullWidth InputLabelProps={{ shrink: true }} sx={fieldSx} />
            <TextField select label="Enrollment Status" value={enrollForm.status} onChange={ef('status')} fullWidth sx={fieldSx}>
              {ENROLL_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>
        )}
      </FormDrawer>
    </Box>
  );
};

// ── Class Group ──────────────────────────────────────────────────────────────
const ClassGroup = ({ label, items, color, bg, onSelect, countForClass }) => {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 20, borderRadius: 99, bgcolor: color }} />
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Typography>
        <Box sx={{ px: 1.2, py: 0.2, borderRadius: 99, bgcolor: bg }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color }}>{items.length}</Typography>
        </Box>
      </Box>
      <Grid container spacing={2}>
        {items.map((cls) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={cls._id}>
            <ClassCard cls={cls} studentCount={countForClass(cls._id)} onClick={() => onSelect(cls)} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// ── Main StudentsPage ─────────────────────────────────────────────────────────
const StudentsPage = () => {
  const dispatch = useDispatch();
  const { students, academicYears, classes, enrollments, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchClasses(filterYear ? `?academicYear=${filterYear}` : ''));
  }, [filterYear, dispatch]);

  const [allEnrollments, setAllEnrollments] = useState([]);
  useEffect(() => {
    axios.get(`${BASE_URL}/api/enrollments`, { withCredentials: true })
      .then((r) => setAllEnrollments(r.data.enrollments || []))
      .catch(() => {});
  }, [success]);

  const countForClass = (classId) =>
    allEnrollments.filter((e) => (e.class?._id || e.class) === classId && e.status === 'ACTIVE').length;

  const filteredClasses = classes.filter((c) => {
    if (filterLevel && c.level !== filterLevel) return false;
    return true;
  });

  // Group by level
  const nursery = filteredClasses.filter((c) => c.level === 'NURSERY');
  const primary = filteredClasses.filter((c) => c.level === 'PRIMARY');
  const other = filteredClasses.filter((c) => !c.level || (c.level !== 'NURSERY' && c.level !== 'PRIMARY'));

  if (selectedClass) {
    return (
      <ClassStudentsView
        cls={selectedClass}
        onBack={() => setSelectedClass(null)}
        canWrite={canWrite}
        academicYears={academicYears}
        classes={classes}
        allClasses={classes}
        loading={loading}
        error={error}
        success={success}
        dispatch={dispatch}
      />
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: ACCENT_BG, borderRadius: 2.5 }}>
            <ClassOutlinedIcon sx={{ fontSize: 24, color: ACCENT }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>Students</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', mt: 0.25 }}>Select a class to view and manage its students</Typography>
          </Box>
        </Box>
        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Classes', value: classes.length, color: ACCENT, bg: ACCENT_BG },
            { label: 'Total Students', value: students.length, color: '#2563eb', bg: '#dbeafe' },
          ].map((s) => (
            <Paper key={s.label} sx={{ px: 2.5, py: 1.5, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none', minWidth: 110 }}>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{s.label}</Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField select label="Filter by Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} size="small"
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          <MenuItem value="">All Years</MenuItem>
          {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
        </TextField>
        <TextField select label="Filter by Level" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} size="small"
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          <MenuItem value="">All Levels</MenuItem>
          <MenuItem value="NURSERY">Nursery</MenuItem>
          <MenuItem value="PRIMARY">Primary</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: ACCENT }} /></Box>
      ) : filteredClasses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: ACCENT_BG, mx: 'auto', mb: 2, borderRadius: 3 }}>
            <ClassOutlinedIcon sx={{ fontSize: 32, color: ACCENT }} />
          </Avatar>
          <Typography sx={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>No classes found. Create classes first.</Typography>
        </Box>
      ) : (
        <>
          <ClassGroup label="Nursery" items={nursery} color="#db2777" bg="#fce7f3" onSelect={setSelectedClass} countForClass={countForClass} />
          <ClassGroup label="Primary" items={primary} color="#2563eb" bg="#dbeafe" onSelect={setSelectedClass} countForClass={countForClass} />
          <ClassGroup label="Other" items={other} color={ACCENT} bg={ACCENT_BG} onSelect={setSelectedClass} countForClass={countForClass} />
        </>
      )}
    </Box>
  );
};

export default StudentsPage;
