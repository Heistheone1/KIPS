import React from 'react';
import {
  Box, Grid, Paper, Typography, Avatar, Chip, Button, Divider,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PageHeader from '../../components/PageHeader';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import EditIcon from '@mui/icons-material/Edit';
import CakeIcon from '@mui/icons-material/Cake';
import WcIcon from '@mui/icons-material/Wc';
import HomeIcon from '@mui/icons-material/Home';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';

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

const StudentProfile = () => {
  const { currentUser } = useSelector((s) => s.user);
  const name = currentUser?.name || `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();
  const className = currentUser?.sclassName?.sclassName ?? currentUser?.className ?? '—';
  const schoolName = currentUser?.school?.schoolName ?? currentUser?.school?.name ?? '—';
  const initials = name ? name.charAt(0).toUpperCase() : 'S';

  return (
    <Box>
      <PageHeader
        title="My Profile"
        subtitle="View and manage your personal information"
        breadcrumb={[{ label: 'Dashboard', to: '/student/dashboard' }, { label: 'Profile', active: true }]}
        actions={
          <Button component={Link} to="/student/form" startIcon={<EditIcon />} variant="contained"
            sx={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
            Edit Profile
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Avatar card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Avatar sx={{
              width: 96, height: 96, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              fontSize: '2.2rem', fontWeight: 800,
            }}>
              {initials}
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', mb: 0.5 }}>{name}</Typography>
            <Chip
              label="Student"
              size="small"
              sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700, mb: 1.5 }}
            />
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mb: 2 }}>
              {currentUser?.email || 'No email on file'}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>Roll No.</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{currentUser?.rollNum ?? '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>Class</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{className}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>School</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textAlign: 'right', maxWidth: 120 }}>{schoolName}</Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>● Active Student</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Info cards */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 1 }}>Academic Information</Typography>
                <InfoRow icon={BadgeIcon} label="Roll Number" value={currentUser?.rollNum} color="#2563eb" />
                <InfoRow icon={ClassOutlinedIcon} label="Class" value={className} color="#2563eb" />
                <InfoRow icon={SchoolIcon} label="School" value={schoolName} color="#2563eb" />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 1 }}>Personal Information</Typography>
                <InfoRow icon={PersonOutlineIcon} label="Full Name" value={name} color="#0d9488" />
                <InfoRow icon={EmailIcon} label="Email" value={currentUser?.email} color="#0d9488" />
                <InfoRow icon={PhoneIcon} label="Phone" value={currentUser?.phone} color="#0d9488" />
                <InfoRow icon={CakeIcon} label="Date of Birth" value={currentUser?.dateOfBirth} color="#0d9488" />
                <InfoRow icon={WcIcon} label="Gender" value={currentUser?.gender} color="#0d9488" />
                <InfoRow icon={HomeIcon} label="Address" value={currentUser?.address} color="#0d9488" />
                <InfoRow icon={ContactPhoneIcon} label="Emergency Contact" value={currentUser?.emergencyContact} color="#0d9488" />
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentProfile;
