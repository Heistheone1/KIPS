import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Avatar, Divider, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, Chip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import StatCard from '../../components/StatCard';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const LEVEL_COLORS = {
  NURSERY: { bg: '#fce7f3', color: '#db2777' },
  PRIMARY: { bg: '#dbeafe', color: '#2563eb' },
};

const TeacherHomePage = () => {
  const { currentUser } = useSelector((s) => s.user);
  const firstName = currentUser?.firstName ?? 'Teacher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/teacher-assignments`, { withCredentials: true })
      .then((r) => setAssignments(r.data.assignments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive unique classes and subjects from assignments
  const uniqueClasses  = [...new Map((assignments || []).map((a) => [a?.class?._id, a?.class]).filter(([k]) => k)).values()];
  const uniqueSubjects = [...new Map((assignments || []).map((a) => [a?.subject?._id, a?.subject]).filter(([k]) => k)).values()];

  const stats = [
    { title: 'My Classes',   value: String(uniqueClasses.length),  icon: ClassOutlinedIcon, subtitle: 'Assigned to me',      trend: 0, trendUp: true,  colorIndex: 1 },
    { title: 'My Subjects',  value: String(uniqueSubjects.length), icon: MenuBookIcon,       subtitle: 'Subjects I teach',    trend: 0, trendUp: true,  colorIndex: 0 },
    { title: 'Assignments',  value: String(assignments.length),    icon: AssignmentIcon,     subtitle: 'Total assignments',   trend: 0, trendUp: true,  colorIndex: 2 },
    { title: 'Mark Entry',   value: '—',                           icon: EditNoteIcon,       subtitle: 'Go to mark entry',    trend: 0, trendUp: false, colorIndex: 3 },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
          {greeting}, {firstName} 👋
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.25 }}>
          You have <strong style={{ color: '#0d9488' }}>{assignments.length}</strong> active teaching assignment{assignments.length !== 1 ? 's' : ''}.
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} lg={3} key={s.title}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#0d9488' }} />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {/* My Classes */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>My Classes</Typography>
                <Chip label={`${uniqueClasses.length} classes`} size="small" sx={{ bgcolor: '#f0fdfa', color: '#0d9488', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              {uniqueClasses.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
                  No classes assigned yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {uniqueClasses.map((cls) => {
                    const lc = LEVEL_COLORS[cls.level] || { bg: '#f1f5f9', color: '#64748b' };
                    // subjects taught in this class
                    const classSubjects = (assignments || [])
                      .filter((a) => a?.class?._id === cls._id)
                      .map((a) => a.subject?.name)
                      .filter(Boolean);
                    return (
                      <Box key={cls._id} sx={{
                        display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                        borderRadius: 2, border: '1px solid #f1f5f9',
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#0d9488' }, transition: 'all 0.15s',
                      }}>
                        <Avatar sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: lc.bg, fontSize: '0.72rem', fontWeight: 800, color: lc.color }}>
                          {cls.code || cls.name?.slice(0, 2)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{cls.name}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {classSubjects.join(' · ') || '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ px: 1.2, py: 0.3, borderRadius: 99, bgcolor: lc.bg, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: lc.color }}>{cls.level}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* My Subjects + Quick Links */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>My Subjects</Typography>
                <Chip label={`${uniqueSubjects.length} subjects`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#10b981', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              {uniqueSubjects.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
                  No subjects assigned yet.
                </Typography>
              ) : (
                <List disablePadding>
                  {uniqueSubjects.map((subj, i) => {
                    const lc = LEVEL_COLORS[subj.level] || { bg: '#f1f5f9', color: '#64748b' };
                    const inClasses = (assignments || [])
                      .filter((a) => a?.subject?._id === subj._id)
                      .map((a) => a.class?.name)
                      .filter(Boolean);
                    return (
                      <React.Fragment key={subj._id}>
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: lc.bg }}>
                              <MenuBookIcon sx={{ fontSize: 15, color: lc.color }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{subj.name}</Typography>}
                            secondary={<Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{inClasses.join(', ')}</Typography>}
                          />
                          {subj.level && (
                            <Box sx={{ px: 1.2, py: 0.3, borderRadius: 99, bgcolor: lc.bg }}>
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: lc.color }}>{subj.level}</Typography>
                            </Box>
                          )}
                        </ListItem>
                        {i < uniqueSubjects.length - 1 && <Divider sx={{ borderColor: '#f8fafc' }} />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Paper>

            {/* Quick Links */}
            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', mb: 1.5 }}>Quick Links</Typography>
              {[
                { label: 'Assessments',  to: '/teacher/assessments', icon: AssignmentIcon },
                { label: 'Mark Entry',   to: '/teacher/mark-entry',  icon: EditNoteIcon },
                { label: 'Results',      to: '/teacher/results',     icon: TableChartIcon },
                { label: 'Report Cards', to: '/teacher/reports',     icon: ArticleIcon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Box key={item.label} component={Link} to={item.to} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                    borderRadius: 2, textDecoration: 'none', color: '#334155',
                    '&:hover': { bgcolor: '#f0fdfa', color: '#0d9488' }, transition: 'all 0.15s', mb: 0.5,
                  }}>
                    <Icon sx={{ fontSize: 18, color: 'inherit' }} />
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</Typography>
                    <ArrowForwardIcon sx={{ fontSize: 14, ml: 'auto', color: '#94a3b8' }} />
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TeacherHomePage;
