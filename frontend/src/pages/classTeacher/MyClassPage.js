import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, Avatar, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider, Stack, Grid,
  Tooltip, IconButton, Alert, TextField, MenuItem,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchClasses, fetchEnrollments, fetchClassTeacherAssignments, fetchStudents, createStudentWithEnrollment, updateStudent, deleteStudent, deleteClass } from '../../redux/academicRelated/academicHandle';
import { academicReset } from '../../redux/academicRelated/academicSlice';
import FormDrawer from '../../components/academic/FormDrawer';
import PageHeader from '../../components/academic/PageHeader';
import AcademicTable from '../../components/academic/AcademicTable';

const ACCENT = '#0d9488';
const ACCENT_BG = '#f0fdf4';
const LEVEL_COLORS = {
  NURSERY: { bg: '#fce7f3', color: '#db2777', label: 'Nursery' },
  PRIMARY: { bg: '#dbeafe', color: '#2563eb', label: 'Primary' },
};
const STATUS_COLORS = {
  ACTIVE: { bg: '#dcfce7', color: '#16a34a' },
  INACTIVE: { bg: '#f1f5f9', color: '#64748b' },
  CLOSED: { bg: '#fee2e2', color: '#dc2626' },
};

const fieldSx = (color) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: color },
    '&.Mui-focused fieldset': { borderColor: color },
  },
  '& .MuiInputLabel-root.Mui-focused': { color },
});

const emptyStudent = {
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '',
  guardianEmail: '', status: 'ACTIVE',
};

const emptyEnroll = { academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' };

const STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</Typography>
  </Box>
);

const MyClassPage = () => {
  const dispatch = useDispatch();
  const { classes = [], classTeacherAssignments, enrollments = [], students = [], loading, error, success } = useSelector((s) => s.academic);
  const { currentRole } = useSelector((s) => s.user);

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openAddStudent, setOpenAddStudent] = useState(false);
  const [openEditStudent, setOpenEditStudent] = useState(false);
  const [openDeleteStudent, setOpenDeleteStudent] = useState(false);
  const [openDeleteClass, setOpenDeleteClass] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [studentForm, setStudentForm] = useState({ firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '', guardianEmail: '', status: 'ACTIVE' });
  const [enrollForm, setEnrollForm] = useState({ academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchClassTeacherAssignments());
    dispatch(fetchClasses());
    dispatch(fetchStudents());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      setOpenDetail(false);
      setOpenAddStudent(false);
      setOpenEditStudent(false);
      setOpenDeleteStudent(false);
      setOpenDeleteClass(false);
      setEditingStudent(null);
      setDeletingStudent(null);
      setDeletingClass(null);
      setStudentForm({ firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '', guardianEmail: '', status: 'ACTIVE' });
      setEnrollForm({ academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' });
    }
  }, [success, dispatch]);

  const activeAssignments = classTeacherAssignments.filter((a) => a.status === 'ACTIVE');
  const myClassIds = activeAssignments.map((a) => a.class?._id || a.class);
  const myClasses = classes.filter((c) => myClassIds.includes(c._id));

  // Auto-select first class if none selected
  const selectedAssignment = myClasses.length > 0 && myClasses[0];

  // Filter enrollments for the selected class
  const selectedClassId = selectedAssignment?._id;
  const classEnrollments = enrollments.filter((e) => (e.class?._id || e.class) === selectedClassId && e.status === 'ACTIVE');
  const myStudents = classEnrollments.map((e) => e.student).filter(Boolean);

  const handleOpenDetail = (cls) => {
    setSelectedClass(cls);
    setOpenDetail(true);
  };

  const handleDeleteClass = (cls) => {
    setDeletingClass(cls);
    setOpenDeleteClass(true);
  };

  const handleConfirmDeleteClass = () => {
    if (deletingClass?._id) {
      dispatch(deleteClass(deletingClass._id));
      setOpenDeleteClass(false);
      setDeletingClass(null);
    }
  };

  const handleAddStudent = () => {
    setStudentForm({ firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '', guardianEmail: '', status: 'ACTIVE' });
    setEnrollForm({ academicYear: selectedAssignment?.academicYear?._id || '', class: selectedClassId || '', enrollmentDate: '', status: 'ACTIVE' });
    setOpenAddStudent(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      lastName: student.lastName || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      status: student.status || 'ACTIVE',
    });
    setOpenEditStudent(true);
  };

  const handleDeleteStudent = (student) => {
    setDeletingStudent(student);
    setOpenDeleteStudent(true);
  };

  const handleConfirmDeleteStudent = () => {
    if (deletingStudent?._id) {
      dispatch(deleteStudent(deletingStudent._id));
      setOpenDeleteStudent(false);
      setDeletingStudent(null);
    }
  };

  const handleSubmitAdd = () => {
    if (!enrollForm.academicYear || !enrollForm.class) return;
    dispatch(createStudentWithEnrollment({ ...studentForm, level: '' }, { academicYear: enrollForm.academicYear, class: enrollForm.class, enrollmentDate: enrollForm.enrollmentDate || undefined, status: enrollForm.status }));
  };

  const handleSubmitEdit = () => {
    if (editingStudent?._id) {
      dispatch(updateStudent(editingStudent._id, {
        ...studentForm,
        dateOfBirth: studentForm.dateOfBirth || null,
        gender: studentForm.gender || null,
      }));
    }
  };

  const handleConfirmDelete = () => {
    if (deletingStudent?._id) {
      dispatch(deleteStudent(deletingStudent._id));
      setOpenDeleteStudent(false);
      setDeletingStudent(null);
    }
  };

  const columns = [
    { key: 'admissionNumber', label: 'Adm No.', render: (r) => r.admissionNumber || '—' },
    { key: 'firstName', label: 'First Name', render: (r) => r.firstName || '—' },
    { key: 'lastName', label: 'Last Name', render: (r) => r.lastName || '—' },
    { key: 'gender', label: 'Gender', render: (r) => r.gender || '—' },
    { key: 'phone', label: 'Guardian Phone', render: (r) => r.guardianPhone || '—' },
    { key: 'status', label: 'Status', isStatus: true },
  ];

  if (loading && myClasses.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <PageHeader title="My Class" subtitle="Manage your class and students" canAdd={false} />
        {selectedAssignment && (
          <Button onClick={handleAddStudent} startIcon={<AddIcon />}
            variant="contained"
            sx={{ background: `linear-gradient(135deg, ${ACCENT}, #0f766e)`, borderRadius: 2, fontWeight: 700, fontSize: '0.82rem', boxShadow: `0 4px 14px ${ACCENT}33` }}>
            Add Student
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => dispatch(academicReset())}>{success}</Alert>}

      {myClasses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No class assigned to you yet.</Typography>
        </Paper>
      ) : (
        <>
          {selectedAssignment ? (
            <Paper sx={{ mb: 3, borderRadius: 3, border: '1px solid #f1f5f9' }}>
              <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: ACCENT_BG }}>
                    <ClassOutlinedIcon sx={{ fontSize: 28, color: ACCENT }} />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>{selectedAssignment.name}</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>Code: {selectedAssignment.code}</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.5, borderRadius: 99, bgcolor: LEVEL_COLORS[selectedAssignment.level]?.bg || '#f1f5f9' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: LEVEL_COLORS[selectedAssignment.level]?.color || '#64748b' }}>{LEVEL_COLORS[selectedAssignment.level]?.label || selectedAssignment.level}</Typography>
                  </Box>
                  <Chip label={selectedAssignment.status} size="small" color={selectedAssignment.status === 'ACTIVE' ? 'success' : 'default'} />
                  <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>Academic Year: {selectedAssignment.academicYear?.name || '—'}</Typography>
                </Box>
              </Box>
              <Divider />
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Students ({myStudents.length})</Typography>
                  <Button onClick={handleAddStudent} startIcon={<AddIcon />} variant="contained" size="small"
                    sx={{ background: `linear-gradient(135deg, ${ACCENT}, #0f766e)`, borderRadius: 2, fontWeight: 700, fontSize: '0.75rem', boxShadow: `0 4px 14px ${ACCENT}33` }}>
                    Add Student
                  </Button>
                </Box>
                <AcademicTable
                  columns={[
                    { key: 'admissionNumber', label: 'Adm No.', render: (r) => r.admissionNumber || '—' },
                    { key: 'firstName', label: 'First Name', render: (r) => r.firstName || '—' },
                    { key: 'lastName', label: 'Last Name', render: (r) => r.lastName || '—' },
                    { key: 'gender', label: 'Gender', render: (r) => r.gender || '—' },
                    { key: 'phone', label: 'Guardian Phone', render: (r) => r.guardianPhone || '—' },
                    { key: 'status', label: 'Status', isStatus: true },
                  ]}
                  rows={myStudents}
                  loading={loading}
                  emptyMessage="No students enrolled in this class yet."
                  extraActions={(row) => (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditingStudent(row); setOpenEditStudent(true); }} title="Edit">
                          <EditIcon sx={{ fontSize: 16, color: ACCENT }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => { setDeletingStudent(row); setOpenDeleteStudent(true); }} title="Delete">
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />
              </Box>
            </Paper>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Select a class to view students.
            </Typography>
          )}

          {myClasses.map((cls) => (
            <Paper
              key={cls._id}
              sx={{
                p: 2.5,
                mb: 2,
                cursor: 'pointer',
                border: '1px solid #f1f5f9',
                borderRadius: 3,
                transition: 'box-shadow 0.2s, border-color 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  borderColor: '#cbd5e1',
                },
              }}
              onClick={() => handleOpenDetail(cls)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: ACCENT_BG }}>
                    <ClassOutlinedIcon sx={{ fontSize: 22, color: ACCENT }} />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{cls.name}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>Code: {cls.code}</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, bgcolor: LEVEL_COLORS[cls.level]?.bg || '#f1f5f9' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: LEVEL_COLORS[cls.level]?.color || '#64748b' }}>{LEVEL_COLORS[cls.level]?.label || cls.level}</Typography>
                  </Box>
                  <Chip label={cls.status} size="small" color={cls.status === 'ACTIVE' ? 'success' : 'default'} />
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>Academic Year: {cls.academicYear?.name || '—'}</Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleAltIcon sx={{ fontSize: 16, color: ACCENT }} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>
                      {enrollments.filter((e) => (e.class?._id || e.class) === cls._id && e.status === 'ACTIVE').length} students
                    </Typography>
                  </Box>
                  {/* Delete Class Button */}
                  <Tooltip title="Delete Class">
                    <IconButton size="small" color="error"
                      onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls); }}
                      sx={{ width: 28, height: 28, flexShrink: 0 }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}
        </>
      )}
    </Box>
  );
};

export default MyClassPage;