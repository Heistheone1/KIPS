import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import DosDashboard from './pages/dos/DosDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassTeacherDashboard from './pages/classTeacher/ClassTeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import Logout from './pages/Logout';
import ProfilePage from './pages/Profile';

export const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  DOS: '/dos/dashboard',
  TEACHER: '/teacher/dashboard',
  CLASS_TEACHER: '/class-teacher/dashboard',
  STUDENT: '/student/dashboard',
};

/** Unauthenticated-only: redirect logged-in users to their dashboard */
const PublicRoute = () => {
  const { currentRole } = useSelector((s) => s.user);
  if (currentRole && ROLE_HOME[currentRole]) {
    return <Navigate to={ROLE_HOME[currentRole]} replace />;
  }
  return <Outlet />;
};

/** Authenticated-only: redirect guests to /login, wrong-role to own dashboard */
const ProtectedRoute = ({ allowedRole }) => {
  const { currentRole } = useSelector((s) => s.user);
  if (!currentRole) return <Navigate to="/login" replace />;
  if (allowedRole && currentRole !== allowedRole) {
    return <Navigate to={ROLE_HOME[currentRole] || '/login'} replace />;
  }
  return <Outlet />;
};

/** Root and catch-all: send to dashboard or login */
const SmartRedirect = () => {
  const { currentRole } = useSelector((s) => s.user);
  return <Navigate to={currentRole && ROLE_HOME[currentRole] ? ROLE_HOME[currentRole] : '/login'} replace />;
};

const App = () => (
  <Router>
    <Routes>
      {/* Public pages — bounce authenticated users away */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Logout — any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/logout" element={<Logout />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Role-protected dashboards */}
      <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="DOS" />}>
        <Route path="/dos/*" element={<DosDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="TEACHER" />}>
        <Route path="/teacher/*" element={<TeacherDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="CLASS_TEACHER" />}>
        <Route path="/class-teacher/*" element={<ClassTeacherDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="STUDENT" />}>
        <Route path="/student/*" element={<StudentDashboard />} />
      </Route>

      {/* Root + catch-all */}
      <Route path="/" element={<SmartRedirect />} />
      <Route path="*" element={<SmartRedirect />} />
    </Routes>
  </Router>
);

export default App;
