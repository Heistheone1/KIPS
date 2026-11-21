import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Alert, Avatar, Chip,
} from '@mui/material';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { addStuff } from '../../redux/userRelated/userHandle';
import PageHeader from '../../components/PageHeader';

const StudentComplain = () => {
  const dispatch = useDispatch();
  const { status, currentUser, error } = useSelector((s) => s.user);

  const [complaint, setComplaint] = useState('');
  const [date, setDate] = useState('');
  const [loader, setLoader] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!complaint.trim() || !date) return;
    setLoader(true);
    setServerError(null);
    dispatch(addStuff({
      user: currentUser._id,
      date,
      complaint,
      school: currentUser.school?._id || currentUser.school,
    }, 'Complain'));
  };

  useEffect(() => {
    if (status === 'added') {
      setLoader(false);
      setSuccess(true);
      setComplaint('');
      setDate('');
      setTimeout(() => setSuccess(false), 4000);
    } else if (error) {
      setLoader(false);
      setServerError('Failed to submit. Please try again.');
    }
  }, [status, error]);

  return (
    <Box>
      <PageHeader
        title="Submit a Complaint"
        subtitle="Report an issue or concern to the school administration"
        breadcrumb={[{ label: 'Dashboard', to: '/student/dashboard' }, { label: 'Complain', active: true }]}
      />

      <Box sx={{ maxWidth: 600 }}>
        <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #f1f5f9' }}>
          {/* Icon header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: '#fef2f2' }}>
              <AnnouncementOutlinedIcon sx={{ color: '#dc2626', fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>New Complaint</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>Your complaint will be reviewed by the admin</Typography>
            </Box>
          </Box>

          {success && (
            <Alert
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              severity="success"
              sx={{ mb: 3, borderRadius: 2, bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
            >
              Complaint submitted successfully!
            </Alert>
          )}

          {serverError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{serverError}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Date of Incident"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />

              <TextField
                fullWidth
                label="Describe your complaint"
                multiline
                rows={5}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                required
                placeholder="Please provide as much detail as possible about the issue..."
                sx={fieldSx}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loader || !complaint.trim() || !date}
                  startIcon={loader ? null : <SendIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    borderRadius: 2, px: 3, py: 1.25, fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
                    '&:hover': { background: 'linear-gradient(135deg, #b91c1c, #991b1b)' },
                    '&:disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
                  }}
                >
                  {loader ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Submit Complaint'}
                </Button>
                <Chip
                  label="Confidential"
                  size="small"
                  sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem' }}
                />
              </Box>
            </Box>
          </form>
        </Paper>

        {/* Info box */}
        <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3, border: '1px solid #fef3c7', bgcolor: '#fffbeb' }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#d97706', mb: 0.5 }}>
            📋 What happens next?
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.6 }}>
            Your complaint will be reviewed by the school administration within 2–3 working days.
            You may be contacted for further information if needed.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fafafa',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#2563eb' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: 2 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
};

export default StudentComplain;
