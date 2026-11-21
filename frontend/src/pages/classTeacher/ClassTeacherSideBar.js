import React from 'react';
import Sidebar from '../../components/Sidebar';
import HomeIcon from '@mui/icons-material/Home';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const items = [
  { label: 'Home', to: '/class-teacher/dashboard', icon: HomeIcon },
  { type: 'subheader', label: 'My Class' },
  { label: 'My Class', to: '/class-teacher/my-class', icon: PeopleAltIcon },
  { label: 'My Students', to: '/class-teacher/my-students', icon: PeopleAltIcon },
  { label: 'Assessments', to: '/class-teacher/assessments', icon: AssignmentIcon },
  { label: 'Mark Entry', to: '/class-teacher/mark-entry', icon: AssignmentIcon },
  { label: 'Results', to: '/class-teacher/results', icon: TableChartIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile', to: '/class-teacher/profile', icon: AccountCircleOutlinedIcon },
  { label: 'Logout', to: '/logout', icon: ExitToAppIcon },
];

const ClassTeacherSideBar = () => <Sidebar items={items} />;
export default ClassTeacherSideBar;