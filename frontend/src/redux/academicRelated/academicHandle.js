import axios from 'axios';
import { academicRequest, academicSuccess, academicMutateSuccess, academicFailed } from './academicSlice';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

const apiWithCsrf = async () => {
  const res = await api.get('/api/auth/csrf-token');
  return axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': res.data.csrfToken },
  });
};

const handleError = (dispatch, err) => {
  dispatch(academicFailed(err.response?.data?.message || err.message || 'An error occurred'));
};

// ─── Generic CRUD factories ───────────────────────────────────────────────────

export const fetchList = (endpoint, key) => () => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(endpoint);
    dispatch(academicSuccess({ key, data: res.data[key] || res.data[Object.keys(res.data)[0]] }));
  } catch (err) { handleError(dispatch, err); }
};

export const createRecord = (endpoint, key, successMsg) => (body) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const client = await apiWithCsrf();
    await client.post(endpoint, body);
    dispatch(academicMutateSuccess(successMsg));
    dispatch(fetchList(endpoint, key)());
  } catch (err) { handleError(dispatch, err); }
};

export const updateRecord = (endpoint, key, successMsg) => (id, body) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const client = await apiWithCsrf();
    await client.put(`${endpoint}/${id}`, body);
    dispatch(academicMutateSuccess(successMsg));
    dispatch(fetchList(endpoint, key)());
  } catch (err) { handleError(dispatch, err); }
};

// ─── Academic Years ───────────────────────────────────────────────────────────
export const fetchAcademicYears = fetchList('/api/academic-years', 'academicYears');
export const createAcademicYear = createRecord('/api/academic-years', 'academicYears', 'Academic year created');
export const updateAcademicYear = updateRecord('/api/academic-years', 'academicYears', 'Academic year updated');

// ─── Terms ────────────────────────────────────────────────────────────────────
export const fetchTerms = (params = '') => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/terms${params}`);
    dispatch(academicSuccess({ key: 'terms', data: res.data.terms }));
  } catch (err) { handleError(dispatch, err); }
};
export const createTerm = createRecord('/api/terms', 'terms', 'Term created');
export const updateTerm = updateRecord('/api/terms', 'terms', 'Term updated');

// ─── Classes ──────────────────────────────────────────────────────────────────
export const fetchClasses = (params = '') => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/classes${params}`);
    dispatch(academicSuccess({ key: 'classes', data: res.data.classes }));
  } catch (err) { handleError(dispatch, err); }
};
export const createClass = createRecord('/api/classes', 'classes', 'Class created');
export const updateClass = updateRecord('/api/classes', 'classes', 'Class updated');
export const deleteClass = (id) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const client = await apiWithCsrf();
    await client.delete(`/api/classes/${id}`);
    dispatch(academicMutateSuccess('Class deleted'));
    dispatch(fetchClasses());
  } catch (err) { handleError(dispatch, err); }
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const fetchStudents = fetchList('/api/students', 'students');
export const createStudent = createRecord('/api/students', 'students', 'Student created');
export const updateStudent = updateRecord('/api/students', 'students', 'Student updated');

/** Create student then immediately enroll them in a class */
export const createStudentWithEnrollment = (studentData, enrollmentData) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const csrfRes = await api.get('/api/auth/csrf-token');
    const client = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfRes.data.csrfToken },
    });
    const studentRes = await client.post('/api/students', studentData);
    const studentId = studentRes.data.student._id;
    await client.post('/api/enrollments', { ...enrollmentData, student: studentId });
    dispatch(academicMutateSuccess('Student registered and enrolled successfully'));
    dispatch(fetchStudents());
    dispatch(fetchEnrollments());
  } catch (err) { handleError(dispatch, err); }
};

// ─── Enrollments ──────────────────────────────────────────────────────────────
export const fetchEnrollments = (params = '') => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/enrollments${params}`);
    dispatch(academicSuccess({ key: 'enrollments', data: res.data.enrollments }));
  } catch (err) { handleError(dispatch, err); }
};
export const createEnrollment = createRecord('/api/enrollments', 'enrollments', 'Enrollment created');
export const updateEnrollment = updateRecord('/api/enrollments', 'enrollments', 'Enrollment updated');

export const fetchEnrollmentsByClass = (classId) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/enrollments?class=${classId}`);
    dispatch(academicSuccess({ key: 'enrollments', data: res.data.enrollments }));
  } catch (err) { handleError(dispatch, err); }
};

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const fetchSubjects = fetchList('/api/subjects', 'subjects');
export const createSubject = createRecord('/api/subjects', 'subjects', 'Subject created');
export const updateSubject = updateRecord('/api/subjects', 'subjects', 'Subject updated');

// ─── Teacher Assignments ──────────────────────────────────────────────────────
export const fetchTeacherAssignments = (params = '') => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/teacher-assignments${params}`);
    dispatch(academicSuccess({ key: 'teacherAssignments', data: res.data.assignments }));
  } catch (err) { handleError(dispatch, err); }
};
export const createTeacherAssignment = createRecord('/api/teacher-assignments', 'teacherAssignments', 'Assignment created');
export const updateTeacherAssignment = updateRecord('/api/teacher-assignments', 'teacherAssignments', 'Assignment updated');
export const deleteTeacherAssignment = (id) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const client = await apiWithCsrf();
    await client.delete(`/api/teacher-assignments/${id}`);
    dispatch(academicMutateSuccess('Assignment deleted'));
    dispatch(fetchTeacherAssignments());
  } catch (err) { handleError(dispatch, err); }
};

// ─── Class Teacher Assignments ────────────────────────────────────────────────
export const fetchClassTeacherAssignments = (params = '') => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const res = await api.get(`/api/class-teacher-assignments${params}`);
    dispatch(academicSuccess({ key: 'classTeacherAssignments', data: res.data.assignments }));
  } catch (err) { handleError(dispatch, err); }
};
export const createClassTeacherAssignment = createRecord('/api/class-teacher-assignments', 'classTeacherAssignments', 'Class teacher assigned');
export const updateClassTeacherAssignment = updateRecord('/api/class-teacher-assignments', 'classTeacherAssignments', 'Assignment updated');
export const deleteStudent = (id) => async (dispatch) => {
  dispatch(academicRequest());
  try {
    const client = await apiWithCsrf();
    await client.delete(`/api/students/${id}`);
    dispatch(academicMutateSuccess('Student deleted'));
    dispatch(fetchStudents());
  } catch (err) { handleError(dispatch, err); }
};
