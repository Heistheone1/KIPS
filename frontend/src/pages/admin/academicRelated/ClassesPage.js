import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TextField, MenuItem, Stack, Alert, Box, Typography, Avatar, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider,
  Grid, Tooltip, IconButton, Paper,
} from '@mui/material';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import axios from 'axios';
import { fetchClasses, createClass, updateClass, deleteClass, fetchAcademicYears } from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import PageLayout from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const ACCENT = '#7c3aed';
const ACCENT_BG = '#f5f3ff';
const STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED'];

const KIPS_TEMPLATES = [
  { name: 'Nursery 1',  code: 'N1',  level: 'NURSERY', section: 'N1',  capacity: 30, description: 'Nursery 1 class' },
  { name: 'Nursery 2',  code: 'N2',  level: 'NURSERY', section: 'N2',  capacity: 30, description: 'Nursery 2 class' },
  { name: 'Nursery 3',  code: 'N3',  level: 'NURSERY', section: 'N3',  capacity: 30, description: 'Nursery 3 class' },
  { name: 'Primary 1',  code: 'P1',  level: 'PRIMARY', section: 'P1',  capacity: 40, description: 'Primary 1 class' },
  { name: 'Primary 2',  code: 'P2',  level: 'PRIMARY', section: 'P2',  capacity: 40, description: 'Primary 2 class' },
  { name: 'Primary 3',  code: 'P3',  level: 'PRIMARY', section: 'P3',  capacity: 40, description: 'Primary 3 class' },
  { name: 'Primary 4',  code: 'P4',  level: 'PRIMARY', section: 'P4',  capacity: 40, description: 'Primary 4 class' },
  { name: 'Primary 5',  code: 'P5',  level: 'PRIMARY', section: 'P5',  capacity: 40, description: 'Primary 5 class' },
  { name: 'Primary 6A', code: 'P6A', level: 'PRIMARY', section: 'P6A', capacity: 40, description: 'Primary 6 Stream A' },
  { name: 'Primary 6B', code: 'P6B', level: 'PRIMARY', section: 'P6B', capacity: 40, description: 'Primary 6 Stream B' },
];

const LEVEL_COLORS = {
  NURSERY: { bg: '#fce7f3', color: '#db2777', label: 'Nursery' },
  PRIMARY: { bg: '#dbeafe', color: '#2563eb', label: 'Primary' },
};

const STATUS_COLORS = {
  ACTIVE:   { bg: '#dcfce7', color: '#16a34a' },
  INACTIVE: { bg: '#f1f5f9', color: '#64748b' },
  CLOSED:   { bg: '#fee2e2', color: '#dc2626' },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const empty = { academicYear: '', name: '', code: '', level: '', section: '', stream: '', capacity: '', description: '', status: 'ACTIVE' };

// ── Detail Dialog ─────────────────────────────────────────────────────────────
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</Typography>
  </Box>
);

const ClassDetailDialog = ({ cls, enrollments, onClose, onEdit, canWrite }) => {
  if (!cls) return null;
  const enrolled = enrollments.filter((e) => (e.class?._id || e.class) === cls._id && e.status === 'ACTIVE').length;
  const lc = LEVEL_COLORS[cls.level] || { bg: '#f1f5f9', color: '#64748b', label: cls.level };
  const sc = STATUS_COLORS[cls.status] || { bg: '#f1f5f9', color: '#64748b' };
  const pct = cls.capacity ? Math.min(100, Math.round((enrolled / cls.capacity) * 100)) : null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: ACCENT_BG, borderRadius: 2 }}>
            <ClassOutlinedIcon sx={{ color: ACCENT }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{cls.name}</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>Code: {cls.code}</Typography>
          </Box>
          {canWrite && (
            <Tooltip title="Edit Class">
              <IconButton size="small" onClick={() => { onClose(); onEdit(cls); }} sx={{ color: ACCENT }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={0}>
          <DetailRow label="Academic Year" value={cls.academicYear?.name} />
          <DetailRow label="Level" value={
            <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: lc.bg }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: lc.color }}>{lc.label}</Typography>
            </Box>
          } />
          <DetailRow label="Section" value={cls.section} />
          <DetailRow label="Stream" value={cls.stream} />
          <DetailRow label="Capacity" value={cls.capacity ? `${cls.capacity} students` : null} />
          <DetailRow label="Description" value={cls.description} />
          <DetailRow label="Status" value={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: sc.bg }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc.color, mr: 0.75 }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: sc.color }}>{cls.status}</Typography>
            </Box>
          } />
        </Stack>

        {/* Enrollment monitor */}
        <Box sx={{ mt: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleAltIcon sx={{ fontSize: 16, color: ACCENT }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Enrollment Monitor</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>Active Students</Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              {enrolled}{cls.capacity ? ` / ${cls.capacity}` : ''}
            </Typography>
          </Box>
          {pct !== null && (
            <Box>
              <Box sx={{ height: 6, bgcolor: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', borderRadius: 99,
                  width: `${pct}%`,
                  bgcolor: pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a',
                  transition: 'width 0.4s',
                }} />
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mt: 0.5, textAlign: 'right' }}>{pct}% full</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Bulk Create Dialog ────────────────────────────────────────────────────────
const BulkCreateDialog = ({ academicYears, onClose, onConfirm, loading }) => {
  const [yearId, setYearId] = useState('');
  const [selected, setSelected] = useState(KIPS_TEMPLATES.map((t) => t.code));

  const toggle = (code) => setSelected((prev) =>
    prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: ACCENT }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Quick-Add KIPS Classes</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', mt: 0.5 }}>
          Select an academic year and the classes to create in one click.
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2.5}>
          <TextField select label="Academic Year" value={yearId} onChange={(e) => setYearId(e.target.value)} fullWidth required sx={fieldSx}>
            <MenuItem value="">— Select Year —</MenuItem>
            {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
          </TextField>
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', mb: 1 }}>Select Classes</Typography>
            <Grid container spacing={1}>
              {KIPS_TEMPLATES.map((t) => {
                const active = selected.includes(t.code);
                const lc = LEVEL_COLORS[t.level] || { bg: '#f1f5f9', color: '#64748b' };
                return (
                  <Grid item key={t.code}>
                    <Box
                      onClick={() => toggle(t.code)}
                      sx={{
                        px: 2, py: 1, borderRadius: 2, cursor: 'pointer', userSelect: 'none',
                        border: `2px solid ${active ? ACCENT : '#e2e8f0'}`,
                        bgcolor: active ? ACCENT_BG : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: active ? ACCENT : '#64748b' }}>{t.code}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: lc.color }}>{t.level}</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>Cancel</Button>
        <Button
          onClick={() => onConfirm(yearId, KIPS_TEMPLATES.filter((t) => selected.includes(t.code)))}
          disabled={!yearId || selected.length === 0 || loading}
          variant="contained"
          sx={{ borderRadius: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 700 }}
        >
          Create {selected.length} Class{selected.length !== 1 ? 'es' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ClassesPage = () => {
  const dispatch = useDispatch();
  const { classes, academicYears, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(empty);
  const [filterYear, setFilterYear] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [detailCls, setDetailCls] = useState(null);
  const [bulkOpen, setBulkOpen]   = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg]     = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    axios.get(`${BASE_URL}/api/enrollments`, { withCredentials: true })
      .then((r) => setEnrollments(r.data.enrollments || []))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchClasses(filterYear ? `?academicYear=${filterYear}` : ''));
  }, [filterYear, dispatch]);

  useEffect(() => {
    if (success) { setOpen(false); dispatch(academicReset()); }
  }, [success, dispatch]);

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      academicYear: row.academicYear?._id || row.academicYear,
      name: row.name, code: row.code,
      level: row.level || '', section: row.section || '',
      stream: row.stream || '', capacity: row.capacity || '',
      description: row.description || '', status: row.status,
    } : empty);
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null };
    if (editing) {
      const { academicYear: _ay, code: _c, ...updatePayload } = payload;
      dispatch(updateClass(editing._id, updatePayload));
    } else {
      dispatch(createClass(payload));
    }
  };

  const handleBulkConfirm = async (yearId, templates) => {
    setBulkLoading(true);
    try {
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf-token`, { withCredentials: true });
      const res = await axios.post(
        `${BASE_URL}/api/classes/bulk`,
        { academicYear: yearId, classes: templates },
        { withCredentials: true, headers: { 'X-CSRF-Token': csrfRes.data.csrfToken } }
      );
      setBulkMsg(`✓ Created ${res.data.created.length} class${res.data.created.length !== 1 ? 'es' : ''}${res.data.skipped.length ? `. Skipped (already exist): ${res.data.skipped.join(', ')}` : '.'}`);
      dispatch(fetchClasses(filterYear ? `?academicYear=${filterYear}` : ''));
    } catch (err) {
      setBulkMsg(`Error: ${err.response?.data?.message || 'Failed to create classes'}`);
    } finally {
      setBulkLoading(false);
      setBulkOpen(false);
    }
  };

  const handleDeleteClick = (cls) => {
    setDeleteConfirm(cls);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await dispatch(deleteClass(deleteConfirm._id)).unwrap();
      setDeleteConfirm(null);
    } catch (err) {
      setDeleteConfirm(null);
    }
  };

  // Filter by level client-side
  const filteredRows = filterLevel
    ? classes.filter((c) => c.level === filterLevel)
    : classes;

  // Enrollment count per class
  const enrolledCount = (classId) =>
    enrollments.filter((e) => (e.class?._id || e.class) === classId && e.status === 'ACTIVE').length;

  const columns = [
    {
      key: 'name', label: 'Class',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: ACCENT_BG, borderRadius: 2, fontSize: '0.7rem', fontWeight: 800, color: ACCENT }}>
            {r.code}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</Typography>
            {r.description && <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.description}</Typography>}
          </Box>
        </Box>
      ),
    },
    {
      key: 'level', label: 'Level',
      render: (r) => {
        const lc = LEVEL_COLORS[r.level] || { bg: '#f1f5f9', color: '#64748b', label: r.level };
        return r.level ? (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: lc.bg }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: lc.color }}>{lc.label}</Typography>
          </Box>
        ) : '—';
      },
    },
    { key: 'section', label: 'Section', render: (r) => r.section || '—' },
    { key: 'academicYear', label: 'Year', render: (r) => r.academicYear?.name || '—' },
    {
      key: 'enrolled', label: 'Enrolled',
      render: (r) => {
        const count = enrolledCount(r._id);
        const cap = r.capacity;
        const pct = cap ? Math.round((count / cap) * 100) : null;
        const color = pct === null ? '#64748b' : pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color }}>{count}</Typography>
            {cap && <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>/ {cap}</Typography>}
          </Box>
        );
      },
    },
    {
      key: 'status', label: 'Status',
      render: (r) => {
        const sc = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: sc.bg }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc.color, mr: 0.75 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: sc.color }}>{r.status}</Typography>
          </Box>
        );
      },
    },
  ];

  const filters = (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
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
  );

  return (
    <>
      {bulkMsg && (
        <Alert
          severity={bulkMsg.startsWith('Error') ? 'error' : 'success'}
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setBulkMsg(null)}
        >
          {bulkMsg}
        </Alert>
      )}
      {error && !open && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>
      )}

      {/* Stats bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Classes', value: classes.length, color: ACCENT, bg: ACCENT_BG },
          { label: 'Nursery', value: classes.filter((c) => c.level === 'NURSERY').length, color: '#db2777', bg: '#fce7f3' },
          { label: 'Primary', value: classes.filter((c) => c.level === 'PRIMARY').length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Active', value: classes.filter((c) => c.status === 'ACTIVE').length, color: '#16a34a', bg: '#dcfce7' },
        ].map((s) => (
          <Paper key={s.label} sx={{ px: 2.5, py: 1.5, borderRadius: 2.5, border: '1px solid #f1f5f9', boxShadow: 'none', minWidth: 110 }}>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{s.label}</Typography>
          </Paper>
        ))}
        {canWrite && (
          <Button
            onClick={() => setBulkOpen(true)}
            startIcon={<AutoAwesomeIcon />}
            variant="outlined"
            sx={{
              borderRadius: 2, borderColor: ACCENT, color: ACCENT, fontWeight: 700,
              fontSize: '0.82rem', px: 2, alignSelf: 'center',
              '&:hover': { bgcolor: ACCENT_BG, borderColor: ACCENT },
            }}
          >
            Quick-Add KIPS Classes
          </Button>
        )}
      </Box>

      <PageLayout
        title="Classes"
        subtitle="Manage N1–N3 and P1–P6B class groups"
        icon={ClassOutlinedIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="New Class"
        columns={columns}
        rows={filteredRows}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        emptyMessage="No classes yet. Use Quick-Add or create one manually."
        filters={filters}
        extraActions={(row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => setDetailCls(row)} sx={{ color: '#64748b', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {canWrite && (
              <Tooltip title="Delete Class">
                <IconButton size="small" onClick={() => handleDeleteClick(row)} sx={{ color: '#dc2626', '&:hover': { color: '#b91c1c', bgcolor: '#fef2f2' } }}>
                  <DeleteForeverIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      />

      {/* Detail Dialog */}
      {detailCls && (
        <ClassDetailDialog
          cls={detailCls}
          enrollments={enrollments}
          onClose={() => setDetailCls(null)}
          onEdit={handleOpen}
          canWrite={canWrite}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open onClose={() => setDeleteConfirm(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#dc2626' }}>
            Delete Class
          </DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography sx={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                Are you sure you want to delete "{deleteConfirm.name}"?
              </Typography>
              {deleteConfirm.code && (
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.5 }}>
                  Code: {deleteConfirm.code}
                </Typography>
              )}
            </Box>
            <Box sx={{ mt: 2, color: '#dc2626', fontSize: '0.75rem', textAlign: 'center' }}>
              This action cannot be undone. Active enrollments will prevent deletion.
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
            <Button onClick={() => setDeleteConfirm(null)} sx={{ borderRadius: 2, color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={loading}
              variant="contained"
              sx={{
                borderRadius: 2, bgcolor: '#dc2626', color: '#fff', fontWeight: 600,
                '&:hover': { bgcolor: '#b91c1c' },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Bulk Create Dialog */}
      {bulkOpen && (
        <BulkCreateDialog
          academicYears={academicYears}
          onClose={() => setBulkOpen(false)}
          onConfirm={handleBulkConfirm}
          loading={bulkLoading}
        />
      )}

      {/* Create / Edit Drawer */}
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Class' : 'New Class'}
        subtitle={editing ? `Editing: ${editing.name}` : 'Fill in the class details'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor={ACCENT}
      >
        <Stack spacing={2.5}>
          {!editing && (
            <TextField select label="Academic Year" value={form.academicYear} onChange={f('academicYear')} fullWidth required sx={fieldSx}>
              <MenuItem value="">— Select Year —</MenuItem>
              {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
            </TextField>
          )}
          <Stack direction="row" spacing={2}>
            <TextField label="Class Name" value={form.name} onChange={f('name')} fullWidth required sx={fieldSx} placeholder="e.g. Primary 1" />
            {!editing && (
              <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth required sx={fieldSx} placeholder="e.g. P1" />
            )}
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField select label="Level" value={form.level} onChange={f('level')} fullWidth sx={fieldSx}>
              <MenuItem value="">— None —</MenuItem>
              <MenuItem value="NURSERY">Nursery</MenuItem>
              <MenuItem value="PRIMARY">Primary</MenuItem>
            </TextField>
            <TextField label="Section" value={form.section} onChange={f('section')} fullWidth sx={fieldSx} placeholder="e.g. P1, N2" />
          </Stack>
          <TextField label="Stream" value={form.stream} onChange={f('stream')} fullWidth sx={fieldSx} placeholder="e.g. A, B, Science" />
          <TextField label="Capacity" type="number" value={form.capacity} onChange={f('capacity')} fullWidth sx={fieldSx} inputProps={{ min: 1 }} />
          <TextField label="Description" value={form.description} onChange={f('description')} fullWidth multiline rows={2} sx={fieldSx} placeholder="Optional description" />
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </FormDrawer>
    </>
  );
};

export default ClassesPage;
