import React, { useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, Divider, LinearProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import StatCard from '../../components/StatCard';
import {
  fetchAcademicYears, fetchClasses, fetchStudents, fetchSubjects,
} from '../../redux/academicRelated/academicHandle';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArticleIcon from '@mui/icons-material/Article';
import TableChartIcon from '@mui/icons-material/TableChart';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

const QUICK_ACTIONS = [
  { label: 'Add Student', icon: PeopleAltIcon, to: '/admin/students', color: '#000693', bg: '#eef0ff' },
  { label: 'New Class', icon: ClassOutlinedIcon, to: '/admin/classes', color: '#0d9488', bg: '#f0fdfa' },
  { label: 'Add Subject', icon: MenuBookIcon, to: '/admin/subjects', color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Assessment', icon: AssignmentIcon, to: '/admin/assessments', color: '#d97706', bg: '#fffbeb' },
  { label: 'Enroll Student', icon: AssignmentIndIcon, to: '/admin/enrollments', color: '#2563eb', bg: '#eff6ff' },
  { label: 'Report Cards', icon: ArticleIcon, to: '/admin/reports', color: '#dc2626', bg: '#fef2f2' },
  { label: 'View Results', icon: TableChartIcon, to: '/admin/results', color: '#0d9488', bg: '#f0fdfa' },
  { label: 'Academic Years', icon: CalendarMonthIcon, to: '/admin/academic-years', color: '#64748b', bg: '#f8fafc' },
];

const SYSTEM_STATUS = [
  { label: 'Database', detail: 'Connected & healthy', ok: true },
  { label: 'API Server', detail: 'All endpoints responding', ok: true },
  { label: 'Session Service', detail: 'HttpOnly cookies active', ok: true },
];

const AdminHomePage = () => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((s) => s.user);
  const { academicYears, classes, students, subjects, loading } = useSelector((s) => s.academic);

  useEffect(() => {
    dispatch(fetchAcademicYears());
    dispatch(fetchClasses());
    dispatch(fetchStudents());
    dispatch(fetchSubjects());
  }, [dispatch]);

  const firstName = currentUser?.firstName ?? 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Active academic year
  const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
  const activeStudents = students.filter((s) => s.status === 'ACTIVE');
  const activeClasses = classes.filter((c) => c.status === 'ACTIVE');

  const STATS = [
    { title: 'Total Students', value: loading ? '…' : String(activeStudents.length), icon: PeopleAltIcon, subtitle: 'Active enrollments', colorIndex: 0 },
    { title: 'Classes', value: loading ? '…' : String(activeClasses.length), icon: ClassOutlinedIcon, subtitle: activeYear ? activeYear.name : 'All years', colorIndex: 1 },
    { title: 'Subjects', value: loading ? '…' : String(subjects.length), icon: MenuBookIcon, subtitle: 'Offered this year', colorIndex: 2 },
    { title: 'Academic Years', value: loading ? '…' : String(academicYears.length), icon: CalendarMonthIcon, subtitle: activeYear ? `Active: ${activeYear.name}` : 'None active', colorIndex: 3 },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {greeting}, {firstName} 👋
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.25 }}>
            {activeYear
              ? <>Active year: <strong style={{ color: '#000693' }}>{activeYear.name}</strong> · {activeYear.code}</>
              : 'No active academic year — create one to get started.'}
          </Typography>
        </Box>
        <Button
          component={Link} to="/admin/students"
          startIcon={<AddIcon />}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #000693, #270843)',
            borderRadius: 2, px: 2.5, py: 1, fontWeight: 700,
            boxShadow: '0 4px 14px rgba(0,6,147,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #07005b, #1a0530)' },
          }}
        >
          New Registration
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {STATS.map((s) => (
          <Grid item xs={12} sm={6} lg={3} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Quick Actions</Typography>
        <Grid container spacing={1.5}>
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Grid item xs={6} sm={3} md={3} lg={1.5} key={a.label}>
                <Box
                  component={Link} to={a.to}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 1, p: 2, borderRadius: 2.5, textDecoration: 'none',
                    border: '1px solid #f1f5f9', bgcolor: '#fafafa',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: a.bg, borderColor: a.color, transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${a.color}20` },
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 20, color: a.color }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', textAlign: 'center', lineHeight: 1.3 }}>
                    {a.label}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Grid container spacing={2.5}>
        {/* Academic Years list */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Academic Years</Typography>
              <Box component={Link} to="/admin/academic-years" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#000693', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                Manage <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            {academicYears.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No academic years yet.</Typography>
                <Button component={Link} to="/admin/academic-years" size="small" sx={{ mt: 1, color: '#000693' }}>Create one →</Button>
              </Box>
            ) : (
              <List disablePadding>
                {academicYears.slice(0, 5).map((y, i) => (
                  <React.Fragment key={y._id}>
                    <ListItem disablePadding sx={{ py: 1.25 }}>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: y.status === 'ACTIVE' ? '#eef0ff' : '#f8fafc', color: y.status === 'ACTIVE' ? '#000693' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                          {y.code?.slice(0, 2)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{y.name}</Typography>}
                        secondary={<Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{y.startDate?.slice(0, 10)} → {y.endDate?.slice(0, 10)}</Typography>}
                      />
                      <Chip
                        label={y.status}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: '0.68rem',
                          bgcolor: y.status === 'ACTIVE' ? '#eef0ff' : y.status === 'CLOSED' ? '#f1f5f9' : '#fffbeb',
                          color: y.status === 'ACTIVE' ? '#000693' : y.status === 'CLOSED' ? '#64748b' : '#d97706',
                        }}
                      />
                    </ListItem>
                    {i < Math.min(academicYears.length, 5) - 1 && <Divider sx={{ borderColor: '#f8fafc' }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Classes overview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Classes</Typography>
              <Box component={Link} to="/admin/classes" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0d9488', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                View all <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            {classes.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No classes yet.</Typography>
                <Button component={Link} to="/admin/classes" size="small" sx={{ mt: 1, color: '#0d9488' }}>Create one →</Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {classes.slice(0, 5).map((cls) => (
                  <Box key={cls._id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.25, borderRadius: 2, border: '1px solid #f1f5f9', '&:hover': { bgcolor: '#f8fafc' } }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClassOutlinedIcon sx={{ fontSize: 18, color: '#0d9488' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{cls.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {cls.code} {cls.stream ? `· Stream ${cls.stream}` : ''} {cls.capacity ? `· Cap: ${cls.capacity}` : ''}
                      </Typography>
                    </Box>
                    <Chip label={cls.status} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: cls.status === 'ACTIVE' ? '#f0fdfa' : '#f1f5f9', color: cls.status === 'ACTIVE' ? '#0d9488' : '#64748b' }} />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* System health + nav links */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>System Health</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {SYSTEM_STATUS.map((s) => (
                <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>{s.label}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.detail}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', mb: 1.5 }}>More Links</Typography>
            {[
              { label: 'Terms', to: '/admin/terms', icon: DateRangeIcon },
              { label: 'Teacher Assignments', to: '/admin/teacher-assignments', icon: AssignmentIcon },
              { label: 'Class Teachers', to: '/admin/class-teacher-assignments', icon: SupervisorAccountIcon },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Box key={item.label} component={Link} to={item.to} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1, mb: 0.5,
                  borderRadius: 2, textDecoration: 'none', color: '#334155',
                  '&:hover': { bgcolor: '#f0fdfa', color: '#0d9488' }, transition: 'all 0.15s',
                }}>
                  <Icon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 13, ml: 'auto', color: '#cbd5e1' }} />
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminHomePage;
