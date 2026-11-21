import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Paper, Typography, Chip, LinearProgress,
  CircularProgress, ToggleButtonGroup, ToggleButton, Avatar,
} from '@mui/material';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getUserDetails } from '../../redux/userRelated/userHandle';
import { getSubjectList } from '../../redux/sclassRelated/sclassHandle';
import CustomBarChart from '../../components/CustomBarChart';
import PageHeader from '../../components/PageHeader';

const gradeColor = (marks) => {
  if (marks >= 80) return { color: '#16a34a', bg: '#dcfce7', grade: 'A' };
  if (marks >= 70) return { color: '#0d9488', bg: '#ccfbf1', grade: 'B+' };
  if (marks >= 60) return { color: '#2563eb', bg: '#dbeafe', grade: 'B' };
  if (marks >= 50) return { color: '#d97706', bg: '#fef3c7', grade: 'C' };
  return { color: '#dc2626', bg: '#fee2e2', grade: 'D' };
};

const StudentSubjects = () => {
  const dispatch = useDispatch();
  const { subjectsList, sclassDetails } = useSelector((s) => s.sclass);
  const { userDetails, currentUser, loading } = useSelector((s) => s.user);
  const [subjectMarks, setSubjectMarks] = useState([]);
  const [view, setView] = useState('cards');

  useEffect(() => {
    dispatch(getUserDetails(currentUser._id, 'Student'));
  }, [dispatch, currentUser._id]);

  useEffect(() => {
    if (userDetails) setSubjectMarks(userDetails.examResult || []);
  }, [userDetails]);

  useEffect(() => {
    if (subjectMarks.length === 0 && currentUser?.sclassName?._id) {
      dispatch(getSubjectList(currentUser.sclassName._id, 'ClassSubjects'));
    }
  }, [subjectMarks, dispatch, currentUser?.sclassName?._id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <CircularProgress sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  const hasMarks = subjectMarks && subjectMarks.length > 0;
  const avg = hasMarks
    ? Math.round(subjectMarks.reduce((a, r) => a + (r.marksObtained || 0), 0) / subjectMarks.length)
    : 0;
  const best = hasMarks ? Math.max(...subjectMarks.map((r) => r.marksObtained || 0)) : 0;

  return (
    <Box>
      <PageHeader
        title="My Subjects & Marks"
        subtitle="Track your academic performance across all subjects"
        breadcrumb={[{ label: 'Dashboard', to: '/student/dashboard' }, { label: 'Subjects', active: true }]}
      />

      {hasMarks ? (
        <>
          {/* Summary row */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {[
              { label: 'Subjects', value: subjectMarks.length, color: '#2563eb', bg: '#eff6ff' },
              { label: 'Average Score', value: `${avg}%`, color: '#0d9488', bg: '#f0fdfa' },
              { label: 'Best Score', value: `${best}%`, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Overall Grade', value: gradeColor(avg).grade, color: gradeColor(avg).color, bg: gradeColor(avg).bg },
            ].map((s) => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, mt: 0.25 }}>{s.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* View toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
              <ToggleButton value="cards" sx={{ px: 2, fontWeight: 600, fontSize: '0.8rem' }}>
                <TableChartOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} /> Cards
              </ToggleButton>
              <ToggleButton value="chart" sx={{ px: 2, fontWeight: 600, fontSize: '0.8rem' }}>
                <InsertChartOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} /> Chart
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {view === 'cards' ? (
            <Grid container spacing={2}>
              {subjectMarks.map((result, i) => {
                if (!result.subName || result.marksObtained == null) return null;
                const { color, bg, grade } = gradeColor(result.marksObtained);
                return (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Paper sx={{
                      p: 2.5, borderRadius: 3, border: '1px solid #f1f5f9',
                      transition: 'all 0.15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            {result.subName.subName}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {result.subName.subCode}
                          </Typography>
                        </Box>
                        <Chip label={grade} size="small" sx={{ bgcolor: bg, color, fontWeight: 800, fontSize: '0.8rem' }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color }}>{result.marksObtained}</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={result.marksObtained}
                        sx={{
                          height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                        }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Performance Chart</Typography>
              <CustomBarChart chartData={subjectMarks} dataKey="marksObtained" />
            </Paper>
          )}
        </>
      ) : (
        /* No marks — show subject list */
        <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: '#eff6ff', mx: 'auto', mb: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: '#2563eb' }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', mb: 1 }}>
            No marks recorded yet
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 3 }}>
            Class: {sclassDetails?.sclassName ?? '—'}
          </Typography>
          {subjectsList && subjectsList.length > 0 && (
            <Grid container spacing={1.5} sx={{ maxWidth: 480, mx: 'auto' }}>
              {subjectsList.map((sub, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{sub.subName}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sub.subCode}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default StudentSubjects;
