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
import SettingsIcon from '@mui/icons-material/Settings';

const items = [
  { label: 'Home', to: '/admin/dashboard', icon: HomeIcon },
  { type: 'subheader', label: 'Academic' },
  { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarMonthIcon },
  { label: 'Terms', to: '/admin/terms', icon: DateRangeIcon },
  { label: 'Classes', to: '/admin/classes', icon: ClassOutlinedIcon },
  { label: 'Students', to: '/admin/students', icon: PeopleAltIcon },
  { label: 'Enrollments', to: '/admin/enrollments', icon: AssignmentIndIcon },
  { label: 'Subjects', to: '/admin/subjects', icon: MenuBookIcon },
  { label: 'Teacher Assignments', to: '/admin/teacher-assignments', icon: AssignmentIcon },
  { label: 'Class Teachers', to: '/admin/class-teacher-assignments', icon: SupervisorAccountIcon },
  { label: 'Assessments', to: '/admin/assessments', icon: AssignmentIcon },
  { label: 'Results', to: '/admin/results', icon: TableChartIcon },
  { label: 'Report Cards', to: '/admin/reports', icon: ArticleIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Settings' },
  { label: 'School Header', to: '/admin/school-header', icon: SettingsIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile', to: '/admin/profile', icon: AccountCircleOutlinedIcon },
  { label: 'Logout', to: '/logout', icon: ExitToAppIcon },
];

const AdminSideBar = () => <Sidebar items={items} />;

export default AdminSideBar;