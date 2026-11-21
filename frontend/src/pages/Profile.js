import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Avatar, Chip, Button, TextField,
  FormControl, InputLabel, Input, FormHelperText, Alert, Divider,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateProfile as updateProfileAction,
  changePassword as changePasswordAction,
} from '../redux/userRelated/userHandle';
import { resetProfileStatus } from '../redux/userRelated/userSlice';
import PageHeader from '../components/PageHeader';
import { ROLE_HOME } from '../App';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const ROLE_COLOR = {
  ADMIN: '#000693',
  DOS: '#7c3aed',
  TEACHER: '#0d9488',
  CLASS_TEACHER: '#0d9488',
  STUDENT: '#2563eb',
};

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { currentUser, currentRole, profileUpdated, passwordChanged, profileError, passwordError, loading } =
    useSelector((s) => s.user);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    phone: currentUser?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const color = ROLE_COLOR[currentRole] || ROLE_COLOR.ADMIN;
  const fullName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'User';
  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    dispatch(resetProfileStatus());
    await dispatch(updateProfileAction(profileForm));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    dispatch(resetProfileStatus());
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      dispatch({ type: 'user/passwordError', payload: 'New passwords do not match' });
      return;
    }
    await dispatch(changePasswordAction({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    }));
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrent(false);
    setShowNew(false);
  };

  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 2, md: 4 } }}>
      <PageHeader
        title="My Profile"
        subtitle="Edit your personal details and change your password"
        breadcrumb={[{ label: 'Dashboard', to: ROLE_HOME[currentRole] || '/' }, { label: 'Profile', active: true }]}
        actions={
          <Button startIcon={<EditIcon />} variant="contained"
            sx={{ background: `linear-gradient(135deg, ${color}, ${darken(color)})`, borderRadius: 2, fontWeight: 700 }}>
            Edit Profile
          </Button>
        }
      />

      {profileError && (
        <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>
      )}
      {passwordError && (
        <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>
      )}
      {profileUpdated && (
        <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully.</Alert>
      )}
      {passwordChanged && (
        <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully.</Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Avatar sx={{
              width: 96, height: 96, mx: 'auto', mb: 2,
              background: `linear-gradient(135deg, ${color}, ${darken(color)})`,
              fontSize: '2.2rem', fontWeight: 800,
            }}>
              {initials}
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', mb: 0.5 }}>{fullName}</Typography>
            <Chip label={currentRole} size="small"
              sx={{ bgcolor: `${color}15`, color, fontWeight: 700, mb: 1.5 }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mb: 2 }}>{currentUser?.email || 'No email on file'}</Typography>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ textAlign: 'left', mb: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Role
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{currentRole}</Typography>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                School
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                {currentUser?.school?.name || '—'}
              </Typography>
            </Box>

            <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: '#16a34a' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>Active Account</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Edit profile form */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <PersonOutlineIcon sx={{ fontSize: 20, color }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Personal Details</Typography>
                </Box>
                <form onSubmit={handleSaveProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="firstName"
                        label="First Name"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        disabled={loading}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="lastName"
                        label="Last Name"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        disabled={loading}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="phone"
                        label="Phone Number"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        disabled={loading}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading || profileUpdated}
                    sx={{
                      mt: 1,
                      background: `linear-gradient(135deg, ${color}, ${darken(color)})`,
                      color: '#fff',
                      borderRadius: 2,
                      fontWeight: 700,
                      '&:hover': { opacity: 0.9 },
                    }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Paper>
            </Grid>

            {/* Change password form */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <LockOutlinedIcon sx={{ fontSize: 20, color }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Change Password</Typography>
                </Box>
                <form onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                    <InputLabel>Current Password</InputLabel>
                    <Input
                      name="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      endAdornment={
                        <Button
                          size="small"
                          sx={{ p: 1, '&:hover': { bgcolor: 'transparent' } }}
                          onClick={() => setShowCurrent(!showCurrent)}
                        >
                          {showCurrent ? <VisibilityOff /> : <Visibility />}
                        </Button>
                      }
                      disabled={loading}
                    />
                    <FormHelperText>Enter your current password to confirm the change.</FormHelperText>
                  </FormControl>

                  <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                    <InputLabel>New Password</InputLabel>
                    <Input
                      name="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      endAdornment={
                        <Button
                          size="small"
                          sx={{ p: 1, '&:hover': { bgcolor: 'transparent' } }}
                          onClick={() => setShowNew(!showNew)}
                        >
                          {showNew ? <VisibilityOff /> : <Visibility />}
                        </Button>
                      }
                      disabled={loading}
                    />
                    <FormHelperText>At least 8 characters.</FormHelperText>
                  </FormControl>

                  <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                    <InputLabel>Confirm New Password</InputLabel>
                    <Input
                      name="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={loading}
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<LockOutlinedIcon />}
                    disabled={loading || passwordChanged}
                    sx={{
                      mt: 1,
                      background: `linear-gradient(135deg, ${color}, ${darken(color)})`,
                      color: '#fff',
                      borderRadius: 2,
                      fontWeight: 700,
                      '&:hover': { opacity: 0.9 },
                    }}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

const darken = (hex) => {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - 30);
  const g = Math.max(0, ((num >> 8) & 0xFF) - 30);
  const b = Math.max(0, (num & 0xFF) - 30);
  return `rgb(${r},${g},${b})`;
};

export default ProfilePage;
