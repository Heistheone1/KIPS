import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, MenuItem, Stack, Alert, Chip, Button, Typography, Link,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  fetchSubjectResults, fetchResultStatus, generateSubjectResults,
} from '../../../redux/resultRelated/resultHandle';
import { resultReset } from '../../../redux/resultRelated/resultSlice';
import { fetchAcademicYears, fetchTerms, fetchClasses, fetchSubjects } from '../../../redux/academicRelated/academicHandle';
import AcademicTable from '../../../components/academic/AcademicTable';
import PageHeader from '../../../components/academic/PageHeader';

const BASE_PATH_BY_ROLE = { ADMIN: 'admin', DOS: 'dos', CLASS_TEACHER: 'class-teacher', TEACHER: 'teacher' };

const display = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(2));

const SubjectResultPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { subjectResults, resultStatus, loading, error, success } = useSelector((s) => s.result);
  const { academicYears, terms, classes, subjects } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);
  const basePath = BASE_PATH_BY_ROLE[currentRole] || 'admin';
  const canManage = ['ADMIN', 'DOS'].includes(currentRole);

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchTerms());
    dispatch(fetchClasses());
    dispatch(fetchSubjects());
  }, [dispatch]);

  const buildQs = () => {
    const params = new URLSearchParams();
    if (filterYear) params.set('academicYear', filterYear);
    if (filterTerm) params.set('term', filterTerm);
    if (filterClass) params.set('class', filterClass);
    if (filterSubject) params.set('subject', filterSubject);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  useEffect(() => {
    dispatch(fetchSubjectResults(buildQs()));
    dispatch(fetchResultStatus(buildQs()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterTerm, filterClass, filterSubject, dispatch]);

  useEffect(() => {
    if (success) dispatch(resultReset());
  }, [success, dispatch]);

  const refetch = () => {
    dispatch(fetchSubjectResults(buildQs()));
    dispatch(fetchResultStatus(buildQs()));
  };

  const handleGenerate = () => {
    if (!filterYear || !filterTerm || !filterClass || !filterSubject) return;
    dispatch(generateSubjectResults(
      { academicYear: filterYear, term: filterTerm, class: filterClass, subject: filterSubject },
      refetch,
    ));
  };

  const columns = useMemo(() => [
    {
      key: 'student',
      label: 'Student',
      render: (r) => `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || r.student?.admissionNumber || '—',
    },
    { key: 'admission', label: 'Adm. No', render: (r) => r.student?.admissionNumber || '—' },
    { key: 'subject', label: 'Subject', render: (r) => r.subject?.name || '—' },
    { key: 'total', label: 'Total', render: (r) => display(r.total) },
    { key: 'grade', label: 'Grade', render: (r) => r.grade || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Chip label={r.status} size="small" color={r.status === 'COMPLETE' ? 'success' : 'warning'} />,
    },
    { key: 'recordedCount', label: 'Recorded', render: (r) => r.recordedCount ?? '—' },
    { key: 'missingCount', label: 'Missing', render: (r) => r.missingCount ?? '—' },
    {
      key: 'isStale',
      label: 'Stale',
      render: (r) => (r.isStale ? <Chip label="STALE" size="small" color="warning" /> : 'No'),
    },
  ], []);

  const staleNote = resultStatus ? `${resultStatus.stale?.subjects ?? 0} subject results stale` : '';

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Subject Results" canAdd={false} />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(resultReset())}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => dispatch(resultReset())}>{success}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField select label="Academic Year" size="small" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterTerm(''); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All years</MenuItem>
          {academicYears.map((y) => <MenuItem key={y._id} value={y._id}>{y.name}</MenuItem>)}
        </TextField>
        <TextField select label="Term" size="small" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All terms</MenuItem>
          {(filterYear ? terms.filter((t) => (t.academicYear?._id || t.academicYear) === filterYear) : terms)
            .map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
        </TextField>
        <TextField select label="Class" size="small" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All classes</MenuItem>
          {classes.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField select label="Subject" size="small" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All subjects</MenuItem>
          {subjects.map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        {canManage && (
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleGenerate}
            disabled={!filterYear || !filterTerm || !filterClass || !filterSubject || loading}>
            Generate
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {subjectResults.length} results{staleNote ? ` — ${staleNote}` : ''}
        </Typography>
        <Link component="button" variant="body2" onClick={() => navigate(`/${basePath}/results`)}
          startIcon={<TableChartIcon fontSize="inherit" />}>
          Term results
        </Link>
      </Stack>
      <AcademicTable
        columns={columns}
        rows={subjectResults}
        loading={loading}
        emptyMessage="No subject results yet — pick a year, term, class and subject, then Generate."
      />
    </Box>
  );
};

export default SubjectResultPage;

