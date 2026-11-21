import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Paper, Typography, Chip, LinearProgress, CircularProgress,
  Collapse, IconButton, Table, TableBody, TableHead, TableRow, TableCell,
  ToggleButtonGroup, ToggleButton, Avatar,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { getUserDetails } from '../../redux/userRelated/userHandle';
import {
  calculateOverallAttendancePercentage,
  calculateSubjectAttendancePercentage,
  groupAttendanceBySubject,
} from '../../components/attendanceCalculator';
import CustomBarChart from '../../components/CustomBarChart';
import PageHeader from '../../components/PageHeader';

const pctColor = (pct) => {
  if (pct >= 80) return { color: '#16a34a', bg: '#dcfce7' };
  if (pct >= 60) return { color: '#d97706', bg: '#fef3c7' };
  return { color: '#dc2626', bg: '#fee2e2' };
};

const SubjectRow = ({ subName, present, sessions, allData }) => {
  const [open, setOpen] = useState(false);
  const pct = calculateSubjectAttendancePercentage(present, sessions);
  const { color, bg } = pctColor(pct);

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
        <TableCell sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{subName}</TableCell>
        <TableCell sx={{ color: '#334155', fontSize: '0.875rem' }}>{present}</TableCell>
        <TableCell sx={{ color: '#334155', fontSize: '0.875rem' }}>{sessions}</TableCell>
        <TableCell>
          <Chip label={`${pct}%`} size="small" sx={{ bgcolor: bg, color, fontWeight: 700, fontSize: '0.75rem' }} />
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen((v) => !v)} sx={{ color: '#64748b' }}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Attendance Records
              </Typography>
              <Grid container spacing={1}>
                {allData.map((d, i) => {
                  const date = new Date(d.date);
                  const dateStr = date.toString() !== 'Invalid Date' ? date.toISOString().substring(0, 10) : 'Invalid Date';
                  const present = d.status === 'Present';
                  return (
                    <Grid item key={i}>
                      <Box sx={{
                        px: 1.5, py: 0.75, borderRadius: 1.5,
                        bgcolor: present ? '#dcfce7' : '#fee2e2',
                        border: `1px solid ${present ? '#bbf7d0' : '#fecaca'}`,
                      }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: present ? '#16a34a' : '#dc2626' }}>
                          {dateStr}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: present ? '#16a34a' : '#dc2626', textAlign: 'center' }}>
                          {d.status}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ViewStdAttendance = () => {
  const dispatch = useDispatch();
  const { userDetails, currentUser, loading } = useSelector((s) => s.user);
  const [subjectAttendance, setSubjectAttendance] = useState([]);
  const [view, setView] = useState('table');

  useEffect(() => {
    dispatch(getUserDetails(currentUser._id, 'Student'));
  }, [dispatch, currentUser._id]);

  useEffect(() => {
    if (userDetails) setSubjectAttendance(userDetails.attendance || []);
  }, [userDetails]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <CircularProgress sx={{ color: '#0d9488' }} />
      </Box>
    );
  }

  const hasData = subjectAttendance && subjectAttendance.length > 0;
  const attendanceBySubject = groupAttendanceBySubject(subjectAttendance);
  const overall = calculateOverallAttendancePercentage(subjectAttendance);
  const { color: overallColor, bg: overallBg } = pctColor(overall);

  const chartData = Object.entries(attendanceBySubject).map(([subName, { present, sessions }]) => ({
    subject: subName,
    attendancePercentage: calculateSubjectAttendancePercentage(present, sessions),
    totalClasses: sessions,
    attendedClasses: present,
  }));

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="Track your attendance across all subjects"
        breadcrumb={[{ label: 'Dashboard', to: '/student/dashboard' }, { label: 'Attendance', active: true }]}
      />

      {hasData ? (
        <>
          {/* Overall summary */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                <Box sx={{ position: 'relative', width: 80, height: 80, mx: 'auto', mb: 1.5 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={overallColor} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - overall / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 40 40)" />
                  </svg>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: overallColor }}>{overall.toFixed(0)}%</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Overall Attendance</Typography>
                <Chip label={overall >= 80 ? 'Good' : overall >= 60 ? 'Average' : 'Poor'} size="small"
                  sx={{ mt: 0.75, bgcolor: overallBg, color: overallColor, fontWeight: 700, fontSize: '0.72rem' }} />
              </Paper>
            </Grid>
            {[
              { label: 'Subjects Tracked', value: Object.keys(attendanceBySubject).length, color: '#2563eb', bg: '#eff6ff' },
              { label: 'Total Sessions', value: subjectAttendance.length, color: '#0d9488', bg: '#f0fdfa' },
            ].map((s) => (
              <Grid item xs={6} sm={4} key={s.label}>
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, mt: 0.25 }}>{s.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* View toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
              <ToggleButton value="table" sx={{ px: 2, fontWeight: 600, fontSize: '0.8rem' }}>
                <TableChartOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} /> Table
              </ToggleButton>
              <ToggleButton value="chart" sx={{ px: 2, fontWeight: 600, fontSize: '0.8rem' }}>
                <InsertChartOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} /> Chart
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {view === 'table' ? (
            <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Subject', 'Present', 'Total Sessions', 'Attendance %', 'Details'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(attendanceBySubject).map(([subName, { present, allData, subId, sessions }]) => (
                    <SubjectRow key={subId} subName={subName} present={present} sessions={sessions} allData={allData} />
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Attendance by Subject</Typography>
              <CustomBarChart chartData={chartData} dataKey="attendancePercentage" />
            </Paper>
          )}
        </>
      ) : (
        <Paper sx={{ p: 5, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: '#f0fdfa', mx: 'auto', mb: 2 }}>
            <EventAvailableIcon sx={{ fontSize: 32, color: '#0d9488' }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', mb: 1 }}>No attendance records yet</Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>Your attendance will appear here once your teacher starts marking.</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ViewStdAttendance;
