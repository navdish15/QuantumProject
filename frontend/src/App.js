// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

// ADMIN
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateUser from "./pages/admin/CreateUser";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLogs from "./pages/admin/AdminLogs";
import Settings from "./pages/admin/Settings";
import AdminExperiments from "./pages/admin/AdminExperiments";
import AdminExperimentFiles from "./pages/admin/AdminExperimentFiles";

// USER
import UserLayout from "./pages/users/UserLayout";
import UserDashboard from "./pages/users/UserDashboard";
import UserExperiments from "./pages/users/UserExperiments";
import ExperimentDetails from "./pages/users/ExperimentDetails";
import UserFiles from "./pages/users/UserFiles";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* ------------------ ADMIN ROUTES ------------------ */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin-experiments" element={<AdminExperiments />} />

        {/* Approved Experiment Files */}
        <Route path="/admin/experiment-files" element={<AdminExperimentFiles />} />
        <Route path="/admin/experiment-files/:id" element={<AdminExperimentFiles />} />

        {/* ------------------ USER ROUTES ------------------ */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="experiments" element={<UserExperiments />} />
          <Route path="experiments/:id" element={<ExperimentDetails />} />
          <Route path="files" element={<UserFiles />} />
        </Route>

        {/* Redirect old route */}
        <Route path="/user-dashboard" element={<Navigate to="/user" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
