import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Paper, Typography, Button, Chip, LinearProgress, Divider,
  CircularProgress, Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArticleIcon from '@mui/icons-material/Article';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import {
  fetchStudents, fetchClasses, fetchSubjects, fetchTerms, fetchAcademicYears,
  fetchEnrollments, fetchTeacherAssignments,
} from '../../redux/academicRelated/academicHandle';

const ROLE_COLOR = {
  ADMIN:   '#000693',
  DOS:     '#7c3aed',
  TEACHER: '#0d9488',
  CLASS_TEACHER: '#0d9488',
  STUDENT: '#2563eb',
};

const DosHomePage = () => {
  const dispatch = useDispatch();
  const { currentUser, currentRole, users } = useSelector((s) => s.user);
  const { students, classes: classList, subjects, terms, academicYears, enrollments, teacherAssignments } = useSelector((s) => s.academic);
  const { loading } = useSelector((s) => s.academic);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchClasses());
    dispatch(fetchSubjects());
    dispatch(fetchTerms());
    dispatch(fetchAcademicYears());
    dispatch(fetchEnrollments());
    dispatch(fetchTeacherAssignments());
  }, [dispatch]);

  const firstName = currentUser?.firstName ?? 'DOS';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalStudents = students.length;
  const totalClasses = classList.length;
  const totalTeachers = (users || []).filter((u) => u.role === 'TEACHER' || u.role === 'DOS').length;
  const totalSubjects = subjects.length;
  const totalEnrollments = enrollments.length;
  const totalTeacherAssignments = teacherAssignments.length;
  const activeAcademicYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0] || {};
  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0] || {};

  const classPerformance = classList.slice(0, 5).map((cls, i) => {
    const color = Object.values(ROLE_COLOR)[i % Object.values(ROLE_COLOR).length];
    const enrolled = enrollments.filter((e) => e.class && e.class._id === cls._id).length;
    return {
      name: cls.name || 'Unknown Class',
      avg: Math.round(65 + Math.random() * 30), // Placeholder - real avg would come from results
      students: enrolled || 0,
      color,
    };
  });

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2, color: '#64748b' }}>Loading academic data…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {greeting}, {firstName} 👋
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.25 }}>
            Academic overview — {activeAcademicYear.name || 'Active Year'} • {activeTerm.name || 'Active Term'} • KIPS School
          </Typography>
        </Box>
        <Button
          component={Link} to="/dos/enrollments"
          startIcon={<AddIcon />}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            borderRadius: 2, px: 2.5, py: 1, fontWeight: 700,
            boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #5b21b6)' },
          }}
        >
          New Enrollment
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Students" value={totalStudents} icon={PeopleAltIcon} subtitle="Enrolled students" colorIndex={0} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Active Classes" value={totalClasses} icon={ClassOutlinedIcon} subtitle="Across all levels" colorIndex={1} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Teaching Staff" value={totalTeachers} icon={PeopleIcon} subtitle="Teachers & DOS" colorIndex={2} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Subjects" value={totalSubjects} icon={MenuBookIcon} subtitle="Across all classes" colorIndex={3} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Enrollments" value={totalEnrollments} icon={AssignmentIcon} subtitle="Student placements" colorIndex={4} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Teacher Assignments" value={totalTeacherAssignments} icon={SchoolIcon} subtitle="Subject-to-class mapping" colorIndex={5} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Class Performance */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Class Performance</Typography>
              <Box component={Link} to="/dos/results" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#7c3aed', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                Full results <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {classPerformance.length > 0 ? (
                classPerformance.map((cls) => (
                  <Box key={cls.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cls.color }} />
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{cls.name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{cls.students} students</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: cls.color }}>{cls.avg}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={cls.avg}
                      sx={{
                        height: 7, borderRadius: 4, bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { bgcolor: cls.color, borderRadius: 4 },
                      }}
                    />
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', py: 2 }}>
                  No class data available. Add classes first.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Quick Links */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Manage Classes', to: '/dos/classes', icon: ClassOutlinedIcon, color: '#0d9488', bg: '#f0fdfa' },
                { label: 'View Students', to: '/dos/students', icon: PeopleAltIcon, color: '#000693', bg: '#eef0ff' },
                { label: 'Teachers', to: '/dos/teachers', icon: PeopleIcon, color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'Subjects', to: '/dos/subjects', icon: MenuBookIcon, color: '#d97706', bg: '#fffbeb' },
                { label: 'Assessments', to: '/dos/assessments', icon: AssignmentIcon, color: '#d97706', bg: '#fffbeb' },
                { label: 'Results', to: '/dos/results', icon: TableChartIcon, color: '#2563eb', bg: '#eff6ff' },
                { label: 'Report Cards', to: '/dos/reports', icon: ArticleIcon, color: '#dc2626', bg: '#fef2f2' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Box
                    key={item.label}
                    component={Link}
                    to={item.to}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                      borderRadius: 2, textDecoration: 'none', color: '#334155',
                      border: '1px solid #f1f5f9',
                      '&:hover': { bgcolor: item.bg, borderColor: item.color, color: item.color },
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon sx={{ fontSize: 16, color: item.color }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</Typography>
                    <ArrowForwardIcon sx={{ fontSize: 14, ml: 'auto', color: '#cbd5e1' }} />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Term Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Term Summary</Typography>
            {[
              { label: 'Academic Year', value: activeAcademicYear.name || '—', color: '#000693' },
              { label: 'Current Term', value: activeTerm.name || '—', color: '#7c3aed' },
              { label: 'Total Students', value: totalStudents.toString(), color: '#0d9488' },
              { label: 'Enrollments', value: totalEnrollments.toString(), color: '#d97706' },
            ].map((item) => (
              <Box key={item.label} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: item.color }}>{item.value}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={50}
                  sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 2 } }}
                />
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', mb: 0.5 }}>DOS Authority</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>Full academic oversight</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Manage classes, students, subjects, teacher assignments, assessments, results & report cards
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DosHomePage;
