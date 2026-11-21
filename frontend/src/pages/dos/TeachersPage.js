import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Paper, Typography, Button, TextField, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Avatar, Alert, CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from '../../components/PageHeader';
import { fetchUsers } from '../../redux/userRelated/userHandle';

const ROLE_COLOR = {
  ADMIN:   { bg: '#fee2e2', color: '#dc2626' },
  DOS:     { bg: '#dbeafe', color: '#2563eb' },
  TEACHER: { bg: '#fef3c7', color: '#d97706' },
};
const STATUS_COLOR = {
  active:    { bg: '#dcfce7', color: '#16a34a' },
  inactive:  { bg: '#f1f5f9', color: '#64748b' },
  suspended: { bg: '#fee2e2', color: '#dc2626' },
};

const initials = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'U';

const TeachersPage = () => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((s) => s.user);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const teachers = (users || []).filter((u) => u.role === 'TEACHER' || u.role === 'DOS');
  const filtered = teachers.filter((t) =>
    `${t.firstName || ''} ${t.lastName || ''} ${t.email || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ py: 3 }}>
      <PageHeader
        title="Teachers & Academic Staff"
        subtitle="View and manage teaching staff across the school"
        breadcrumb={[{ label: 'Dashboard', to: '/dos/dashboard' }, { label: 'Teachers', active: true }]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          fullWidth
          label="Search teachers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<SearchIcon />}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 3, border: '1px solid #f1f5f9' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc', '& th': { color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    No teachers found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t._id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '& td': { padding: 1.5 } }}>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#e2e8f0', color: '#475569' }}>
                        {initials(t)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                          {t.firstName} {t.lastName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.role}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLOR[t.role]?.bg || '#e2e8f0',
                        color: ROLE_COLOR[t.role]?.color || '#64748b',
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#475569' }}>{t.email || '—'}</TableCell>
                  <TableCell sx={{ color: '#475569' }}>{t.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.status}
                      size="small"
                      sx={{
                        bgcolor: STATUS_COLOR[t.status]?.bg || '#e2e8f0',
                        color: STATUS_COLOR[t.status]?.color || '#64748b',
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TeachersPage;
