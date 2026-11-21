import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    results: { students: [], teachers: [], classes: [], subjects: [] },
    query: '',
    loading: false,
    error: null,
};

const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        getRequest: (state) => {
            state.loading = true;
        },
        getSuccess: (state, action) => {
            state.results = action.payload.results;
            state.query = action.payload.query;
            state.loading = false;
            state.error = null;
        },
        getFailed: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        getError: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearSearch: (state) => {
            state.results = { students: [], teachers: [], classes: [], subjects: [] };
            state.query = '';
        },
    },
});

export const {
    getRequest,
    getSuccess,
    getFailed,
    getError,
    clearSearch,
} = searchSlice.actions;

export const searchReducer = searchSlice.reducer;
