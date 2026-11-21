import React from 'react';
import Sidebar from '../../components/Sidebar';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const items = [
  { label: 'Dashboard', to: '/student/dashboard', icon: HomeIcon },
  { type: 'subheader', label: 'Academics' },
  { label: 'My Subjects', to: '/student/subjects', icon: AssignmentIcon },
  { label: 'Attendance', to: '/student/attendance', icon: ClassOutlinedIcon },
  { label: 'Complain', to: '/student/complain', icon: AnnouncementOutlinedIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile', to: '/student/profile', icon: AccountCircleOutlinedIcon },
  { label: 'Logout', to: '/logout', icon: ExitToAppIcon },
];

const StudentSideBar = () => <Sidebar items={items} />;
export default StudentSideBar;
