import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, MenuItem, Stack, Alert, Box, Typography, Avatar } from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import axios from 'axios';
import {
  fetchClassTeacherAssignments, createClassTeacherAssignment, updateClassTeacherAssignment,
  fetchAcademicYears, fetchClasses,
} from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const ACCENT = '#8b5cf6';
const ACCENT_BG = '#f5f3ff';
const STATUSES = ['ACTIVE', 'INACTIVE', 'CANCELLED'];
const empty = { teacher: '', academicYear: '', term: '', class: '', status: 'ACTIVE' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const initials = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();

const ClassTeacherAssignmentsPage = () => {
  const dispatch = useDispatch();
  const { classTeacherAssignments, academicYears, classes, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [teachers, setTeachers] = useState([]);
  const [terms, setTerms] = useState([]);
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    dispatch(fetchClassTeacherAssignments());
    axios.get(`${BASE_URL}/api/users`, { withCredentials: true })
      .then((r) => setTeachers((r.data.users || []).filter((u) => u.role === 'TEACHER')))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (form.academicYear) {
      axios.get(`${BASE_URL}/api/terms?academicYear=${form.academicYear}`, { withCredentials: true })
        .then((r) => setTerms(r.data.terms || []))
        .catch(() => setTerms([]));
    } else {
      setTerms([]);
    }
  }, [form.academicYear]);

  useEffect(() => {
    if (success) { setOpen(false); dispatch(academicReset()); }
  }, [success, dispatch]);

  const filteredClasses = form.academicYear
    ? classes.filter((c) => (c.academicYear?._id || c.academicYear) === form.academicYear)
    : classes;

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      teacher: row.teacher?._id, academicYear: row.academicYear?._id,
      term: row.term?._id, class: row.class?._id, status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (editing) dispatch(updateClassTeacherAssignment(editing._id, { status: form.status }));
    else dispatch(createClassTeacherAssignment(form));
  };

  const columns = [
    {
      key: 'teacher', label: 'Class Teacher',
      render: (r) => {
        const t = r.teacher;
        if (!t) return '—';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
              {initials(t)}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{t.firstName} {t.lastName}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.email}</Typography>
            </Box>
          </Box>
        );
      },
    },
    { key: 'academicYear', label: 'Year', render: (r) => r.academicYear?.name || '—' },
    { key: 'term', label: 'Term', render: (r) => r.term?.name || '—' },
    {
      key: 'class', label: 'Class',
      render: (r) => r.class ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SupervisorAccountIcon sx={{ fontSize: 14, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.class.name}</Typography>
            {r.class.code && <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.class.code}</Typography>}
          </Box>
        </Box>
      ) : '—',
    },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}
      <PageLayout
        title="Class Teachers"
        subtitle="Assign class teachers to classes per term"
        icon={SupervisorAccountIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="Assign Class Teacher"
        columns={columns}
        rows={classTeacherAssignments}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        emptyMessage="No class teacher assignments yet. Assign one to get started."
      />
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Assignment' : 'Assign Class Teacher'}
        subtitle={editing ? 'Update assignment status' : 'Select a teacher and class'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor={ACCENT}
      >
        <Stack spacing={2.5}>
          {!editing && (
            <>
              <TextField select label="Teacher" value={form.teacher} onChange={f('teacher')} fullWidth required sx={fieldSx}>
                {teachers.map((t) => <MenuItem key={t._id} value={t._id}>{t.firstName} {t.lastName} ({t.role})</MenuItem>)}
              </TextField>
              <TextField select label="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, term: '', class: '' })} fullWidth required sx={fieldSx}>
                {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
              </TextField>
              <TextField select label="Term" value={form.term} onChange={f('term')} fullWidth required sx={fieldSx}>
                {terms.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select label="Class" value={form.class} onChange={f('class')} fullWidth required sx={fieldSx}>
                {filteredClasses.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}{c.level ? ` (${c.level})` : ''}</MenuItem>)}
              </TextField>
            </>
          )}
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </FormDrawer>
    </>
  );
};

export default ClassTeacherAssignmentsPage;
