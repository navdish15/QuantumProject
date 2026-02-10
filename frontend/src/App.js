import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// ADMIN
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateUser from './pages/admin/CreateUser';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';
import Settings from './pages/admin/Settings';
import AdminExperiments from './pages/admin/AdminExperiments';
import AdminExperimentFiles from './pages/admin/AdminExperimentFiles';

// USER
import UserLayout from './pages/users/UserLayout';
import UserDashboard from './pages/users/UserDashboard';
import UserExperiments from './pages/users/UserExperiments';
import ExperimentDetails from './pages/users/ExperimentDetails';
import UserFiles from './pages/users/UserFiles';

function App() {
  const token = localStorage.getItem('token');

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }

  return (
    <Router>
      <>
        <Routes>
          {/* ---------- LOGIN / ROOT REDIRECT ---------- */}
          <Route path="/" element={token ? user?.role === 'admin' ? <Navigate to="/admin-dashboard" replace /> : <Navigate to="/user" replace /> : <Login />} />

          {/* ------------------ ADMIN ROUTES ------------------ */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-user"
            element={
              <ProtectedRoute role="admin">
                <CreateUser />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute role="admin">
                <AdminLogs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute role="admin">
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-experiments"
            element={
              <ProtectedRoute role="admin">
                <AdminExperiments />
              </ProtectedRoute>
            }
          />

          {/* experiment files */}
          <Route
            path="/admin/experiment-files"
            element={
              <ProtectedRoute role="admin">
                <AdminExperimentFiles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/experiment-files/:id"
            element={
              <ProtectedRoute role="admin">
                <AdminExperimentFiles />
              </ProtectedRoute>
            }
          />

          {/* ------------------ USER ROUTES ------------------ */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="user">
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserDashboard />} />
            <Route path="experiments" element={<UserExperiments />} />
            <Route path="experiments/:id" element={<ExperimentDetails />} />
            <Route path="files" element={<UserFiles />} />
          </Route>

          {/* old support */}
          <Route path="/user-dashboard" element={<Navigate to="/user" replace />} />
        </Routes>
      </>
    </Router>
  );
}

export default App;
