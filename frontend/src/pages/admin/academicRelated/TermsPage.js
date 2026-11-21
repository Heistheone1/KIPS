import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, MenuItem, Stack, Alert } from '@mui/material';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { fetchTerms, createTerm, updateTerm, fetchAcademicYears } from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const STATUSES = ['PLANNED', 'ACTIVE', 'CLOSED'];
const empty = { academicYear: '', name: '', code: '', sequence: '', startDate: '', endDate: '', status: 'PLANNED' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#0d9488' },
    '&.Mui-focused fieldset': { borderColor: '#0d9488' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#0d9488' },
};

const TermsPage = () => {
  const dispatch = useDispatch();
  const { terms, academicYears, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterYear, setFilterYear] = useState('');
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => { dispatch(fetchAcademicYears()); dispatch(fetchTerms()); }, [dispatch]);
  useEffect(() => {
    dispatch(fetchTerms(filterYear ? `?academicYear=${filterYear}` : ''));
  }, [filterYear, dispatch]);
  useEffect(() => { if (success) { setOpen(false); dispatch(academicReset()); } }, [success, dispatch]);

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      academicYear: row.academicYear?._id || row.academicYear,
      name: row.name, code: row.code, sequence: row.sequence,
      startDate: row.startDate?.slice(0, 10) || '',
      endDate: row.endDate?.slice(0, 10) || '',
      status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (editing) dispatch(updateTerm(editing._id, { name: form.name, startDate: form.startDate, endDate: form.endDate, status: form.status }));
    else dispatch(createTerm(form));
  };

  const columns = [
    {
      key: 'name', label: 'Term',
      render: (r) => (
        <Stack>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.code} · Seq {r.sequence}</span>
        </Stack>
      ),
    },
    { key: 'academicYear', label: 'Academic Year', render: (r) => r.academicYear?.name || '—' },
    { key: 'startDate', label: 'Start', render: (r) => r.startDate?.slice(0, 10) || '—' },
    { key: 'endDate', label: 'End', render: (r) => r.endDate?.slice(0, 10) || '—' },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  const filters = (
    <TextField
      select label="Filter by Year" value={filterYear}
      onChange={(e) => setFilterYear(e.target.value)}
      size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
    >
      <MenuItem value="">All Years</MenuItem>
      {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
    </TextField>
  );

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}
      <PageLayout
        title="Terms"
        subtitle="Manage academic terms within each year"
        icon={DateRangeIcon}
        iconColor="#0d9488"
        iconBg="#f0fdfa"
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="New Term"
        columns={columns}
        rows={terms}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        emptyMessage="No terms yet. Create one to get started."
        filters={filters}
      />
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Term' : 'New Term'}
        subtitle={editing ? `Editing: ${editing.name}` : 'Fill in the details below'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor="#0d9488"
      >
        <Stack spacing={2.5}>
          {!editing && (
            <TextField select label="Academic Year" value={form.academicYear} onChange={f('academicYear')} fullWidth required sx={fieldSx}>
              {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
            </TextField>
          )}
          <TextField label="Name" value={form.name} onChange={f('name')} fullWidth required sx={fieldSx} placeholder="e.g. Term 1" />
          {!editing && <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth required sx={fieldSx} placeholder="e.g. T1" />}
          {!editing && <TextField label="Sequence" type="number" value={form.sequence} onChange={f('sequence')} fullWidth required sx={fieldSx} inputProps={{ min: 1 }} />}
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

export default TermsPage;
