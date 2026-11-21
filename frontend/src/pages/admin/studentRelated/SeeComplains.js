import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Avatar } from '@mui/material';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import { getAllComplains } from '../../../redux/complainRelated/complainHandle';
import PageLayout from '../../../components/academic/PageLayout';

const ACCENT = '#7c3aed';
const ACCENT_BG = '#f5f3ff';

const initials = (name) => name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

const SeeComplains = () => {
  const dispatch = useDispatch();
  const { complainsList, loading } = useSelector((s) => s.complain);
  const { currentUser } = useSelector((s) => s.user);

  useEffect(() => {
    dispatch(getAllComplains(currentUser._id, 'Complain'));
  }, [currentUser._id, dispatch]);

  const rows = (complainsList || []).filter((c) => c && c.complaint);

  const columns = [
    {
      key: 'user', label: 'Student',
      render: (r) => {
        const name = r.user?.name || r.user?.firstName
          ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim()
          : '—';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
              {initials(name)}
            </Avatar>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{name}</Typography>
          </Box>
        );
      },
    },
    {
      key: 'complaint', label: 'Complaint',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.complaint || '—'}
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
    <PageLayout
      title="Complaints"
      subtitle="Review complaints submitted by students"
      icon={AnnouncementOutlinedIcon}
      iconColor={ACCENT}
      iconBg={ACCENT_BG}
      canAdd={false}
      columns={columns}
      rows={rows}
      loading={loading}
      emptyMessage="No complaints submitted yet."
    />
  );
};

export default SeeComplains;
