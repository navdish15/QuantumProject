import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (err) {
    user = {};
  }

  // If no token → go to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If role is required but user role doesn't match
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute; // ✅ VERY IMPORTANT
