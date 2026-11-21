import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, TextField, MenuItem, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Avatar, IconButton, Stack, Paper,
} from '@mui/material';
import { fetchEnrollments, fetchClassTeacherAssignments } from '../../redux/academicRelated/academicHandle';
import {
  fetchStudents, createStudentWithEnrollment, updateStudent, deleteStudent,
} from '../../redux/academicRelated/academicHandle';
import AcademicTable from '../../components/academic/AcademicTable';
import PageHeader from '../../components/academic/PageHeader';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const emptyStudent = {
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '',
  guardianEmail: '', status: 'ACTIVE',
};

const initials = (r) => `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase() || 'U';

const MyStudentsPage = () => {
  const dispatch = useDispatch();
  const { students = [], enrollments = [], classTeacherAssignments, loading, error, success } = useSelector((s) => s.academic);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [enrollForm, setEnrollForm] = useState({ academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' });

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchClassTeacherAssignments());
  }, [dispatch]);

  useEffect(() => {
    if (selectedAssignment) {
      const a = classTeacherAssignments.find((x) => x._id === selectedAssignment);
      if (a) {
        const classId = a.class?._id || a.class;
        const yearId = a.academicYear?._id || a.academicYear;
        dispatch(fetchEnrollments(`?class=${classId}&academicYear=${yearId}&status=ACTIVE`));
      }
    }
  }, [selectedAssignment, classTeacherAssignments, dispatch]);

  useEffect(() => {
    if (success) {
      setOpenAdd(false);
      setOpenEdit(false);
      setOpenDelete(false);
      setEditingStudent(null);
      setDeletingStudent(null);
      setStudentForm(emptyStudent);
      setEnrollForm({ academicYear: '', class: '', enrollmentDate: '', status: 'ACTIVE' });
    }
  }, [success]);

  const activeAssignments = classTeacherAssignments.filter((a) => a.status === 'ACTIVE');

  const myClassId = selectedAssignment
    ? (classTeacherAssignments.find((a) => a._id === selectedAssignment)?.class?._id || classTeacherAssignments.find((a) => a._id === selectedAssignment)?.class)
    : null;

  const myStudents = enrollments.filter((e) => e.student).map((e) => e.student);

  const handleAddStudent = () => {
    setStudentForm(emptyStudent);
    setEnrollForm({ academicYear: '', class: myClassId || '', enrollmentDate: '', status: 'ACTIVE' });
    setOpenAdd(true);
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
    setOpenEdit(true);
  };

  const handleDeleteStudent = (student) => {
    setDeletingStudent(student);
    setOpenDelete(true);
  };

  const handleSubmitAdd = () => {
    if (!enrollForm.academicYear || !enrollForm.class) return;
    dispatch(createStudentWithEnrollment(
      { ...studentForm, level: '' },
      { academicYear: enrollForm.academicYear, class: enrollForm.class, enrollmentDate: enrollForm.enrollmentDate || undefined, status: enrollForm.status },
    ));
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
      setOpenDelete(false);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <PageHeader title="My Students" subtitle="Manage students in your assigned class" canAdd={false} />
        <Button
          onClick={handleAddStudent}
          disabled={!selectedAssignment}
          startIcon={<AddIcon />}
          variant="contained"
          sx={{
            background: !selectedAssignment ? '#e2e8f0' : 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: !selectedAssignment ? '#94a3b8' : '#fff',
            borderRadius: 2, px: 2.5, py: 1, fontWeight: 700,
          }}
        >
          {selectedAssignment ? 'Add Student' : 'Select a class first'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <TextField
        select label="Select Class Assignment" value={selectedAssignment}
        onChange={(e) => setSelectedAssignment(e.target.value)}
        size="small" sx={{ mb: 3, minWidth: 320 }}
      >
        <MenuItem value="">— Select Your Class —</MenuItem>
        {activeAssignments.map((a) => (
          <MenuItem key={a._id} value={a._id}>
            {a.class?.name} — {a.academicYear?.name} {a.term?.name}
          </MenuItem>
        ))}
      </TextField>

      {selectedAssignment && (
        <>
          <AcademicTable
            columns={columns}
            rows={myStudents}
            loading={loading}
            emptyMessage="No students enrolled in this class."
            extraActions={(row) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => handleEditStudent(row)} title="Edit">
                  <EditIcon sx={{ fontSize: 16, color: '#0d9488' }} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDeleteStudent(row)} title="Delete">
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          />

          {/* Add Student Dialog */}
          <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Add New Student</DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <TextField
                  autoFocus label="First Name" value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  fullWidth required
                />
                <TextField
                  label="Middle Name" value={studentForm.middleName}
                  onChange={(e) => setStudentForm({ ...studentForm, middleName: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Last Name" value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  fullWidth required
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Date of Birth" type="date" value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    select label="Gender" value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    fullWidth
                  >
                    {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </TextField>
                </Box>
                <TextField
                  label="Guardian Name" value={studentForm.guardianName}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Guardian Phone" value={studentForm.guardianPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Guardian Email" type="email" value={studentForm.guardianEmail}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianEmail: e.target.value })}
                  fullWidth
                />
                <TextField
                  select label="Academic Year" value={enrollForm.academicYear}
                  onChange={(e) => setEnrollForm({ ...enrollForm, academicYear: e.target.value })}
                  fullWidth required
                >
                  {activeAssignments.map((a) => (
                    <MenuItem key={a.academicYear?._id || a.academicYear} value={a.academicYear?._id || a.academicYear}>
                      {a.academicYear?.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
              <Button onClick={handleSubmitAdd} variant="contained" disabled={loading}
                sx={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', fontWeight: 700 }}>
                {loading ? 'Adding...' : 'Add Student'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Student Dialog */}
          <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Edit Student</DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <TextField
                  autoFocus label="First Name" value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  fullWidth required
                />
                <TextField
                  label="Middle Name" value={studentForm.middleName}
                  onChange={(e) => setStudentForm({ ...studentForm, middleName: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Last Name" value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  fullWidth required
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Date of Birth" type="date" value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    select label="Gender" value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    fullWidth
                  >
                    {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </TextField>
                </Box>
                <TextField
                  label="Guardian Name" value={studentForm.guardianName}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Guardian Phone" value={studentForm.guardianPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Guardian Email" type="email" value={studentForm.guardianEmail}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianEmail: e.target.value })}
                  fullWidth
                />
                <TextField
                  select label="Status" value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                  fullWidth
                >
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
              <Button onClick={handleSubmitEdit} variant="contained" disabled={loading}
                sx={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', fontWeight: 700 }}>
                {loading ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
            <DialogContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#fee2e2', color: '#dc2626', width: 48, height: 48 }}>
                <DeleteIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Delete Student</Typography>
              <Typography sx={{ color: '#64748b', mb: 3 }}>
                Are you sure you want to delete <strong>{deletingStudent?.firstName} {deletingStudent?.lastName}</strong>?
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
              <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading}
                sx={{ fontWeight: 700 }}>Delete</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
      {!selectedAssignment && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Select your class assignment to view and manage students.
        </Typography>
      )}
    </Box>
  );
};

export default MyStudentsPage;
