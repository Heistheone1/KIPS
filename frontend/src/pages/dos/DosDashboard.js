import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import DosHomePage from './DosHomePage';
import AcademicYearsPage from '../admin/academicRelated/AcademicYearsPage';
import TermsPage from '../admin/academicRelated/TermsPage';
import ClassesPage from '../admin/academicRelated/ClassesPage';
import StudentsPage from '../admin/academicRelated/StudentsPage';
import EnrollmentsPage from '../admin/academicRelated/EnrollmentsPage';
import SubjectsPage from '../admin/academicRelated/SubjectsPage';
import TeacherAssignmentsPage from '../admin/academicRelated/TeacherAssignmentsPage';
import ClassTeacherAssignmentsPage from '../admin/academicRelated/ClassTeacherAssignmentsPage';
import AssessmentsPage from '../admin/assessmentRelated/AssessmentsPage';
import MarkEntryPage from '../admin/assessmentRelated/MarkEntryPage';
import ResultPage from '../admin/resultRelated/ResultPage';
import SubjectResultPage from '../admin/resultRelated/SubjectResultPage';
import ReportCardsPage from '../admin/reportRelated/ReportCardsPage';
import ReportCardDetailPage from '../admin/reportRelated/ReportCardDetailPage';
import AdminProfile from '../admin/AdminProfile';
import TeachersPage from './TeachersPage';
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
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PeopleIcon from '@mui/icons-material/People';

const sidebarItems = [
  { label: 'Dashboard',            to: '/dos/dashboard',                   icon: HomeIcon },
  { type: 'subheader', label: 'Academic' },
  { label: 'Academic Years',       to: '/dos/academic-years',              icon: CalendarMonthIcon },
  { label: 'Terms',                to: '/dos/terms',                       icon: DateRangeIcon },
  { label: 'Classes',              to: '/dos/classes',                     icon: ClassOutlinedIcon },
  { label: 'Students',             to: '/dos/students',                    icon: PeopleAltIcon },
  { label: 'Enrollments',          to: '/dos/enrollments',                 icon: AssignmentIndIcon },
  { label: 'Subjects',             to: '/dos/subjects',                    icon: MenuBookIcon },
  { label: 'Teacher Assignments',  to: '/dos/teacher-assignments',         icon: AssignmentIcon },
  { label: 'Teachers',             to: '/dos/teachers',                    icon: PeopleIcon },
  { label: 'Class Teachers',       to: '/dos/class-teacher-assignments',   icon: SupervisorAccountIcon },
  { type: 'subheader', label: 'Assessment' },
  { label: 'Assessments',          to: '/dos/assessments',                 icon: AssignmentIcon },
  { label: 'Results',              to: '/dos/results',                     icon: TableChartIcon },
  { label: 'Report Cards',         to: '/dos/reports',                     icon: ArticleIcon },
  { type: 'divider' },
  { type: 'subheader', label: 'Account' },
  { label: 'Profile',              to: '/dos/profile',                     icon: AccountCircleOutlinedIcon },
  { label: 'Logout',               to: '/logout',                          icon: ExitToAppIcon },
];

const DosDashboard = () => (
  <DashboardShell sidebarItems={sidebarItems}>
    <Routes>
      <Route index element={<Navigate to="/dos/dashboard" replace />} />
      <Route path="dashboard"                   element={<DosHomePage />} />
      <Route path="profile"                     element={<AdminProfile />} />
      <Route path="academic-years"              element={<AcademicYearsPage />} />
      <Route path="terms"                       element={<TermsPage />} />
      <Route path="classes"                     element={<ClassesPage />} />
      <Route path="students"                    element={<StudentsPage />} />
      <Route path="enrollments"                 element={<EnrollmentsPage />} />
      <Route path="subjects"                    element={<SubjectsPage />} />
      <Route path="teacher-assignments"         element={<TeacherAssignmentsPage />} />
      <Route path="teachers"                    element={<TeachersPage />} />
      <Route path="class-teacher-assignments"   element={<ClassTeacherAssignmentsPage />} />
      <Route path="assessments"                 element={<AssessmentsPage />} />
      <Route path="mark-entry/:id"              element={<MarkEntryPage />} />
      <Route path="results"                     element={<ResultPage />} />
      <Route path="results/subjects"            element={<SubjectResultPage />} />
      <Route path="reports"                     element={<ReportCardsPage />} />
      <Route path="reports/:id"                 element={<ReportCardDetailPage />} />
      <Route path="*"                           element={<Navigate to="/dos/dashboard" replace />} />
    </Routes>
  </DashboardShell>
);

export default DosDashboard;
