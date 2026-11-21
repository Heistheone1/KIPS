import axios from 'axios';
import {
  authRequest,
  authSuccess,
  authFailed,
  authError,
  authLogout,
  getRequest,
  doneSuccess,
  stuffAdded,
  getFailed,
  getError,
  usersLoaded,
  userSaved,
  profileUpdated,
  passwordChanged,
  profileError,
  passwordError,
} from './userSlice';

const BASE_URL = process.env.REACT_APP_BASE_URL;

/**
 * Base axios instance.
 * withCredentials: true ensures the HttpOnly auth cookie is sent automatically
 * on every request. The JWT is never read or stored by JavaScript.
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch a CSRF token from the server.
 * The server sets the CSRF secret in a signed HttpOnly cookie.
 * We receive the token value to include in the X-CSRF-Token header.
 */
const fetchCsrfToken = async () => {
  const res = await api.get('/api/auth/csrf-token');
  return res.data.csrfToken;
};

/**
 * Build an axios instance with the CSRF token header attached.
 * Used for all state-changing requests (POST, PUT, PATCH, DELETE).
 */
const apiWithCsrf = async () => {
  const csrfToken = await fetchCsrfToken();
  return axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });
};

export const loginUser = (fields) => async (dispatch) => {
  dispatch(authRequest());
  try {
    // Login does not require a prior CSRF token (it is exempt)
    const result = await api.post('/api/auth/login', fields);
    const { user } = result.data;
    if (user) {
      // No token in payload — JWT is in the HttpOnly cookie set by the server
      dispatch(authSuccess({ user }));
    } else {
      dispatch(authFailed(result.data.message || 'Login failed'));
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Network error';
    dispatch(authError(message));
  }
};

export const logoutUser = () => async (dispatch) => {
  try {
    const client = await apiWithCsrf();
    await client.post('/api/auth/logout');
  } catch {
    // Even if the server call fails, clear local state
  } finally {
    dispatch(authLogout());
  }
};

export const getAuthenticatedUser = () => async (dispatch) => {
  dispatch(getRequest());
  try {
    const result = await api.get('/api/auth/me');
    dispatch(doneSuccess(result.data.user));
  } catch (error) {
    dispatch(getError(error.response?.data || error));
  }
};

export const getUserDetails = (id, type) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const result = await api.get(`/api/${type}/${id}`);
    dispatch(doneSuccess(result.data));
  } catch (error) {
    dispatch(getError(error.response?.data || error));
  }
};

export const addStuff = (fields, routeName) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.post(`/api/${routeName}Create`, fields);
    if (result.data.message) {
      dispatch(getFailed(result.data.message));
    } else {
      dispatch(stuffAdded());
    }
  } catch (error) {
    dispatch(getError(error.response?.data || error));
  }
};

export const updateUser = (fields, userId) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.put(`/api/users/${userId}`, fields);
    if (result.data.user) {
      dispatch(doneSuccess(result.data.user));
    } else {
      dispatch(getFailed(result.data.message));
    }
  } catch (error) {
    dispatch(getError(error.response?.data || error));
  }
};

export const fetchUsers = () => async (dispatch) => {
  dispatch(getRequest());
  try {
    const result = await api.get('/api/users');
    dispatch(usersLoaded(result.data.users));
  } catch (error) {
    dispatch(getError(error.response?.data || error));
  }
};

export const createUser = (fields) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.post('/api/users', fields);
    if (result.data.user) {
      dispatch(userSaved(result.data.user));
    } else {
      dispatch(getFailed(result.data.message));
    }
  } catch (error) {
    const data = error.response?.data;
    const message = data?.errors?.join(', ') || data?.message || error.message || 'Failed to create user';
    dispatch(getError(message));
  }
};

export const updateUserById = (userId, fields) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.put(`/api/users/${userId}`, fields);
    if (result.data.user) {
      dispatch(userSaved(result.data.user));
    } else {
      dispatch(getFailed(result.data.message));
    }
  } catch (error) {
    dispatch(getError(error.response?.data?.message || 'Failed to update user'));
  }
};

export const updateProfile = (fields) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.put('/api/users/me/profile', fields);
    if (result.data.user) {
      dispatch(profileUpdated(result.data.user));
    } else {
      dispatch(profileError(result.data.message || 'Failed to update profile'));
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update profile';
    dispatch(profileError(message));
  }
};

export const changePassword = (fields) => async (dispatch) => {
  dispatch(getRequest());
  try {
    const client = await apiWithCsrf();
    const result = await client.put('/api/users/me/password', fields);
    if (result.data.message) {
      dispatch(passwordChanged());
    } else {
      dispatch(passwordError(result.data.message || 'Failed to change password'));
    }
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to change password';
    dispatch(passwordError(message));
  }
};
