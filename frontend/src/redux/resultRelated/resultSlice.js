import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  subjectResults: [],
  termResults: [],
  resultMeta: null,
  resultStatus: null,
  snapshots: [],
  gradingScale: null,
  loading: false,
  error: null,
  success: null,
};

const resultSlice = createSlice({
  name: 'result',
  initialState,
  reducers: {
    resultRequest: (state) => { state.loading = true; state.error = null; state.success = null; },
    resultSuccess: (state, action) => {
      state.loading = false;
      const { key, data } = action.payload;
      state[key] = data;
    },
    resultMutateSuccess: (state, action) => {
      state.loading = false;
      state.success = action.payload;
    },
    resultFailed: (state, action) => { state.loading = false; state.error = action.payload; },
    resultReset: (state) => { state.error = null; state.success = null; },
  },
});

export const {
  resultRequest, resultSuccess, resultMutateSuccess, resultFailed, resultReset,
} = resultSlice.actions;

export const resultReducer = resultSlice.reducer;
