import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Tooltip, IconButton, Stack } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAllTeachers } from '../../../redux/teacherRelated/teacherHandle';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import PageLayout from '../../../components/academic/PageLayout';

const ACCENT = '#2563eb';
const ACCENT_BG = '#eff6ff';

const initials = (r) => `${r.name?.[0] || ''}`.toUpperCase() || '?';

const ShowTeachers = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { teachersList, loading } = useSelector((s) => s.teacher);
  const { currentUser } = useSelector((s) => s.user);

  useEffect(() => {
    dispatch(getAllTeachers(currentUser._id));
  }, [currentUser._id, dispatch]);

  const handleDelete = (id) => {
    dispatch(deleteUser(id, 'Teacher')).then(() => {
      dispatch(getAllTeachers(currentUser._id));
    });
  };

  const rows = (teachersList || []).map((t) => ({ ...t, _id: t._id }));

  const columns = [
    {
      key: 'name', label: 'Teacher',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT_BG, color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
            {initials(r)}
          </Avatar>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</Typography>
        </Box>
      ),
    },
    {
      key: 'teachSubject', label: 'Subject',
      render: (r) => r.teachSubject?.subName ? (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f0fdf4', fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
          {r.teachSubject.subName}
        </Box>
      ) : (
        <Box
          onClick={() => navigate(`/Admin/teachers/choosesubject/${r.teachSclass?._id}/${r._id}`)}
          sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#fef3c7', fontSize: '0.75rem', fontWeight: 700, color: '#d97706', cursor: 'pointer', '&:hover': { bgcolor: '#fde68a' } }}
        >
          + Assign Subject
        </Box>
      ),
    },
    {
      key: 'teachSclass', label: 'Class',
      render: (r) => (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 99, bgcolor: '#f5f3ff', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
          {r.teachSclass?.sclassName || '—'}
        </Box>
      ),
    },
  ];

  return (
    <PageLayout
      title="Teachers"
      subtitle="View and manage all registered teachers"
      icon={PeopleAltIcon}
      iconColor={ACCENT}
      iconBg={ACCENT_BG}
      onAdd={() => navigate('/Admin/teachers/chooseclass')}
      canAdd
      addLabel="Add Teacher"
      columns={columns}
      rows={rows}
      loading={loading}
      emptyMessage="No teachers registered yet."
      extraActions={(row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => navigate('/Admin/teachers/teacher/' + row._id)}
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

export default ShowTeachers;
