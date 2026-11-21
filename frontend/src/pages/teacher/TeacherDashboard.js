import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import TeacherHomePage from './TeacherHomePage';
import TeacherProfile from './TeacherProfile';
import AssessmentsPage from '../admin/assessmentRelated/AssessmentsPage';
import MarkEntryPage from '../admin/assessmentRelated/MarkEntryPage';
import ResultPage from '../admin/resultRelated/ResultPage';
import SubjectResultPage from '../admin/resultRelated/SubjectResultPage';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EditNoteIcon from '@mui/icons-material/EditNote';

const sidebarItems = [
  { label: 'Dashboard',    to: '/teacher/dashboard',   icon: HomeIcon },
  { type: 'subheader', label: 'Teaching' },
  { label: 'Assessments',  to: '/teacher/assessments', icon: AssignmentIcon },
  { label: 'Mark Entry',   to: '/teacher/mark-entry',  icon: EditNoteIcon },
  { label: 'Results',      to: '/teacher/results',     icon: TableChartIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile',      to: '/teacher/profile',     icon: AccountCircleOutlinedIcon },
  { label: 'Logout',       to: '/logout',              icon: ExitToAppIcon },
];

const TeacherDashboard = () => (
  <DashboardShell sidebarItems={sidebarItems}>
    <Routes>
      <Route index element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="dashboard"        element={<TeacherHomePage />} />
      <Route path="profile"          element={<TeacherProfile />} />
      <Route path="assessments"      element={<AssessmentsPage />} />
      <Route path="mark-entry/:id"   element={<MarkEntryPage />} />
      <Route path="results"          element={<ResultPage />} />
      <Route path="results/subjects" element={<SubjectResultPage />} />
      <Route path="*"                element={<Navigate to="/teacher/dashboard" replace />} />
    </Routes>
  </DashboardShell>
);

export default TeacherDashboard;
