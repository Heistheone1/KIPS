import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reports: [],
  reportDetail: null,
  reportVersion: null,
  reportVersions: [],
  reportMeta: null,
  loading: false,
  error: null,
  success: null,
};

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    reportRequest: (state) => { state.loading = true; state.error = null; state.success = null; },
    reportSuccess: (state, action) => {
      state.loading = false;
      const { key, data } = action.payload;
      state[key] = data;
    },
    // Keeps loading true; used when fetching detail without clearing a list.
    reportFetch: (state) => { state.error = null; },
    reportMutateSuccess: (state, action) => {
      state.loading = false;
      state.success = action.payload;
    },
    reportFailed: (state, action) => { state.loading = false; state.error = action.payload; },
    reportReset: (state) => { state.error = null; state.success = null; },
  },
});

export const {
  reportRequest, reportSuccess, reportFetch, reportMutateSuccess, reportFailed, reportReset,
} = reportSlice.actions;

export const reportReducer = reportSlice.reducer;
