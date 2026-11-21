import axios from 'axios';
import {
  assessmentRequest, assessmentSuccess, assessmentMutateSuccess, assessmentFailed,
} from './assessmentSlice';

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
  // Prefer structured validation errors from the backend
  const serverErrors = err.response?.data?.errors;
  const message = serverErrors?.length
    ? serverErrors.join(' ')
    : (err.response?.data?.message || err.message || 'An error occurred');
  dispatch(assessmentFailed(message));
};

// ─── Assessments ─────────────────────────────────────────────────────────────

export const fetchAssessmentMeta = () => async (dispatch) => {
  try {
    const res = await api.get('/api/assessments/meta');
    dispatch(assessmentSuccess({ key: 'assessmentMeta', data: res.data }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchAssessments = (params = '') => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const res = await api.get(`/api/assessments${params}`);
    dispatch(assessmentSuccess({ key: 'assessments', data: res.data.assessments }));
  } catch (err) { handleError(dispatch, err); }
};

export const getAssessment = (id) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const res = await api.get(`/api/assessments/${id}`);
    dispatch(assessmentSuccess({ key: 'currentAssessment', data: res.data.assessment }));
  } catch (err) { handleError(dispatch, err); }
};

export const createAssessment = (body) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const client = await apiWithCsrf();
    await client.post('/api/assessments', body);
    dispatch(assessmentMutateSuccess('Assessment created'));
  } catch (err) { handleError(dispatch, err); }
};

export const updateAssessment = (id, body) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const client = await apiWithCsrf();
    await client.put(`/api/assessments/${id}`, body);
    dispatch(assessmentMutateSuccess('Assessment updated'));
  } catch (err) { handleError(dispatch, err); }
};

// ─── Marks ───────────────────────────────────────────────────────────────────

export const fetchMarks = (params = '') => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const res = await api.get(`/api/assessment-marks${params}`);
    dispatch(assessmentSuccess({ key: 'marks', data: res.data.marks }));
  } catch (err) { handleError(dispatch, err); }
};

/**
 * Record or update a single mark.
 * `score` may be 0 (real zero) or null with entered=false (missing).
 * Dispatches onComplete(markResult) on success for local flow control.
 */
export const recordMark = (body, onComplete) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/assessment-marks', body);
    dispatch(assessmentMutateSuccess(
      res.data.corrected ? 'Mark corrected — history recorded' : 'Mark saved',
    ));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const bulkRecordMarks = (body, onComplete) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/assessment-marks/bulk', body);
    const { results, errors } = res.data;
    if (errors.length > 0) {
      dispatch(assessmentMutateSuccess(
        `${results.length} saved, ${errors.length} failed: ${errors[0].error}`,
      ));
    } else {
      dispatch(assessmentMutateSuccess(`${results.length} marks saved`));
    }
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

// ─── History ─────────────────────────────────────────────────────────────────

export const fetchMarkHistory = (markId) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const res = await api.get(`/api/assessment-marks/${markId}/history`);
    dispatch(assessmentSuccess({ key: 'markHistory', data: res.data.history }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchCorrections = (assessmentId) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const res = await api.get(`/api/mark-corrections/assessment/${assessmentId}`);
    dispatch(assessmentSuccess({ key: 'corrections', data: res.data.corrections }));
  } catch (err) { handleError(dispatch, err); }
};

// ─── Enrollments (for mark-entry student lists) ──────────────────────────────

export const fetchEnrollmentsForMarking = (params) => async (dispatch) => {
  dispatch(assessmentRequest());
  try {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
    ).toString();
    const res = await api.get(`/api/enrollments?${query}`);
    dispatch(assessmentSuccess({ key: 'enrollments', data: res.data.enrollments }));
  } catch (err) { handleError(dispatch, err); }
};
