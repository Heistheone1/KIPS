import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  academicYears: [],
  terms: [],
  classes: [],
  students: [],
  enrollments: [],
  subjects: [],
  teacherAssignments: [],
  classTeacherAssignments: [],
  loading: false,
  error: null,
  success: null,
};

const academicSlice = createSlice({
  name: 'academic',
  initialState,
  reducers: {
    academicRequest: (state) => { state.loading = true; state.error = null; state.success = null; },
    academicSuccess: (state, action) => {
      state.loading = false;
      const { key, data } = action.payload;
      state[key] = data;
    },
    academicMutateSuccess: (state, action) => {
      state.loading = false;
      state.success = action.payload;
    },
    academicFailed: (state, action) => { state.loading = false; state.error = action.payload; },
    academicReset: (state) => { state.error = null; state.success = null; },
  },
});

export const { academicRequest, academicSuccess, academicMutateSuccess, academicFailed, academicReset } = academicSlice.actions;
export const academicReducer = academicSlice.reducer;
