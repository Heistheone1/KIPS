import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TextField, MenuItem, Stack, Alert, Box, Typography, Avatar,
  IconButton, Tooltip, Button,
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import axios from 'axios';
import { fetchUsers } from '../../redux/userRelated/userHandle';
import { resetUserSave } from '../../redux/userRelated/userSlice';
import { fetchAcademicYears, fetchClasses, fetchSubjects } from '../../redux/academicRelated/academicHandle';
import PageLayout from '../../components/academic/PageLayout';
import FormDrawer from '../../components/academic/FormDrawer';

const BASE_URL  = process.env.REACT_APP_BASE_URL;
const ROLES     = ['DOS', 'TEACHER'];
const STATUSES  = ['active', 'inactive', 'suspended'];
const ACCENT    = '#7c3aed';
const ACCENT_BG = '#f3e8ff';

const ROLE_COLORS = {
  ADMIN:   { bg: '#fee2e2', color: '#dc2626' },
  DOS:     { bg: '#dbeafe', color: '#2563eb' },
  TEACHER: { bg: '#fef3c7', color: '#d97706' },
};
const STATUS_COLORS = {
  active:    { bg: '#dcfce7', color: '#16a34a' },
  inactive:  { bg: '#f1f5f9', color: '#64748b' },
  suspended: { bg: '#fee2e2', color: '#dc2626' },
};
const LEVEL_COLORS = {
  NURSERY: { bg: '#fce7f3', color: '#db2777' },
  PRIMARY: { bg: '#dbeafe', color: '#2563eb' },
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

const emptyUser   = { firstName: '', lastName: '', email: '', phone: '', password: '', role: '' };
const emptyAssign = { academicYear: '', term: '', class: '', subject: '' };
const initials    = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();

// ── CSRF helper ───────────────────────────────────────────────────────────────
const getCsrf = () =>
  axios.get(`${BASE_URL}/api/auth/csrf-token`, { withCredentials: true })
    .then((r) => r.data.csrfToken);

// ── Assignment preview row ────────────────────────────────────────────────────
const AssignRow = ({ assign, classes, subjects, academicYears, terms, onRemove }) => {
  const cls  = classes.find((c) => c._id === assign.class);
  const subj = subjects.find((s) => s._id === assign.subject);
  const yr   = academicYears.find((y) => y._id === assign.academicYear);
  const trm  = terms.find((t) => t._id === assign.term);
  const lc   = LEVEL_COLORS[cls?.level] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
          <Box sx={{ px: 1.2, py: 0.2, borderRadius: 99, bgcolor: lc.bg }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: lc.color }}>{cls?.name || '—'}</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{subj?.name || '—'}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', mt: 0.3 }}>
          {yr?.name} · {trm?.name}
        </Typography>
      </Box>
      <Tooltip title="Remove">
        <IconButton size="small" onClick={onRemove} sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}>
          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const UsersPage = () => {
  const dispatch = useDispatch();
  const { users } = useSelector((s) => s.user);
  const { academicYears, classes, subjects } = useSelector((s) => s.academic);

  // drawer state
  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState(1);       // 1=user info, 2=assignments
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyUser);

  // ui state
  const [saving, setSaving]   = useState(false);
  const [pageError, setPageError] = useState('');
  const [drawerError, setDrawerError] = useState('');

  // step-2 state
  const [createdUserId, setCreatedUserId] = useState(null);
  const [assignments, setAssignments]     = useState([]);
  const [assignForm, setAssignForm]       = useState(emptyAssign);
  const [terms, setTerms]                 = useState([]);
  const [assignError, setAssignError]     = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    dispatch(fetchSubjects());
  }, [dispatch]);

  useEffect(() => {
    if (!assignForm.academicYear) { setTerms([]); return; }
    axios.get(`${BASE_URL}/api/terms?academicYear=${assignForm.academicYear}`, { withCredentials: true })
      .then((r) => setTerms(r.data.terms || []))
      .catch(() => setTerms([]));
  }, [assignForm.academicYear]);

  const openCreate = () => {
    setEditing(null); setStep(1); setForm(emptyUser);
    setCreatedUserId(null); setAssignments([]); setAssignForm(emptyAssign);
    setDrawerError(''); setAssignError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row); setStep(1);
    setForm({ firstName: row.firstName, lastName: row.lastName, phone: row.phone || '', status: row.status });
    setDrawerError('');
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
    setDrawerError('');
    setAssignError('');
    dispatch(resetUserSave());
  };

  const f  = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const af = (k) => (e) => setAssignForm((p) => ({ ...p, [k]: e.target.value }));

  // ── Step 1 submit ─────────────────────────────────────────────────────────
  const handleSubmitUser = async () => {
    setSaving(true);
    setDrawerError('');
    try {
      const csrf = await getCsrf();
      const headers = { 'X-CSRF-Token': csrf };

      if (editing) {
        // UPDATE
        const res = await axios.put(
          `${BASE_URL}/api/users/${editing._id}`,
          { firstName: form.firstName, lastName: form.lastName, phone: form.phone, status: form.status },
          { withCredentials: true, headers }
        );
        if (res.data.user) {
          dispatch(fetchUsers());   // refresh list
          closeDrawer();
        }
      } else {
        // CREATE
        const res = await axios.post(
          `${BASE_URL}/api/users`,
          { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password, role: form.role },
          { withCredentials: true, headers }
        );
        if (res.data.user) {
          dispatch(fetchUsers());   // refresh list immediately
          if (form.role === 'TEACHER') {
            setCreatedUserId(res.data.user._id);
            setStep(2);             // go to assignment step
          } else {
            closeDrawer();
          }
        }
      }
    } catch (err) {
      const data = err.response?.data;
      setDrawerError(data?.errors?.join(', ') || data?.message || err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: add assignment to local list ──────────────────────────────────
  const filteredClasses  = assignForm.academicYear
    ? classes.filter((c) => (c.academicYear?._id || c.academicYear) === assignForm.academicYear)
    : classes;
  const selectedClass    = classes.find((c) => c._id === assignForm.class);
  const filteredSubjects = selectedClass?.level
    ? subjects.filter((s) => s.level === selectedClass.level || s.level === 'ALL' || !s.level)
    : subjects;

  const addAssignment = () => {
    const { academicYear, term, class: cls, subject } = assignForm;
    if (!academicYear || !term || !cls || !subject) {
      setAssignError('Please fill all fields before adding.'); return;
    }
    if (assignments.find((a) => a.academicYear === academicYear && a.term === term && a.class === cls && a.subject === subject)) {
      setAssignError('This assignment is already in the list.'); return;
    }
    setAssignments((p) => [...p, { ...assignForm }]);
    setAssignForm((p) => ({ ...emptyAssign, academicYear: p.academicYear, term: p.term }));
    setAssignError('');
  };

  // ── Step 2 submit ─────────────────────────────────────────────────────────
  const handleSaveAssignments = async () => {
    if (!assignments.length) { closeDrawer(); return; }   // skip
    setSaving(true);
    setAssignError('');
    try {
      const csrf = await getCsrf();
      const headers = { 'X-CSRF-Token': csrf };
      for (const a of assignments) {
        await axios.post(
          `${BASE_URL}/api/teacher-assignments`,
          { teacher: createdUserId, academicYear: a.academicYear, term: a.term, class: a.class, subject: a.subject },
          { withCredentials: true, headers }
        );
      }
      closeDrawer();
    } catch (err) {
      const data = err.response?.data;
      setAssignError(data?.message || 'Failed to save some assignments.');
    } finally {
      setSaving(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'User',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
            {initials(r)}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.firstName} {r.lastName}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'role', label: 'Role',
      render: (r) => {
        const c = ROLE_COLORS[r.role] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: c.bg }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: c.color }}>{r.role}</Typography>
          </Box>
        );
      },
    },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    {
      key: 'status', label: 'Status',
      render: (r) => {
        const c = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: c.bg }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color, mr: 0.75 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: c.color }}>{r.status}</Typography>
          </Box>
        );
      },
    },
  ];

  return (
    <>
      {pageError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPageError('')}>{pageError}</Alert>
      )}

      <PageLayout
        title="Users"
        subtitle="Manage staff accounts — DOS and Teachers"
        icon={PeopleAltIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={openCreate}
        canAdd
        addLabel="Add User"
        columns={columns}
        rows={users}
        loading={false}
        onEdit={openEdit}
        emptyMessage="No users yet. Add one to get started."
      />

      {/* ── Step 1: User Info ── */}
      <FormDrawer
        open={open && step === 1}
        onClose={closeDrawer}
        title={editing ? 'Edit User' : 'New User'}
        subtitle={
          editing
            ? `Editing: ${editing.firstName} ${editing.lastName}`
            : form.role === 'TEACHER'
              ? 'Step 1 of 2 — Account details'
              : 'Create a staff account'
        }
        onSubmit={handleSubmitUser}
        loading={saving}
        error={drawerError}
        accentColor={ACCENT}
        submitLabel={!editing && form.role === 'TEACHER' ? 'Next: Assign Classes →' : 'Save'}
      >
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField label="First Name" value={form.firstName} onChange={f('firstName')} fullWidth required sx={fieldSx} />
            <TextField label="Last Name"  value={form.lastName}  onChange={f('lastName')}  fullWidth required sx={fieldSx} />
          </Stack>
          {!editing && (
            <TextField label="Email" type="email" value={form.email} onChange={f('email')} fullWidth required sx={fieldSx} />
          )}
          <TextField label="Phone" value={form.phone} onChange={f('phone')} fullWidth sx={fieldSx} />
          {!editing && (
            <>
              <TextField label="Password" type="password" value={form.password} onChange={f('password')} fullWidth required sx={fieldSx} />
              <TextField select label="Role" value={form.role} onChange={f('role')} fullWidth required sx={fieldSx}>
                <MenuItem value="">— Select Role —</MenuItem>
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </>
          )}
          {editing && (
            <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          )}
        </Stack>
      </FormDrawer>

      {/* ── Step 2: Assign Classes & Subjects ── */}
      <FormDrawer
        open={open && step === 2}
        onClose={closeDrawer}
        title="Assign Classes & Subjects"
        subtitle={`Step 2 of 2 — ${form.firstName} ${form.lastName}'s teaching assignments`}
        onSubmit={handleSaveAssignments}
        loading={saving}
        error={assignError}
        accentColor="#f59e0b"
        submitLabel={assignments.length ? `Save ${assignments.length} Assignment${assignments.length > 1 ? 's' : ''}` : 'Skip for now'}
      >
        <Stack spacing={2.5}>
          <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#d97706', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <AssignmentIcon sx={{ fontSize: 16 }} /> Add Assignment
            </Typography>
            <Stack spacing={1.5}>
              <TextField select label="Academic Year" value={assignForm.academicYear}
                onChange={(e) => setAssignForm({ ...emptyAssign, academicYear: e.target.value })}
                fullWidth size="small" sx={fieldSx}>
                <MenuItem value="">— Select Year —</MenuItem>
                {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
              </TextField>
              <TextField select label="Term" value={assignForm.term} onChange={af('term')} fullWidth size="small" sx={fieldSx}>
                <MenuItem value="">— Select Term —</MenuItem>
                {terms.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select label="Class" value={assignForm.class}
                onChange={(e) => setAssignForm((p) => ({ ...p, class: e.target.value, subject: '' }))}
                fullWidth size="small" sx={fieldSx}>
                <MenuItem value="">— Select Class —</MenuItem>
                {filteredClasses.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.name}{c.level ? ` (${c.level})` : ''}</MenuItem>
                ))}
              </TextField>
              <TextField select label="Subject" value={assignForm.subject} onChange={af('subject')} fullWidth size="small" sx={fieldSx}
                helperText={selectedClass?.level ? `Showing ${selectedClass.level.toLowerCase()} subjects` : 'Select a class first'}>
                <MenuItem value="">— Select Subject —</MenuItem>
                {filteredSubjects.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <span style={{ flex: 1 }}>{s.name}</span>
                      {s.level && (
                        <Box sx={{ px: 1, py: 0.1, borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                          bgcolor: s.level === 'NURSERY' ? '#fce7f3' : '#dbeafe',
                          color:   s.level === 'NURSERY' ? '#db2777' : '#2563eb' }}>
                          {s.level}
                        </Box>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              <Button onClick={addAssignment} startIcon={<AddIcon />} variant="outlined" fullWidth
                sx={{ borderRadius: 2, borderColor: '#f59e0b', color: '#d97706', fontWeight: 700,
                  '&:hover': { bgcolor: '#fffbeb', borderColor: '#d97706' } }}>
                Add to List
              </Button>
            </Stack>
          </Box>

          {assignments.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#64748b', mb: 1 }}>
                {assignments.length} assignment{assignments.length > 1 ? 's' : ''} to save:
              </Typography>
              <Stack spacing={1}>
                {assignments.map((a, i) => (
                  <AssignRow key={i} assign={a} classes={classes} subjects={subjects}
                    academicYears={academicYears} terms={terms}
                    onRemove={() => setAssignments((p) => p.filter((_, idx) => idx !== i))} />
                ))}
              </Stack>
            </Box>
          )}

          {assignments.length === 0 && (
            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', py: 2 }}>
              No assignments added yet. Click "Skip for now" to finish and assign later.
            </Typography>
          )}
        </Stack>
      </FormDrawer>
    </>
  );
};

export default UsersPage;
