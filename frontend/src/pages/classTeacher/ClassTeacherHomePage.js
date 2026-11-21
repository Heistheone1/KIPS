import React from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, LinearProgress,
  List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StatCard from '../../components/StatCard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditNoteIcon from '@mui/icons-material/EditNote';

const STATS = [
  { title: 'My Class', value: 'Form 3A', icon: ClassOutlinedIcon, subtitle: 'Assigned class', colorIndex: 1 },
  { title: 'Students', value: '32', icon: PeopleAltIcon, subtitle: 'In my class', trend: 2, trendUp: true, colorIndex: 0 },
  { title: 'Subjects', value: '8', icon: AssignmentIcon, subtitle: 'Taught this term', colorIndex: 2 },
  { title: 'Pending Marks', value: '16', icon: EditNoteIcon, subtitle: 'Awaiting entry', trend: 3, trendUp: false, colorIndex: 3 },
];

const MY_STUDENTS = [
  { name: 'Alice Wanjiru', rollNo: '001', avg: 91, status: 'present' },
  { name: 'Brian Otieno', rollNo: '002', avg: 85, status: 'present' },
  { name: 'Carol Muthoni', rollNo: '003', avg: 78, status: 'absent' },
  { name: 'David Kamau', rollNo: '004', avg: 82, status: 'present' },
  { name: 'Eve Achieng', rollNo: '005', avg: 74, status: 'present' },
];

const SUBJECT_PROGRESS = [
  { name: 'Mathematics', graded: 28, total: 32, color: '#000693' },
  { name: 'English', graded: 32, total: 32, color: '#0d9488' },
  { name: 'Physics', graded: 20, total: 32, color: '#7c3aed' },
  { name: 'Chemistry', graded: 15, total: 32, color: '#d97706' },
];

const ClassTeacherHomePage = () => {
  const { currentUser } = useSelector((s) => s.user);
  const firstName = currentUser?.firstName ?? 'Teacher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {greeting}, {firstName} 👋
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.25 }}>
            Class Teacher — <strong style={{ color: '#0d9488' }}>Form 3A</strong> · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>
        <Button
          component={Link} to="/class-teacher/assessments"
          startIcon={<AddIcon />}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            borderRadius: 2, px: 2.5, py: 1, fontWeight: 700,
            boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #0f766e, #115e59)' },
          }}
        >
          New Assessment
        </Button>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {STATS.map((s) => (
          <Grid item xs={12} sm={6} lg={3} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* My Students */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>My Students</Typography>
              <Box component={Link} to="/class-teacher/my-students" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0d9488', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                View all <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            <List disablePadding>
              {MY_STUDENTS.map((s, i) => (
                <React.Fragment key={s.rollNo}>
                  <ListItem disablePadding sx={{ py: 1.25 }}>
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: '#f0fdfa', color: '#0d9488', fontSize: '0.8rem', fontWeight: 700 }}>
                        {s.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{s.name}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>Roll No. {s.rollNo}</Typography>}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={`${s.avg}%`} size="small" sx={{ bgcolor: '#f0fdfa', color: '#0d9488', fontWeight: 700, fontSize: '0.72rem' }} />
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.status === 'present' ? '#16a34a' : '#dc2626' }} />
                    </Box>
                  </ListItem>
                  {i < MY_STUDENTS.length - 1 && <Divider sx={{ borderColor: '#f8fafc' }} />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Mark Entry Progress */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Mark Entry Progress</Typography>
              <Box component={Link} to="/class-teacher/assessments" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0d9488', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                Enter marks <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {SUBJECT_PROGRESS.map((sub) => (
                <Box key={sub.name}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{sub.name}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: sub.color }}>
                      {sub.graded}/{sub.total}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(sub.graded / sub.total) * 100}
                    sx={{
                      height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': { bgcolor: sub.color, borderRadius: 3 },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Quick Actions</Typography>
            {[
              { label: 'My Class Details', to: '/class-teacher/my-class', icon: ClassOutlinedIcon, color: '#0d9488', bg: '#f0fdfa' },
              { label: 'All Students', to: '/class-teacher/my-students', icon: PeopleAltIcon, color: '#000693', bg: '#eef0ff' },
              { label: 'Enter Marks', to: '/class-teacher/assessments', icon: EditNoteIcon, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'View Results', to: '/class-teacher/results', icon: TableChartIcon, color: '#d97706', bg: '#fffbeb' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Box key={item.label} component={Link} to={item.to} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, mb: 0.75,
                  borderRadius: 2, textDecoration: 'none', color: '#334155',
                  border: '1px solid #f1f5f9',
                  '&:hover': { bgcolor: item.bg, borderColor: item.color, color: item.color },
                  transition: 'all 0.15s',
                }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon sx={{ fontSize: 16, color: item.color }} />
                  </Box>
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

export default ClassTeacherHomePage;
