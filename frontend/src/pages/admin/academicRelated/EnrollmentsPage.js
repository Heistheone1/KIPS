import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, MenuItem, Stack, Alert, Box, Typography, Avatar } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import {
  fetchEnrollments, createEnrollment, updateEnrollment,
  fetchStudents, fetchAcademicYears, fetchClasses,
} from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const ACCENT = '#0ea5e9';
const ACCENT_BG = '#f0f9ff';
const STATUSES = ['ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN', 'INACTIVE'];
const empty = { student: '', academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const initials = (s) => `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();

const EnrollmentsPage = () => {
  const dispatch = useDispatch();
  const { enrollments, students, academicYears, classes, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterYear, setFilterYear] = useState('');
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    dispatch(fetchEnrollments());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchEnrollments(filterYear ? `?academicYear=${filterYear}` : ''));
  }, [filterYear, dispatch]);

  useEffect(() => {
    if (success) { setOpen(false); dispatch(academicReset()); }
  }, [success, dispatch]);

  const filteredClasses = form.academicYear
    ? classes.filter((c) => (c.academicYear?._id || c.academicYear) === form.academicYear)
    : classes;

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      student: row.student?._id || row.student,
      academicYear: row.academicYear?._id || row.academicYear,
      class: row.class?._id || row.class,
      enrollmentDate: row.enrollmentDate?.slice(0, 10) || '',
      status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (editing) dispatch(updateEnrollment(editing._id, { class: form.class, enrollmentDate: form.enrollmentDate, status: form.status }));
    else dispatch(createEnrollment(form));
  };

  const columns = [
    {
      key: 'student', label: 'Student',
      render: (r) => {
        const s = r.student;
        if (!s) return '—';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
              {initials(s)}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{s.firstName} {s.lastName}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.admissionNumber}</Typography>
            </Box>
          </Box>
        );
      },
    },
    { key: 'academicYear', label: 'Academic Year', render: (r) => r.academicYear?.name || '—' },
    {
      key: 'class', label: 'Class',
      render: (r) => r.class ? (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f5f3ff', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
          {r.class.name}
        </Box>
      ) : '—',
    },
    {
      key: 'enrollmentDate', label: 'Enrolled On',
      render: (r) => r.enrollmentDate ? (
        <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>{r.enrollmentDate.slice(0, 10)}</Typography>
      ) : '—',
    },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  const filters = (
    <TextField select label="Filter by Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} size="small"
      sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
      <MenuItem value="">All Years</MenuItem>
      {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
    </TextField>
  );

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}
      <PageLayout
        title="Enrollments"
        subtitle="Track student class enrollments per academic year"
        icon={AssignmentIndIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="New Enrollment"
        columns={columns}
        rows={enrollments}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        emptyMessage="No enrollments yet. Enroll a student to get started."
        filters={filters}
      />
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Enrollment' : 'New Enrollment'}
        subtitle={editing ? `Editing enrollment for ${editing.student?.firstName || ''}` : 'Fill in the enrollment details'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor={ACCENT}
      >
        <Stack spacing={2.5}>
          {!editing && (
            <TextField select label="Student" value={form.student} onChange={f('student')} fullWidth required sx={fieldSx}>
              {students.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.admissionNumber})</MenuItem>
              ))}
            </TextField>
          )}
          {!editing && (
            <TextField select label="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, class: '' })} fullWidth required sx={fieldSx}>
              {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
            </TextField>
          )}
          <TextField select label="Class" value={form.class} onChange={f('class')} fullWidth required sx={fieldSx}>
            {filteredClasses.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField label="Enrollment Date" type="date" value={form.enrollmentDate} onChange={f('enrollmentDate')} fullWidth InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </FormDrawer>
    </>
  );
};

export default EnrollmentsPage;
