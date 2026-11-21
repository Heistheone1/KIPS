import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  assessments: [],
  assessmentMeta: null,
  currentAssessment: null,
  marks: [],
  markHistory: [],
  corrections: [],
  enrollments: [],
  loading: false,
  error: null,
  success: null,
};

const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    assessmentRequest: (state) => { state.loading = true; state.error = null; state.success = null; },
    assessmentSuccess: (state, action) => {
      state.loading = false;
      const { key, data } = action.payload;
      state[key] = data;
    },
    assessmentMutateSuccess: (state, action) => {
      state.loading = false;
      state.success = action.payload;
    },
    assessmentFailed: (state, action) => { state.loading = false; state.error = action.payload; },
    assessmentReset: (state) => { state.error = null; state.success = null; },
    assessmentClear: (state) => {
      state.error = null;
      state.success = null;
      state.currentAssessment = null;
      state.marks = [];
      state.markHistory = [];
    },
  },
});

export const {
  assessmentRequest,
  assessmentSuccess,
  assessmentMutateSuccess,
  assessmentFailed,
  assessmentReset,
  assessmentClear,
} = assessmentSlice.actions;

export const assessmentReducer = assessmentSlice.reducer;
