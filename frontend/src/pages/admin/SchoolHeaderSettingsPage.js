import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Paper, Stack, Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5001';

const SchoolHeaderSettingsPage = () => {
  const { currentUser } = useSelector((s) => s.user);
  const schoolId = currentUser?.school?._id || currentUser?.school;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', address: '', email: '', logoUrl: '',
    headmistressName: '', headmistressTitle: 'Headmistress',
    tagline: '', reportCity: 'KIGALI', stampLabel: 'Stamp and signature',
  });

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/schools/${schoolId}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        const s = data.school || {};
        const rh = s.reportHeader || {};
        setForm({
          name: s.name || '',
          phone: s.phone || '',
          address: s.address || '',
          email: s.email || '',
          logoUrl: s.logoUrl || '',
          headmistressName: rh.headmistressName || '',
          headmistressTitle: rh.headmistressTitle || 'Headmistress',
          tagline: rh.tagline || '',
          reportCity: rh.reportCity || 'KIGALI',
          stampLabel: rh.stampLabel || 'Stamp and signature',
        });
      })
      .catch(() => setError('Failed to load school info'))
      .finally(() => setLoading(false));
  }, [schoolId]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${BASE_URL}/api/schools/${schoolId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          email: form.email,
          logoUrl: form.logoUrl,
          reportHeader: {
            headmistressName: form.headmistressName,
            headmistressTitle: form.headmistressTitle,
            tagline: form.tagline,
            reportCity: form.reportCity,
            stampLabel: form.stampLabel,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      setSuccess('School header settings saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const field = (label, name, props = {}) => (
    <TextField
      label={label} name={name} value={form[name]} onChange={handleChange}
      size="small" fullWidth {...props}
    />
  );

  return (
    <Box sx={{ p: 3, maxWidth: 700 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>School Header Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These details appear on every printed report card header and footer.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>School Info</Typography>
        <Stack spacing={2}>
          {field('School Name', 'name')}
          {field('Phone Number', 'phone')}
          {field('Address / Tagline (shown under name)', 'address')}
          {field('Email', 'email')}
          {field('Logo URL', 'logoUrl', { placeholder: 'https://...' })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Report Card Footer</Typography>
        <Stack spacing={2}>
          {field('Headmistress / Principal Full Name', 'headmistressName', { placeholder: 'Ms. NIYONSABA Marie Rose' })}
          {field('Title', 'headmistressTitle', { placeholder: 'Headmistress' })}
          {field('City (for "Done at ...")', 'reportCity', { placeholder: 'KIGALI' })}
          {field('Stamp label', 'stampLabel', { placeholder: 'Stamp and signature' })}
        </Stack>
      </Paper>

      <Divider sx={{ mb: 2 }} />
      <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default SchoolHeaderSettingsPage;
