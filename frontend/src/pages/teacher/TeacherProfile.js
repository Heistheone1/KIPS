import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Avatar, Chip, Button, Divider,
} from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';
import PageHeader from '../../components/PageHeader';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import SchoolIcon from '@mui/icons-material/School';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const InfoRow = ({ icon: Icon, label, value, color = '#0d9488' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid #f8fafc' }}>
    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ fontSize: 18, color }} />
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{value || '—'}</Typography>
    </Box>
  </Box>
);

const TeacherProfile = () => {
  const { currentUser } = useSelector((s) => s.user);
  const fullName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();
  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'T';

  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/teacher-assignments`, { withCredentials: true })
      .then((r) => setAssignments(r.data.assignments || []))
      .catch(() => {});
  }, []);

  const uniqueClasses = [...new Map((assignments || []).map((a) => [a?.class?._id, a?.class]).filter(([k]) => k)).values()];
  const uniqueSubjects = [...new Map((assignments || []).map((a) => [a?.subject?._id, a?.subject]).filter(([k]) => k)).values()];

  const classesSummary = uniqueClasses.length
    ? uniqueClasses.map((c) => c.name).filter(Boolean).join(', ')
    : (currentUser?.teachSclass?.sclassName || '—');
  const subjectsSummary = uniqueSubjects.length
    ? uniqueSubjects.map((s) => s.name).filter(Boolean).join(', ')
    : (currentUser?.teachSubject?.subName || '—');

  return (
    <Box>
      <PageHeader
        title="Profile Settings"
        subtitle="Manage your teacher account information"
        breadcrumb={[{ label: 'Dashboard', to: '/teacher/dashboard' }, { label: 'Profile', active: true }]}
        actions={
          <Button startIcon={<EditIcon />} variant="contained"
            sx={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}>
            Edit Profile
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Avatar sx={{
              width: 96, height: 96, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              fontSize: '2.2rem', fontWeight: 800,
            }}>
              {initials}
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', mb: 0.5 }}>{fullName || 'Teacher'}</Typography>
            <Chip label="Teacher" size="small" sx={{ bgcolor: '#f0fdfa', color: '#0d9488', fontWeight: 700, mb: 1.5 }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mb: 2 }}>{currentUser?.email}</Typography>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Classes', value: String(uniqueClasses.length) },
                { label: 'Assignments', value: String(assignments.length) },
                { label: 'Subjects', value: String(uniqueSubjects.length || (currentUser?.teachSubject ? 1 : 0)) },
              ].map((s) => (
                <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{s.value}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>Active Account</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 1 }}>Account Information</Typography>
                <InfoRow icon={PersonOutlineIcon} label="Full Name" value={fullName} />
                <InfoRow icon={EmailIcon} label="Email Address" value={currentUser?.email} />
                <InfoRow icon={PhoneIcon} label="Phone Number" value={currentUser?.phone} />
                <InfoRow icon={SchoolIcon} label="School" value={currentUser?.school?.name || '—'} />
                <InfoRow icon={ClassOutlinedIcon} label="Assigned Classes" value={classesSummary || '—'} />
                <InfoRow icon={MenuBookIcon} label="Subjects Taught" value={subjectsSummary || '—'} />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <SecurityIcon sx={{ fontSize: 20, color: '#0d9488' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Security</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdfa', border: '1px solid #99f6e4' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: '#0f766e', fontWeight: 600 }}>
                    🔒 Your session is secured with HttpOnly cookies. Passwords are never stored in the browser.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherProfile;
