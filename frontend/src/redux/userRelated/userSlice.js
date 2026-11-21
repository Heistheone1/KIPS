import { createSlice } from '@reduxjs/toolkit';

const VALID_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER', 'STUDENT'];

// Only non-credential user info is persisted in sessionStorage
// The authentication credential (JWT) lives exclusively in the HttpOnly cookie
// managed by the browser — it is never accessible to JavaScript
const storedUser = (() => {
  try { return JSON.parse(sessionStorage.getItem('kips_user')) || null; } catch { return null; }
})();

const initialState = {
  status: 'idle',
  currentUser: storedUser,
  currentRole: storedUser?.role || null,
  loading: false,
  error: null,
  response: null,
  users: [],
  userSaveSuccess: false,
  profileUpdated: false,
  passwordChanged: false,
  profileError: null,
  passwordError: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    authRequest: (state) => {
      state.status = 'loading';
      state.error = null;
      state.response = null;
    },

    authSuccess: (state, action) => {
      const { user } = action.payload;
      if (!VALID_ROLES.includes(user.role)) {
        state.status = 'failed';
        state.response = 'Invalid role received from server';
        return;
      }
      state.status = 'success';
      state.currentUser = user;
      state.currentRole = user.role;
      state.error = null;
      state.response = null;
      // Store only safe user info — NOT the authentication credential
      sessionStorage.setItem('kips_user', JSON.stringify(user));
    },

    authFailed: (state, action) => {
      state.status = 'failed';
      state.response = action.payload;
      state.loading = false;
    },

    authError: (state, action) => {
      state.status = 'error';
      state.error = action.payload;
      state.loading = false;
    },

    authLogout: (state) => {
      state.currentUser = null;
      state.currentRole = null;
      state.status = 'idle';
      state.error = null;
      state.response = null;
      // Clear user info from sessionStorage
      // The HttpOnly cookie is cleared by the server on POST /api/auth/logout
      sessionStorage.removeItem('kips_user');
    },

    getRequest: (state) => {
      state.loading = true;
      state.error = null;
    },

    doneSuccess: (state, action) => {
      state.userDetails = action.payload;
      state.loading = false;
      state.error = null;
      state.response = null;
    },

    stuffAdded: (state, action) => {
      state.loading = false;
      state.error = null;
      state.response = null;
      state.status = 'added';
    },

    getFailed: (state, action) => {
      state.response = action.payload;
      state.loading = false;
    },

    getError: (state, action) => {
      state.loading = false;
      const payload = action.payload;
      if (typeof payload === 'string') {
        state.error = payload;
      } else {
        state.error = payload?.message || payload?.errors?.join(', ') || 'An error occurred';
      }
    },

    underControl: (state) => {
      state.status = 'idle';
      state.response = null;
    },
    usersLoaded: (state, action) => {
      state.users = action.payload;
      state.loading = false;
      state.error = null;
    },
    userSaved: (state, action) => {
      const saved = action.payload;
      const idx = state.users.findIndex((u) => u._id === saved._id);
      if (idx >= 0) state.users[idx] = saved;
      else state.users.unshift(saved);
      state.loading = false;
      state.error = null;
      state.userSaveSuccess = true;
    },
    resetUserSave: (state) => {
      state.userSaveSuccess = false;
      state.error = null;
    },
    profileUpdated: (state, action) => {
      const saved = action.payload;
      state.currentUser = saved;
      state.currentRole = saved.role || state.currentRole;
      state.loading = false;
      state.error = null;
      state.profileUpdated = true;
      state.profileError = null;
      // Keep sessionStorage in sync
      try { sessionStorage.setItem('kips_user', JSON.stringify(saved)); } catch (_) {}
    },
    profileError: (state, action) => {
      state.loading = false;
      state.profileError = action.payload;
      state.profileUpdated = false;
    },
    passwordChanged: (state) => {
      state.loading = false;
      state.error = null;
      state.passwordChanged = true;
      state.passwordError = null;
    },
    passwordError: (state, action) => {
      state.loading = false;
      state.passwordError = action.payload;
      state.passwordChanged = false;
    },
    resetProfileStatus: (state) => {
      state.profileUpdated = false;
      state.profileError = null;
      state.passwordChanged = false;
      state.passwordError = null;
    },
  },
});

export const {
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
  underControl,
  usersLoaded,
  userSaved,
  resetUserSave,
  profileUpdated,
  profileError,
  passwordChanged,
  passwordError,
  resetProfileStatus,
} = userSlice.actions;

export const userReducer = userSlice.reducer;
