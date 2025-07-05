import React from "react";
import { Navigate } from "react-router-dom";
import { getUserRole } from "../auth";

export default function ProtectedRoute({ allowedRoles, children }) {
  const role = getUserRole();

  // If not logged in
  if (!role) return <Navigate to="/login" />;

  // If not allowed
  if (!allowedRoles.includes(role)) return <Navigate to="/" />;

  // If allowed, render children
  return children;
}
