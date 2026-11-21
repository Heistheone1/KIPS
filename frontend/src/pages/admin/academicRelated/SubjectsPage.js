import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Stack, Alert, Paper, IconButton, Tooltip,
  TextField, MenuItem, Button, Divider, CircularProgress, Chip,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { fetchSubjects, createSubject, updateSubject } from '../../../redux/academicRelated/academicHandle';
import { academicReset } from '../../../redux/academicRelated/academicSlice';
import FormDrawer from '../../../components/academic/FormDrawer';

const ACCENT    = '#10b981';
const ACCENT_BG = '#f0fdf4';

const LEVEL_CONFIG = {
  NURSERY: { color: '#db2777', bg: '#fce7f3', label: 'Nursery',  accent: '#db2777' },
  PRIMARY: { color: '#2563eb', bg: '#dbeafe', label: 'Primary',  accent: '#2563eb' },
};

const STATUSES = ['ACTIVE', 'INACTIVE'];
const LEVELS   = ['NURSERY', 'PRIMARY', 'ALL'];

const fieldSx = (color) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    fontSize: '0.85rem',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: color },
    '&.Mui-focused fieldset': { borderColor: color },
  },
  '& .MuiInputLabel-root.Mui-focused': { color },
});

const emptyForm = { name: '', code: '', description: '', level: '', status: 'ACTIVE' };

// ── Inline editable row ───────────────────────────────────────────────────────
const SubjectRow = ({ subject, accentColor, onSave, saving }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: subject.name,
    description: subject.description || '',
    status: subject.status,
  });

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = () => {
    onSave(subject._id, form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ name: subject.name, description: subject.description || '', status: subject.status });
    setEditing(false);
  };

  const isActive = subject.status === 'ACTIVE';

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: editing ? 1.5 : 1.2,
        borderBottom: '1px solid #f1f5f9',
        bgcolor: editing ? '#fafafa' : 'transparent',
        transition: 'background 0.15s',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Index dot */}
      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <MenuBookOutlinedIcon sx={{ fontSize: 14, color: accentColor }} />
      </Box>

      {/* Name / edit field */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <Stack spacing={1}>
            <TextField
              value={form.name} onChange={f('name')} size="small" fullWidth
              label="Name" sx={fieldSx(accentColor)}
            />
            <TextField
              value={form.description} onChange={f('description')} size="small" fullWidth
              label="Description" sx={fieldSx(accentColor)}
            />
          </Stack>
        ) : (
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{subject.name}</Typography>
            {subject.description && (
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{subject.description}</Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Code badge */}
      <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: accentColor + '18', flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: accentColor, letterSpacing: 0.5 }}>{subject.code}</Typography>
      </Box>

      {/* Status */}
      {editing ? (
        <TextField select value={form.status} onChange={f('status')} size="small" sx={{ width: 120, ...fieldSx(accentColor) }}>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      ) : (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.2, py: 0.3, borderRadius: 99, bgcolor: isActive ? '#dcfce7' : '#f1f5f9', flexShrink: 0 }}>
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isActive ? '#16a34a' : '#94a3b8', mr: 0.6 }} />
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: isActive ? '#16a34a' : '#64748b' }}>{subject.status}</Typography>
        </Box>
      )}

      {/* Actions */}
      {editing ? (
        <Stack direction="row" spacing={0.5} flexShrink={0}>
          <Tooltip title="Save">
            <IconButton size="small" onClick={handleSave} disabled={saving || !form.name.trim()}
              sx={{ color: '#fff', bgcolor: accentColor, '&:hover': { bgcolor: accentColor + 'dd' }, width: 28, height: 28 }}>
              {saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <CheckIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel">
            <IconButton size="small" onClick={handleCancel}
              sx={{ color: '#64748b', bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' }, width: 28, height: 28 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => setEditing(true)}
            sx={{ color: '#94a3b8', '&:hover': { color: accentColor, bgcolor: accentColor + '12' }, width: 28, height: 28, flexShrink: 0 }}>
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// ── Section block ─────────────────────────────────────────────────────────────
const SubjectSection = ({ level, subjects, onSave, saving, onAdd, canWrite }) => {
  const lc = LEVEL_CONFIG[level];
  return (
    <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', mb: 3 }}>
      {/* Section header */}
      <Box sx={{ px: 2.5, py: 1.8, bgcolor: lc.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MenuBookIcon sx={{ fontSize: 16, color: lc.color }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: lc.color }}>{lc.label} Subjects</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: lc.color + 'aa' }}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</Typography>
          </Box>
        </Box>
        {canWrite && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => onAdd(level)}
            sx={{ borderRadius: 2, color: lc.color, bgcolor: '#fff', fontWeight: 700, fontSize: '0.75rem',
              border: `1px solid ${lc.color}44`, '&:hover': { bgcolor: lc.color + '10' } }}>
            Add
          </Button>
        )}
      </Box>
      <Divider />
      {/* Rows */}
      {subjects.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>No {lc.label.toLowerCase()} subjects yet.</Typography>
        </Box>
      ) : (
        subjects.map((s) => (
          <SubjectRow key={s._id} subject={s} accentColor={lc.color} onSave={onSave} saving={saving} />
        ))
      )}
    </Paper>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SubjectsPage = () => {
  const dispatch = useDispatch();
  const { subjects, loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user)
  const canWrite = ['ADMIN', 'DOS'].includes(currentRole);

  const [open, setOpen]         = useState(false);
  const [defaultLevel, setDefaultLevel] = useState('');
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { dispatch(fetchSubjects()); }, [dispatch]);
  useEffect(() => {
    if (success) { setOpen(false); dispatch(academicReset()); dispatch(fetchSubjects()); }
  }, [success, dispatch]);

  const handleAdd = (level) => {
    setDefaultLevel(level);
    setForm({ ...emptyForm, level });
    setOpen(true);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleCreate = () => {
    dispatch(createSubject({ ...form, level: form.level || null }));
  };

  const handleSave = (id, updates) => {
    setSaving(true);
    dispatch(updateSubject(id, updates));
    setTimeout(() => setSaving(false), 800);
  };

  const nursery = subjects.filter((s) => s.level === 'NURSERY');
  const primary = subjects.filter((s) => s.level === 'PRIMARY');
  const other   = subjects.filter((s) => !['NURSERY', 'PRIMARY'].includes(s.level));

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MenuBookIcon sx={{ fontSize: 24, color: ACCENT }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>Subjects</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              {nursery.length} Nursery · {primary.length} Primary · {subjects.length} total
            </Typography>
          </Box>
        </Box>
        {canWrite && (
          <Button onClick={() => { setDefaultLevel(''); setForm(emptyForm); setOpen(true); }}
            startIcon={<AddIcon />} variant="contained"
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, borderRadius: 2, px: 2.5, py: 1, fontWeight: 700, fontSize: '0.82rem', boxShadow: `0 4px 14px ${ACCENT}33` }}>
            New Subject
          </Button>
        )}
      </Box>

      {loading && subjects.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Box>
      ) : (
        <>
          <SubjectSection level="NURSERY" subjects={nursery} onSave={handleSave} saving={saving} onAdd={handleAdd} canWrite={canWrite} />
          <SubjectSection level="PRIMARY" subjects={primary} onSave={handleSave} saving={saving} onAdd={handleAdd} canWrite={canWrite} />

          {/* Other / ungrouped */}
          {other.length > 0 && (
            <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Box sx={{ px: 2.5, py: 1.8, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#64748b' }}>Other Subjects</Typography>
                <Chip label={other.length} size="small" sx={{ bgcolor: '#e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Divider />
              {other.map((s) => (
                <SubjectRow key={s._id} subject={s} accentColor="#64748b" onSave={handleSave} saving={saving} />
              ))}
            </Paper>
          )}
        </>
      )}

      {/* Create Drawer */}
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="New Subject"
        subtitle="Add a subject to the curriculum"
        onSubmit={handleCreate}
        loading={loading}
        error={error}
        accentColor={LEVEL_CONFIG[defaultLevel]?.color || ACCENT}
      >
        <Stack spacing={2.5}>
          <TextField label="Subject Name" value={form.name} onChange={f('name')} fullWidth required
            sx={fieldSx(LEVEL_CONFIG[defaultLevel]?.color || ACCENT)} placeholder="e.g. MATHEMATICS" />
          <TextField label="Code" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            fullWidth required sx={fieldSx(LEVEL_CONFIG[defaultLevel]?.color || ACCENT)} placeholder="e.g. MATH" />
          <TextField select label="Level" value={form.level} onChange={f('level')} fullWidth
            sx={fieldSx(LEVEL_CONFIG[defaultLevel]?.color || ACCENT)}>
            <MenuItem value="">— None —</MenuItem>
            {LEVELS.map((l) => <MenuItem key={l} value={l}>{LEVEL_CONFIG[l]?.label || l}</MenuItem>)}
          </TextField>
          <TextField label="Description" value={form.description} onChange={f('description')} fullWidth multiline rows={2}
            sx={fieldSx(LEVEL_CONFIG[defaultLevel]?.color || ACCENT)} placeholder="Optional description…" />
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth
            sx={fieldSx(LEVEL_CONFIG[defaultLevel]?.color || ACCENT)}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </FormDrawer>
    </>
  );
};

export default SubjectsPage;
