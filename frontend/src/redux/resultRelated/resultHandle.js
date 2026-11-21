import axios from 'axios';
import { resultRequest, resultSuccess, resultMutateSuccess, resultFailed } from './resultSlice';

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
  const serverErrors = err.response?.data?.errors;
  const message = serverErrors?.length
    ? serverErrors.join(' ')
    : (err.response?.data?.message || err.message || 'An error occurred');
  dispatch(resultFailed(message));
};

// ─── Reads ─────────────────────────────────────────────────────────────────

export const fetchResultMeta = () => async (dispatch) => {
  try {
    const res = await api.get('/api/results/meta');
    dispatch(resultSuccess({ key: 'resultMeta', data: res.data }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchSubjectResults = (params = '') => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const res = await api.get(`/api/results/subject${params}`);
    dispatch(resultSuccess({ key: 'subjectResults', data: res.data.results }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchTermResults = (params = '') => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const res = await api.get(`/api/results/term${params}`);
    dispatch(resultSuccess({ key: 'termResults', data: res.data.results }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchResultStatus = (params = '') => async (dispatch) => {
  try {
    const res = await api.get(`/api/results/status${params}`);
    dispatch(resultSuccess({ key: 'resultStatus', data: res.data }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchSnapshots = (params = '') => async (dispatch) => {
  try {
    const res = await api.get(`/api/results/snapshots${params}`);
    dispatch(resultSuccess({ key: 'snapshots', data: res.data.snapshots }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchGradingScale = (params = '') => async (dispatch) => {
  try {
    const res = await api.get(`/api/results/grading-scale${params}`);
    dispatch(resultSuccess({ key: 'gradingScale', data: res.data.scale }));
  } catch (err) { handleError(dispatch, err); }
};

// ─── Authoritative generation (ADMIN/DOS) ──────────────────────────────────

const generationMessage = (out) => {
  if (out.success) return `${out.resultType} results generated for ${out.summary?.students ?? 0} students`;
  return `Generated with ${out.failures?.length || 0} failure(s) — inspect results`;
};

export const generateSubjectResults = (body, onComplete) => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/results/subject/generate', body);
    dispatch(resultMutateSuccess(generationMessage(res.data)));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const generateTermResults = (body, onComplete) => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/results/term/generate', body);
    dispatch(resultMutateSuccess(generationMessage(res.data)));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const recalculateScope = (body, onComplete) => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/results/recalculate', body);
    dispatch(resultMutateSuccess('Scope recalculated'));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const saveGradingScale = (body, onComplete) => async (dispatch) => {
  dispatch(resultRequest());
  try {
    const client = await apiWithCsrf();
    await client.post('/api/results/grading-scale', body);
    dispatch(resultMutateSuccess('Grading scale saved — results flagged stale'));
    if (onComplete) onComplete();
  } catch (err) { handleError(dispatch, err); }
};
