import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, Stack, Alert, Box, Typography, Tooltip, IconButton } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAllNotices } from '../../../redux/noticeRelated/noticeHandle';
import { addStuff } from '../../../redux/userRelated/userHandle';
import { underControl } from '../../../redux/userRelated/userSlice';
import PageLayout from '../../../components/academic/PageLayout';
import FormDrawer from '../../../components/academic/FormDrawer';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const ACCENT = '#dc2626';
const ACCENT_BG = '#fef2f2';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const empty = { title: '', details: '', date: '' };

const ShowNotices = () => {
  const dispatch = useDispatch();
  const { noticesList, loading } = useSelector((s) => s.notice);
  const { currentUser, status, error } = useSelector((s) => s.user);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState(null);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    dispatch(getAllNotices(currentUser._id, 'Notice'));
  }, [currentUser._id, dispatch]);

  useEffect(() => {
    if (status === 'added') {
      setOpen(false);
      setForm(empty);
      dispatch(underControl());
      dispatch(getAllNotices(currentUser._id, 'Notice'));
    }
  }, [status, currentUser._id, dispatch]);

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.details.trim() || !form.date) return;
    dispatch(addStuff({ title: form.title, details: form.details, date: form.date, adminID: currentUser._id }, 'Notice'));
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await axios.delete(`${BASE_URL}/api/Notice/${id}`, { withCredentials: true });
      dispatch(getAllNotices(currentUser._id, 'Notice'));
    } catch {
      setLocalError('Failed to delete notice.');
    } finally {
      setDeleting(null);
    }
  };

  const columns = [
    {
      key: 'title', label: 'Title',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <NotificationsActiveIcon sx={{ fontSize: 16, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.title}</Typography>
        </Box>
      ),
    },
    {
      key: 'details', label: 'Details',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.details}
        </Typography>
      ),
    },
    {
      key: 'date', label: 'Date',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>
          {r.date ? new Date(r.date).toISOString().slice(0, 10) : '—'}
        </Typography>
      ),
    },
  ];

  return (
    <>
      {localError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setLocalError(null)}>{localError}</Alert>}
      <PageLayout
        title="Notices"
        subtitle="Post announcements and updates to the school community"
        icon={NotificationsActiveIcon}
        iconColor={ACCENT}
        iconBg={ACCENT_BG}
        onAdd={() => { setForm(empty); setOpen(true); }}
        canAdd
        addLabel="New Notice"
        columns={columns}
        rows={noticesList || []}
        loading={loading}
        emptyMessage="No notices yet. Post one to inform the school community."
        extraActions={(row) => (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              disabled={deleting === row._id}
              onClick={() => handleDelete(row._id)}
              sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      />
      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="New Notice"
        subtitle="Fill in the notice details below"
        onSubmit={handleSubmit}
        loading={status === 'loading'}
        error={error}
        accentColor={ACCENT}
        submitLabel="Post Notice"
      >
        <Stack spacing={2.5}>
          <TextField label="Title" value={form.title} onChange={f('title')} fullWidth required sx={fieldSx} placeholder="e.g. School Closure Notice" />
          <TextField label="Details" value={form.details} onChange={f('details')} fullWidth required multiline rows={4} sx={fieldSx} placeholder="Write the full notice details here…" />
          <TextField label="Date" type="date" value={form.date} onChange={f('date')} fullWidth required InputLabelProps={{ shrink: true }} sx={fieldSx} />
        </Stack>
      </FormDrawer>
    </>
  );
};

export default ShowNotices;
