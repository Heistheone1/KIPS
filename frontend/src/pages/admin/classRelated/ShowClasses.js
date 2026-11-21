import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Tooltip, IconButton, Stack } from '@mui/material';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAllSclasses } from '../../../redux/sclassRelated/sclassHandle';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import PageLayout, { StatusBadge } from '../../../components/academic/PageLayout';

const ACCENT = '#0d9488';
const ACCENT_BG = '#f0fdfa';

const ShowClasses = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { sclassesList, loading } = useSelector((s) => s.sclass);
  const { currentUser } = useSelector((s) => s.user);

  useEffect(() => {
    dispatch(getAllSclasses(currentUser._id, 'Sclass'));
  }, [currentUser._id, dispatch]);

  const handleDelete = (id) => {
    dispatch(deleteUser(id, 'Sclass')).then(() => {
      dispatch(getAllSclasses(currentUser._id, 'Sclass'));
    });
  };

  const rows = (sclassesList || []).map((s) => ({ ...s, name: s.sclassName, _id: s._id }));

  const columns = [
    {
      key: 'name', label: 'Class Name',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClassOutlinedIcon sx={{ fontSize: 16, color: ACCENT }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{r.name}</Typography>
        </Box>
      ),
    },
    {
      key: 'school', label: 'School',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>{r.school?.schoolName || '—'}</Typography>
      ),
    },
  ];

  return (
    <PageLayout
      title="Classes"
      subtitle="Manage school classes and their students"
      icon={ClassOutlinedIcon}
      iconColor={ACCENT}
      iconBg={ACCENT_BG}
      onAdd={() => navigate('/Admin/addclass')}
      canAdd
      addLabel="Add Class"
      columns={columns}
      rows={rows}
      loading={loading}
      emptyMessage="No classes yet. Create one to get started."
      extraActions={(row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => navigate('/Admin/classes/class/' + row._id)}
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

export default ShowClasses;
