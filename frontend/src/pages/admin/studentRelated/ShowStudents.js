import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Tooltip, IconButton, Stack } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAllStudents } from '../../../redux/studentRelated/studentHandle';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import PageLayout from '../../../components/academic/PageLayout';

const ACCENT = '#d97706';
const ACCENT_BG = '#fef3c7';

const initials = (r) => `${r.name?.[0] || ''}`.toUpperCase() || '?';

const ShowStudents = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { studentsList, loading } = useSelector((s) => s.student);
  const { currentUser } = useSelector((s) => s.user);

  useEffect(() => {
    dispatch(getAllStudents(currentUser._id));
  }, [currentUser._id, dispatch]);

  const handleDelete = (id) => {
    dispatch(deleteUser(id, 'Student')).then(() => {
      dispatch(getAllStudents(currentUser._id));
    });
  };

  const rows = (studentsList || []).map((s) => ({ ...s, _id: s._id }));

  const columns = [
    {
      key: 'name', label: 'Student',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
            {initials(r)}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>Roll No: {r.rollNum}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'sclassName', label: 'Class',
      render: (r) => (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f0fdfa', fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>
          {r.sclassName?.sclassName || '—'}
        </Box>
      ),
    },
    {
      key: 'rollNum', label: 'Roll No',
      render: (r) => <Typography sx={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>#{r.rollNum}</Typography>,
    },
  ];

  return (
    <PageLayout
      title="Students"
      subtitle="View and manage all registered students"
      icon={PeopleAltIcon}
      iconColor={ACCENT}
      iconBg={ACCENT_BG}
      onAdd={() => navigate('/Admin/addstudents')}
      canAdd
      addLabel="Add Student"
      columns={columns}
      rows={rows}
      loading={loading}
      emptyMessage="No students registered yet."
      extraActions={(row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => navigate('/Admin/students/student/' + row._id)}
              sx={{ color: ACCENT, '&:hover': { bgcolor: ACCENT_BG } }}>
              <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDelete(row._id)}
              sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    />
  );
};

export default ShowStudents;
