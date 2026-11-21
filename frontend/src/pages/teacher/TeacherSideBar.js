import React from 'react';
import Sidebar from '../../components/Sidebar';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const items = [
  { label: 'Home', to: '/teacher/dashboard', icon: HomeIcon },
  { type: 'subheader', label: 'Teaching' },
  { label: 'Assessments', to: '/teacher/assessments', icon: AssignmentIcon },
  { label: 'Mark Entry', to: '/teacher/mark-entry', icon: AssignmentIcon },
  { label: 'Results', to: '/teacher/results', icon: TableChartIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile', to: '/teacher/profile', icon: AccountCircleOutlinedIcon },
  { label: 'Logout', to: '/logout', icon: ExitToAppIcon },
];

const TeacherSideBar = () => <Sidebar items={items} />;
export default TeacherSideBar;