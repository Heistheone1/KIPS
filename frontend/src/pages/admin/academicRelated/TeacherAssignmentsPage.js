import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, MenuItem, Stack, Alert, Box, Typography, Avatar, IconButton, Paper, Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import {
  fetchTeacherAssignments, createTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment,
  fetchAcademicYears, fetchClasses, fetchSubjects,
} from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const ACCENT = '#f59e0b';
const ACCENT_BG = '#fffbeb';
const STATUSES = ['ACTIVE', 'INACTIVE', 'CANCELLED'];
const empty = { teacher: '', academicYear: '', term: '', class: '', subject: '', status: 'ACTIVE' };

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

const TeacherAssignmentsPage = () => {
  const dispatch = useDispatch();
  const { teacherAssignments = [], academicYears, classes, subjects, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [terms, setTerms] = useState([]);
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    dispatch(fetchSubjects());
    dispatch(fetchTeacherAssignments());
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

  // Filter subjects by the level of the selected class
  const selectedClass = classes.find((c) => c._id === form.class);
  const classLevel = selectedClass?.level || null;
  const filteredSubjects = classLevel
    ? subjects.filter((s) => s.level === classLevel || s.level === 'ALL' || !s.level)
    : subjects;

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      teacher: row.teacher?._id, academicYear: row.academicYear?._id,
      term: row.term?._id, class: row.class?._id, subject: row.subject?._id, status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (editing) dispatch(updateTeacherAssignment(editing._id, { status: form.status }));
    else dispatch(createTeacherAssignment(form));
  };

  const handleCloseError = () => dispatch(academicReset());

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      dispatch(deleteTeacherAssignment(deleteId));
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleDeleteRow = (id) => () => handleDelete(id);

  const handleCancelDelete = () => {
    setDeleteOpen(false);
    setDeleteId(null);
  };

  const columns = [
    {
      key: 'teacher', label: 'Teacher',
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
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f5f3ff', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
          {r.class.name}
        </Box>
      ) : '—',
    },
    {
      key: 'subject', label: 'Subject',
      render: (r) => r.subject ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f0fdf4', fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
          {r.subject.name}
        </Box>
      ) : '—',
    },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={handleCloseError}>{error}</Alert>}
      <PageLayout
        title="Teacher Assignments"
        subtitle="Assign teachers to subjects, classes and terms"
        icon={AssignmentIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={handleOpen}
        canAdd={canWrite}
        addLabel="New Assignment"
        columns={columns}
        rows={teacherAssignments}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        extraActions={canWrite ? (row) => (
          <IconButton size="small" color="error" onClick={handleDeleteRow(row?._id)} title="Delete">
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
        emptyMessage="No teacher assignments yet. Create one to get started."
      />
      {deleteOpen && (
        <Box sx={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1300 }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 24, bgcolor: 'background.paper', minWidth: 320 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Delete Assignment?</Typography>
            <Typography sx={{ color: '#64748b', mb: 3 }}>This action cannot be undone.</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={handleCancelDelete} sx={{ fontSize: '0.85rem' }}>Cancel</Button>
              <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontSize: '0.85rem' }}>Delete</Button>
            </Box>
          </Paper>
        </Box>
      )}
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Assignment' : 'New Teacher Assignment'}
        subtitle={editing ? 'Update assignment status' : 'Fill in the assignment details'}
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
              <TextField select label="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, term: '', class: '', subject: '' })} fullWidth required sx={fieldSx}>
                {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
              </TextField>
              <TextField select label="Term" value={form.term} onChange={f('term')} fullWidth required sx={fieldSx}>
                {terms.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select label="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value, subject: '' })} fullWidth required sx={fieldSx}>
                {filteredClasses.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}{c.level ? ` (${c.level})` : ''}</MenuItem>)}
              </TextField>
              <TextField select label="Subject" value={form.subject} onChange={f('subject')} fullWidth required sx={fieldSx}
                helperText={classLevel ? `Showing ${classLevel.toLowerCase()} subjects` : 'Select a class first to filter subjects'}>
                {!form.class && <MenuItem disabled value=""><em>Select a class first</em></MenuItem>}
                {filteredSubjects.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box sx={{ flex: 1 }}>{s.name}</Box>
                      {s.level && (
                        <Box sx={{
                          px: 1, py: 0.2, borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: s.level === 'NURSERY' ? '#fce7f3' : s.level === 'PRIMARY' ? '#dbeafe' : '#f3e8ff',
                          color:   s.level === 'NURSERY' ? '#db2777' : s.level === 'PRIMARY' ? '#2563eb' : '#7c3aed',
                        }}>
                          {s.level}
                        </Box>
                      )}
                    </Box>
                  </MenuItem>
                ))}
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

export default TeacherAssignmentsPage;
