import axios from 'axios';
import {
  reportRequest, reportSuccess, reportFetch, reportMutateSuccess, reportFailed,
} from './reportSlice';

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
  dispatch(reportFailed(message));
};

// ─── Reads ─────────────────────────────────────────────────────────────────

export const fetchReports = (params = '') => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const res = await api.get(`/api/reports${params}`);
    dispatch(reportSuccess({ key: 'reports', data: res.data.reports }));
  } catch (err) { handleError(dispatch, err); }
};

// Full card + authoritative current version (what the report screen & PDF render).
export const fetchReportDetail = (id) => async (dispatch) => {
  dispatch(reportFetch());
  try {
    const res = await api.get(`/api/reports/${id}`);
    dispatch(reportSuccess({ key: 'reportDetail', data: { card: res.data.report, version: res.data.version } }));
  } catch (err) { handleError(dispatch, err); }
};

// A specific historical version — exactly what was approved/published then.
export const fetchReportVersion = (id, versionNumber) => async (dispatch) => {
  dispatch(reportFetch());
  try {
    const res = await api.get(`/api/reports/${id}/versions/${versionNumber}`);
    dispatch(reportSuccess({ key: 'reportVersion', data: { card: res.data.report, version: res.data.version } }));
  } catch (err) { handleError(dispatch, err); }
};

export const fetchReportVersions = (id) => async (dispatch) => {
  try {
    const res = await api.get(`/api/reports/${id}/versions`);
    dispatch(reportSuccess({ key: 'reportVersions', data: res.data.versions }));
  } catch (err) { handleError(dispatch, err); }
};

// ─── Generation (ADMIN/DOS) ────────────────────────────────────────────────

export const generateReports = (body, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/reports/generate', body);
    const d = res.data;
    const msg = d.success
      ? `Reports generated (${d.resultType}) for ${d.summary?.succeeded ?? 0} student(s)`
      : `Generated with ${d.failures?.length || 0} failure(s) — inspect results`;
    dispatch(reportMutateSuccess(msg));
    if (onComplete) onComplete(d);
  } catch (err) { handleError(dispatch, err); }
};

// ─── Lifecycle: GENERATED → REVIEWED → APPROVED → PUBLISHED ────────────────

export const reviewReport = (id, note, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post(`/api/reports/${id}/review`, { note: note || undefined });
    dispatch(reportMutateSuccess(res.data.message || 'Report reviewed'));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const approveReport = (id, note, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post(`/api/reports/${id}/approve`, { note: note || undefined });
    dispatch(reportMutateSuccess(res.data.message || 'Report approved'));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const publishReport = (id, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post(`/api/reports/${id}/publish`);
    dispatch(reportMutateSuccess(res.data.message || 'Report published'));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

export const invalidateReport = (id, reason, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post(`/api/reports/${id}/invalidate`, { reason: reason || undefined });
    dispatch(reportMutateSuccess(res.data.message || 'Report invalidated'));
    if (onComplete) onComplete(res.data);
  } catch (err) { handleError(dispatch, err); }
};

// ─── Period/CAT Generation (ADMIN/DOS) ───────────────────────────────────────

export const generatePeriodReports = (body, onComplete) => async (dispatch) => {
  dispatch(reportRequest());
  try {
    const client = await apiWithCsrf();
    const res = await client.post('/api/reports/generate-period', body);
    const d = res.data;
    const msg = d.success
      ? `Period reports generated (${d.periodType}) for ${d.summary?.succeeded ?? 0} student(s)`
      : `Generated with ${d.failures?.length || 0} failure(s) — inspect results`;
    dispatch(reportMutateSuccess(msg));
    if (onComplete) onComplete(d);
  } catch (err) { handleError(dispatch, err); }
};
