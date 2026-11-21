import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import StudentHomePage from './StudentHomePage';
import StudentProfile from './StudentProfile';
import StudentSubjects from './StudentSubjects';
import ViewStdAttendance from './ViewStdAttendance';
import StudentComplain from './StudentComplain';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const sidebarItems = [
  { label: 'Dashboard',   to: '/student/dashboard',  icon: HomeIcon },
  { type: 'subheader', label: 'Academics' },
  { label: 'My Subjects', to: '/student/subjects',   icon: AssignmentIcon },
  { label: 'Attendance',  to: '/student/attendance', icon: ClassOutlinedIcon },
  { label: 'Complain',    to: '/student/complain',   icon: AnnouncementOutlinedIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile',     to: '/student/profile',    icon: AccountCircleOutlinedIcon },
  { label: 'Logout',      to: '/logout',             icon: ExitToAppIcon },
];

const StudentDashboard = () => (
  <DashboardShell sidebarItems={sidebarItems}>
    <Routes>
      <Route index element={<Navigate to="/student/dashboard" replace />} />
      <Route path="dashboard"  element={<StudentHomePage />} />
      <Route path="profile"    element={<StudentProfile />} />
      <Route path="subjects"   element={<StudentSubjects />} />
      <Route path="attendance" element={<ViewStdAttendance />} />
      <Route path="complain"   element={<StudentComplain />} />
      <Route path="*"          element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  </DashboardShell>
);

export default StudentDashboard;
