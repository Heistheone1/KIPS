import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from './userRelated/userSlice';
import { studentReducer } from './studentRelated/studentSlice';
import { noticeReducer } from './noticeRelated/noticeSlice';
import { searchReducer } from './searchRelated/searchSlice';
import { sclassReducer } from './sclassRelated/sclassSlice';
import { teacherReducer } from './teacherRelated/teacherSlice';
import { academicReducer } from './academicRelated/academicSlice';
import { assessmentReducer } from './assessmentRelated/assessmentSlice';
import { resultReducer } from './resultRelated/resultSlice';
import { reportReducer } from './reportRelated/reportSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    student: studentReducer,
    teacher: teacherReducer,
    notice: noticeReducer,
    search: searchReducer,
    sclass: sclassReducer,
    academic: academicReducer,
    assessment: assessmentReducer,
    result: resultReducer,
    report: reportReducer,
  },
});

export default store;
