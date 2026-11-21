import React from 'react';
import {
  Box, Grid, Paper, Typography, Avatar, Chip,
  LinearProgress, List, ListItem, ListItemText, Divider, Button,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StatCard from '../../components/StatCard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';

const SUBJECTS = [
  { name: 'Mathematics', teacher: 'Mr. Odhiambo', marks: 88, grade: 'A', color: '#000693', bg: '#eef0ff' },
  { name: 'English', teacher: 'Ms. Wanjiku', marks: 76, grade: 'B+', color: '#0d9488', bg: '#f0fdfa' },
  { name: 'Physics', teacher: 'Mr. Kamau', marks: 82, grade: 'A-', color: '#7c3aed', bg: '#f5f3ff' },
  { name: 'Chemistry', teacher: 'Ms. Achieng', marks: 71, grade: 'B', color: '#d97706', bg: '#fffbeb' },
  { name: 'Biology', teacher: 'Mr. Mwangi', marks: 79, grade: 'B+', color: '#2563eb', bg: '#eff6ff' },
  { name: 'History', teacher: 'Ms. Njeri', marks: 85, grade: 'A-', color: '#dc2626', bg: '#fef2f2' },
];

const NOTICES = [
  { title: 'End of Term Exams start June 20', date: 'Jun 10', tag: 'Exam', color: '#dc2626', bg: '#fef2f2' },
  { title: 'Parent-Teacher Meeting on June 25', date: 'Jun 12', tag: 'Event', color: '#d97706', bg: '#fffbeb' },
  { title: 'Library books due for return', date: 'Jun 15', tag: 'Notice', color: '#0d9488', bg: '#f0fdfa' },
];

const ATTENDANCE_PCT = 87;

const StudentHomePage = () => {
  const { currentUser } = useSelector((s) => s.user);
  const firstName = currentUser?.firstName ?? 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const avgMarks = Math.round(SUBJECTS.reduce((a, s) => a + s.marks, 0) / SUBJECTS.length);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {greeting}, {firstName} 👋
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.25 }}>
            Keep up the great work! Your average is <strong style={{ color: '#0d9488' }}>{avgMarks}%</strong> this term.
          </Typography>
        </Box>
        <Button
          component={Link} to="/student/subjects"
          endIcon={<ArrowForwardIcon />}
          variant="outlined"
          sx={{ borderColor: '#0d9488', color: '#0d9488', borderRadius: 2, fontWeight: 700, '&:hover': { bgcolor: '#f0fdfa' } }}
        >
          View All Marks
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Subjects', value: String(SUBJECTS.length), icon: AssignmentIcon, subtitle: 'This term', colorIndex: 0 },
          { title: 'Attendance', value: `${ATTENDANCE_PCT}%`, icon: ClassOutlinedIcon, subtitle: 'Overall rate', trend: 3, trendUp: true, colorIndex: 1 },
          { title: 'Average Score', value: `${avgMarks}%`, icon: TrendingUpIcon, subtitle: 'Across all subjects', trend: 5, trendUp: true, colorIndex: 2 },
          { title: 'Class Rank', value: '#4', icon: EmojiEventsIcon, subtitle: 'Out of 38 students', trend: 2, trendUp: true, colorIndex: 3 },
        ].map((s) => (
          <Grid item xs={12} sm={6} lg={3} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Subject Performance */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Subject Performance</Typography>
              <Box component={Link} to="/student/subjects" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0d9488', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                Full report <ArrowForwardIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SUBJECTS.map((sub) => (
                <Box key={sub.name}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sub.color, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{sub.name}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sub.teacher}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{sub.marks}%</Typography>
                      <Chip label={sub.grade} size="small" sx={{ bgcolor: sub.bg, color: sub.color, fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={sub.marks}
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

        <Grid item xs={12} md={5}>
          {/* Attendance Card */}
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>
              Attendance Overview
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Circle indicator */}
              <Box sx={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="#0d9488" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - ATTENDANCE_PCT / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0d9488' }}>{ATTENDANCE_PCT}%</Typography>
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                {[
                  { label: 'Days Present', value: '68', color: '#0d9488' },
                  { label: 'Days Absent', value: '10', color: '#dc2626' },
                  { label: 'Total School Days', value: '78', color: '#64748b' },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: item.color }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component={Link} to="/student/attendance" sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
              mt: 2, p: 1, borderRadius: 2, bgcolor: '#f0fdfa', color: '#0d9488',
              fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
              '&:hover': { bgcolor: '#ccfbf1' }, transition: 'all 0.15s',
            }}>
              View detailed attendance <ArrowForwardIcon sx={{ fontSize: 14 }} />
            </Box>
          </Paper>

          {/* Notices */}
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Notices</Typography>
              <AnnouncementOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
            </Box>
            <List disablePadding>
              {NOTICES.map((n, i) => (
                <React.Fragment key={i}>
                  <ListItem disablePadding sx={{ py: 1.25, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: n.color }}>{n.date}</Typography>
                    </Box>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{n.title}</Typography>}
                      secondary={<Chip label={n.tag} size="small" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: n.bg, color: n.color }} />}
                    />
                  </ListItem>
                  {i < NOTICES.length - 1 && <Divider sx={{ borderColor: '#f8fafc' }} />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentHomePage;
