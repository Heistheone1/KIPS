import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import AdminHomePage from './AdminHomePage';
import AdminProfile from './AdminProfile';
import AcademicYearsPage from './academicRelated/AcademicYearsPage';
import TermsPage from './academicRelated/TermsPage';
import ClassesPage from './academicRelated/ClassesPage';
import StudentsPage from './academicRelated/StudentsPage';
import EnrollmentsPage from './academicRelated/EnrollmentsPage';
import SubjectsPage from './academicRelated/SubjectsPage';
import TeacherAssignmentsPage from './academicRelated/TeacherAssignmentsPage';
import ClassTeacherAssignmentsPage from './academicRelated/ClassTeacherAssignmentsPage';
import AssessmentsPage from './assessmentRelated/AssessmentsPage';
import MarkEntryPage from './assessmentRelated/MarkEntryPage';
import ResultPage from './resultRelated/ResultPage';
import SubjectResultPage from './resultRelated/SubjectResultPage';
import ReportCardsPage from './reportRelated/ReportCardsPage';
import ReportCardDetailPage from './reportRelated/ReportCardDetailPage';
import SchoolHeaderSettingsPage from './SchoolHeaderSettingsPage';
import UsersPage from './UsersPage';
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
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

const sidebarItems = [
  { label: 'Dashboard',            to: '/admin/dashboard',                   icon: HomeIcon },
  { type: 'subheader', label: 'Academic' },
  { label: 'Academic Years',       to: '/admin/academic-years',              icon: CalendarMonthIcon },
  { label: 'Terms',                to: '/admin/terms',                       icon: DateRangeIcon },
  { label: 'Classes',              to: '/admin/classes',                     icon: ClassOutlinedIcon },
  { label: 'Students',             to: '/admin/students',                    icon: PeopleAltIcon },
  { label: 'Enrollments',          to: '/admin/enrollments',                 icon: AssignmentIndIcon },
  { label: 'Subjects',             to: '/admin/subjects',                    icon: MenuBookIcon },
  { label: 'Teacher Assignments',  to: '/admin/teacher-assignments',         icon: AssignmentIcon },
  { label: 'Class Teachers',       to: '/admin/class-teacher-assignments',   icon: SupervisorAccountIcon },
  { type: 'subheader', label: 'Assessment' },
  { label: 'Assessments',          to: '/admin/assessments',                 icon: AssignmentIcon },
  { label: 'Results',              to: '/admin/results',                     icon: TableChartIcon },
  { label: 'Report Cards',         to: '/admin/reports',                     icon: ArticleIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Settings' },
  { label: 'Users',         to: '/admin/users',         icon: ManageAccountsIcon },
  { label: 'School Header', to: '/admin/school-header', icon: SettingsIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile',              to: '/admin/profile',                     icon: AccountCircleOutlinedIcon },
  { label: 'Logout',               to: '/logout',                            icon: ExitToAppIcon },
];

const AdminDashboard = () => (
  <DashboardShell sidebarItems={sidebarItems}>
    <Routes>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard"                   element={<AdminHomePage />} />
      <Route path="profile"                     element={<AdminProfile />} />
      <Route path="academic-years"              element={<AcademicYearsPage />} />
      <Route path="terms"                       element={<TermsPage />} />
      <Route path="classes"                     element={<ClassesPage />} />
      <Route path="students"                    element={<StudentsPage />} />
      <Route path="enrollments"                 element={<EnrollmentsPage />} />
      <Route path="subjects"                    element={<SubjectsPage />} />
      <Route path="teacher-assignments"         element={<TeacherAssignmentsPage />} />
      <Route path="class-teacher-assignments"   element={<ClassTeacherAssignmentsPage />} />
      <Route path="assessments"                 element={<AssessmentsPage />} />
      <Route path="mark-entry/:id"              element={<MarkEntryPage />} />
      <Route path="results"                     element={<ResultPage />} />
      <Route path="results/subjects"            element={<SubjectResultPage />} />
      <Route path="reports"                     element={<ReportCardsPage />} />
      <Route path="reports/:id"                 element={<ReportCardDetailPage />} />
      <Route path="school-header" element={<SchoolHeaderSettingsPage />} />
      <Route path="users"         element={<UsersPage />} />
      <Route path="*"                           element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  </DashboardShell>
);

export default AdminDashboard;
