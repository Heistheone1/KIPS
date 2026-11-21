import React from 'react';
import Sidebar from '../../components/Sidebar';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PeopleIcon from '@mui/icons-material/People';

const items = [
  { label: 'Home', to: '/dos/dashboard', icon: HomeIcon },
  { type: 'subheader', label: 'Academic' },
  { label: 'Academic Years', to: '/dos/academic-years', icon: CalendarMonthIcon },
  { label: 'Terms', to: '/dos/terms', icon: DateRangeIcon },
  { label: 'Classes', to: '/dos/classes', icon: ClassOutlinedIcon },
  { label: 'Students', to: '/dos/students', icon: PeopleAltIcon },
  { label: 'Enrollments', to: '/dos/enrollments', icon: AssignmentIndIcon },
  { label: 'Subjects', to: '/dos/subjects', icon: MenuBookIcon },
  { label: 'Teacher Assignments', to: '/dos/teacher-assignments', icon: AssignmentIcon },
  { label: 'Teachers', to: '/dos/teachers', icon: PeopleIcon },
  { label: 'Class Teachers', to: '/dos/class-teacher-assignments', icon: SupervisorAccountIcon },
  { label: 'Assessments', to: '/dos/assessments', icon: AssignmentIcon },
  { label: 'Results', to: '/dos/results', icon: TableChartIcon },
  { label: 'Report Cards', to: '/dos/reports', icon: ArticleIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile', to: '/dos/profile', icon: AccountCircleOutlinedIcon },
  { label: 'Logout', to: '/logout', icon: ExitToAppIcon },
];

const DosSideBar = () => <Sidebar items={items} />;

export default DosSideBar;