import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, MenuItem, Stack, Alert, Typography, Avatar,
  Tooltip, IconButton, Menu, Chip,
} from '@mui/material';
import GradingIcon from '@mui/icons-material/Grading';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  fetchAssessments, createAssessment, updateAssessment, fetchAssessmentMeta,
} from '../../../redux/assessmentRelated/assessmentHandle';
import { assessmentReset } from '../../../redux/assessmentRelated/assessmentSlice';
import {
  fetchAcademicYears, fetchTerms, fetchClasses, fetchSubjects, fetchTeacherAssignments,
} from '../../../redux/academicRelated/academicHandle';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';
import ConfirmDialog from '../../../components/academic/ConfirmDialog';
import CorrectionsDialog from '../../../components/assessment/CorrectionsDialog';

const BASE_PATH = { ADMIN: 'admin', DOS: 'dos', CLASS_TEACHER: 'class-teacher', TEACHER: 'teacher' };
const ACCENT = '#6366f1';
const ACCENT_BG = '#eef2ff';

const TYPE_COLORS = {
  EXAM: { bg: '#fef2f2', color: '#dc2626' },
  TEST: { bg: '#eff6ff', color: '#2563eb' },
  QUIZ: { bg: '#f0fdf4', color: '#16a34a' },
  ASSIGNMENT: { bg: '#fffbeb', color: '#d97706' },
};

const STATUS_STYLES = {
  ACTIVE:    { bg: '#dcfce7', color: '#16a34a' },
  DRAFT:     { bg: '#dbeafe', color: '#2563eb' },
  CLOSED:    { bg: '#f1f5f9', color: '#64748b' },
  CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
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

const emptyForm = {
  academicYear: '', term: '', class: '', subject: '',
  type: '', name: '', maxMarks: '', weight: '',
  status: 'DRAFT', startDate: '', dueDate: '',
};

const AssessmentsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { assessments, assessmentMeta, loading, error, success } = useSelector((s) => s.assessment);
  const { academicYears, terms, classes, subjects } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [statusMenu, setStatusMenu] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { teacherAssignments } = useSelector((s) => s.academic);

  const canWrite = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'].includes(currentRole);
  const basePath = BASE_PATH[currentRole] || 'admin';

  useEffect(() => {
    dispatch(fetchAssessmentMeta());
    dispatch(fetchAcademicYears());
    dispatch(fetchTerms());
    dispatch(fetchClasses());
    dispatch(fetchSubjects());
    dispatch(fetchTeacherAssignments());
  }, [dispatch]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (filterYear) p.set('academicYear', filterYear);
    if (filterClass) p.set('class', filterClass);
    if (filterSubject) p.set('subject', filterSubject);
    if (filterStatus) p.set('status', filterStatus);
    const qs = p.toString();
    dispatch(fetchAssessments(qs ? `?${qs}` : ''));
  }, [filterYear, filterClass, filterSubject, filterStatus, dispatch]);

  useEffect(() => {
    if (success) { setOpen(false); dispatch(assessmentReset()); }
  }, [success, dispatch]);

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const isTeacherRole = currentRole === 'TEACHER';

  // Classes the teacher is assigned to teach (respecting year/term if selected)
  const classesForTeacher = (academicYearId, termId) => {
    if (!isTeacherRole) return classes || [];
    const allAssignments = teacherAssignments || [];
    if (allAssignments.length === 0) return classes || [];
    const activeAssignments = allAssignments.filter((a) => {
      if (!a) return false;
      const status = a.status || 'ACTIVE';
      if (status !== 'ACTIVE') return false;
      const ay = a.academicYear && typeof a.academicYear === 'object' ? a.academicYear._id : a.academicYear;
      const tm = a.term && typeof a.term === 'object' ? a.term._id : a.term;
      if (academicYearId && ay && ay !== academicYearId) return false;
      if (termId && tm && tm !== termId) return false;
      return true;
    });
    const allowedClassIds = new Set(
      activeAssignments
        .map((a) => {
          if (!a.class) return null;
          return typeof a.class === 'object' ? a.class._id : a.class;
        })
        .filter(Boolean)
    );
    if (allowedClassIds.size === 0) return [];
    return (classes || []).filter((c) => c && c._id && allowedClassIds.has(c._id));
  };

  // Subjects the teacher teaches in the selected class (respecting year/term if selected)
  const subjectsForClassAndTeacher = (classId, academicYearId, termId) => {
    if (!classId) return isTeacherRole ? [] : (subjects || []);
    if (!isTeacherRole) return subjects || [];
    const allAssignments = teacherAssignments || [];
    if (allAssignments.length === 0) return subjects || [];
    const assignedSubjectIds = new Set(
      allAssignments
        .filter((a) => {
          if (!a) return false;
          const status = a.status || 'ACTIVE';
          if (status !== 'ACTIVE') return false;
          const ay = a.academicYear && typeof a.academicYear === 'object' ? a.academicYear._id : a.academicYear;
          const tm = a.term && typeof a.term === 'object' ? a.term._id : a.term;
          const cl = a.class && typeof a.class === 'object' ? a.class._id : a.class;
          if (cl !== classId) return false;
          if (academicYearId && ay && ay !== academicYearId) return false;
          if (termId && tm && tm !== termId) return false;
          return true;
        })
        .map((a) => {
          if (!a.subject) return null;
          return typeof a.subject === 'object' ? a.subject._id : a.subject;
        })
        .filter(Boolean)
    );
    if (assignedSubjectIds.size === 0) return [];
    return (subjects || []).filter((s) => s && s._id && assignedSubjectIds.has(s._id));
  };

  const subjectsForClass = (classId) => subjectsForClassAndTeacher(classId, form.academicYear, form.term);

  const handleOpen = (row = null) => {
    setEditing(row);
    setForm(row ? {
      academicYear: row.academicYear?._id || row.academicYear,
      term: row.term?._id || row.term,
      class: row.class?._id || row.class,
      subject: row.subject?._id || row.subject,
      type: row.type, name: row.name,
      maxMarks: row.maxMarks, weight: row.weight,
      status: row.status,
      startDate: row.startDate?.slice(0, 10) || '',
      dueDate: row.dueDate?.slice(0, 10) || '',
    } : emptyForm);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editing) dispatch(updateAssessment(editing._id, form));
    else dispatch(createAssessment(form));
  };

  const metaTypes = assessmentMeta?.types || [];
  const metaStatuses = assessmentMeta?.statuses || [];

  const columns = useMemo(() => [
    {
      key: 'name', label: 'Assessment',
      render: (r) => {
        const tc = TYPE_COLORS[r.type] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: tc.bg, color: tc.color, fontSize: '0.65rem', fontWeight: 800, borderRadius: 1.5 }}>
              {(r.type || 'A').slice(0, 2)}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {r.subject?.name || '—'} · {r.class?.name || '—'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'type', label: 'Type',
      render: (r) => {
        const tc = TYPE_COLORS[r.type] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: tc.bg, fontSize: '0.72rem', fontWeight: 700, color: tc.color }}>
            {r.type}
          </Box>
        );
      },
    },
    { key: 'term', label: 'Term', render: (r) => r.term?.name || '—' },
    {
      key: 'maxMarks', label: 'Max / Weight',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{r.maxMarks}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.weight}% weight</Typography>
        </Box>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (r) => {
        const s = STATUS_STYLES[r.status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: s.bg }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, mr: 0.75 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{r.status}</Typography>
          </Box>
        );
      },
    },
  ], []);

  const extraActions = (row) => (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Enter Marks">
        <IconButton size="small" onClick={() => navigate(`/${basePath}/mark-entry/${row._id}`)}
          sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT_BG } }}>
          <GradingIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {['ADMIN', 'DOS'].includes(currentRole) && (
        <Tooltip title="Correction History">
          <IconButton size="small" onClick={() => setHistoryFor(row)}
            sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
            <HistoryIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      {canWrite && (
        <Tooltip title="Change Status">
          <IconButton size="small" onClick={(e) => setStatusMenu({ anchor: e.currentTarget, row })}
            sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
            <SwapHorizIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const filterSx = { minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } };

  const filters = (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1.5 }}>
      <TextField select label="Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} size="small" sx={filterSx}>
        <MenuItem value="">All Years</MenuItem>
        {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
      </TextField>
      <TextField select label="Class" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(''); }} size="small" sx={filterSx}>
        <MenuItem value="">All Classes</MenuItem>
        {(isTeacherRole ? classesForTeacher(filterYear, '') : classes).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField select label="Subject" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} size="small" sx={filterSx}>
        <MenuItem value="">All Subjects</MenuItem>
        {subjectsForClassAndTeacher(filterClass, filterYear, '').map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
      </TextField>
      <TextField select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small" sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
        <MenuItem value="">All Statuses</MenuItem>
        {metaStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
    </Stack>
  );

  return (
    <>
      {error && !open && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(assessmentReset())}>{error}</Alert>}
      <PageLayout
        title="Assessments"
        subtitle="Create and manage exams, tests, quizzes and assignments"
        icon={AssignmentIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={() => handleOpen()}
        canAdd={canWrite}
        addLabel="New Assessment"
        columns={columns}
        rows={assessments}
        loading={loading}
        onEdit={canWrite ? handleOpen : null}
        extraActions={extraActions}
        emptyMessage="No assessments yet. Create one to get started."
        filters={filters}
      />

      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Assessment' : 'New Assessment'}
        subtitle={editing ? `Editing: ${editing.name}` : 'Fill in the assessment details'}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        accentColor={ACCENT}
      >
        <Stack spacing={2.5}>
          <TextField select label="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, term: '', class: '', subject: '' })} fullWidth required disabled={!!editing} sx={fieldSx}>
            {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
          </TextField>
          <TextField select label="Term" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value, class: '', subject: '' })} fullWidth required disabled={!!editing} sx={fieldSx}>
            {terms.filter((t) => (t.academicYear?._id || t.academicYear) === form.academicYear).map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
          </TextField>
          <TextField select label="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value, subject: '' })} fullWidth required disabled={!!editing} sx={fieldSx}>
            {(isTeacherRole ? classesForTeacher(form.academicYear, form.term) : classes.filter((c) => (c.academicYear?._id || c.academicYear) === form.academicYear)).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Subject" value={form.subject} onChange={f('subject')} fullWidth required disabled={!!editing} sx={fieldSx}>
            {subjectsForClassAndTeacher(form.class, form.academicYear, form.term).map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField select label="Type" value={form.type} onChange={f('type')} fullWidth required sx={fieldSx}>
            {metaTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Assessment Name" value={form.name} onChange={f('name')} fullWidth required sx={fieldSx} placeholder="e.g. Term 1 Mathematics Exam" />
          <Stack direction="row" spacing={2}>
            <TextField label="Max Marks" type="number" value={form.maxMarks} onChange={f('maxMarks')} fullWidth required sx={fieldSx} inputProps={{ min: 0.001, step: 'any' }} />
            <TextField label="Weight (%)" type="number" value={form.weight} onChange={f('weight')} fullWidth required sx={fieldSx} inputProps={{ min: 0, max: 100, step: 'any' }} />
          </Stack>
          <TextField select label="Status" value={form.status} onChange={f('status')} fullWidth sx={fieldSx}>
            {metaStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Start Date" type="date" value={form.startDate} onChange={f('startDate')} fullWidth InputLabelProps={{ shrink: true }} sx={fieldSx} />
            <TextField label="Due Date" type="date" value={form.dueDate} onChange={f('dueDate')} fullWidth InputLabelProps={{ shrink: true }} sx={fieldSx} />
          </Stack>
        </Stack>
      </FormDrawer>

      <Menu open={Boolean(statusMenu)} anchorEl={statusMenu?.anchor} onClose={() => setStatusMenu(null)}
        PaperProps={{ sx: { borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', mt: 0.5 } }}>
        {metaStatuses.filter((s) => s !== statusMenu?.row?.status).map((s) => (
          <MenuItem key={s} onClick={() => { setStatusConfirm({ row: statusMenu.row, newStatus: s }); setStatusMenu(null); }}
            sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Set to {s}
          </MenuItem>
        ))}
      </Menu>

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="Change Assessment Status"
        message={`Change "${statusConfirm?.row?.name}" to ${statusConfirm?.newStatus}?`}
        onConfirm={() => { dispatch(updateAssessment(statusConfirm.row._id, { status: statusConfirm.newStatus })); setStatusConfirm(null); }}
        onClose={() => setStatusConfirm(null)}
      />

      <CorrectionsDialog open={Boolean(historyFor)} onClose={() => setHistoryFor(null)} assessment={historyFor} />
    </>
  );
};

export default AssessmentsPage;
