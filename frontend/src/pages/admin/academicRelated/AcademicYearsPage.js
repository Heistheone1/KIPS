import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, MenuItem, Stack, Alert } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { fetchAcademicYears, createAcademicYear, updateAcademicYear } from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const STATUSES = ['PLANNED', 'ACTIVE', 'CLOSED'];
const empty = { name: '', code: '', startDate: '', endDate: '', status: 'PLANNED' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#2563eb' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
};

const AcademicYearsPage = () => {
  const dispatch = useDispatch();
  const { academicYears, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => { dispatch(fetchAcademicYears()); }, [dispatch]);
  useEffect(() => { if (success) { setOpen(false); dispatch(academicReset()); } }, [success, dispatch]);

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      name: row.name, code: row.code,
      startDate: row.startDate?.slice(0, 10) || '',
      endDate: row.endDate?.slice(0, 10) || '',
      status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (editing) dispatch(updateAcademicYear(editing._id, form));
    else dispatch(createAcademicYear(form));
  };

  const columns = [
    {
      key: 'name', label: 'Academic Year',
      render: (r) => (
        <Stack>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.code}</span>
        </Stack>
      ),
    },
    { key: 'startDate', label: 'Start Date', render: (r) => r.startDate?.slice(0, 10) || '—' },
    { key: 'endDate', label: 'End Date', render: (r) => r.endDate?.slice(0, 10) || '—' },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}
      <PageLayout
        title="Academic Years"
        subtitle="Manage school academic year cycles"
        icon={CalendarMonthIcon}
        iconColor="#2563eb"
        iconBg="#eff6ff"
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="New Academic Year"
        columns={columns}
        rows={academicYears}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        emptyMessage="No academic years yet. Create one to get started."
      />
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Academic Year' : 'New Academic Year'}
        subtitle={editing ? `Editing: ${editing.name}` : 'Fill in the details below'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor="#2563eb"
      >
        <Stack spacing={2.5}>
          <TextField label="Name" value={form.name} onChange={f('name')} fullWidth required sx={fieldSx} placeholder="e.g. 2024–2025" />
          <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth required disabled={!!editing} sx={fieldSx} placeholder="e.g. AY2425" />
          <TextField label="Start Date" type="date" value={form.startDate} onChange={f('startDate')} fullWidth required InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <TextField label="End Date" type="date" value={form.endDate} onChange={f('endDate')} fullWidth required InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </FormDrawer>
    </>
  );
};

export default AcademicYearsPage;
