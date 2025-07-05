// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Entry from "./components/Entry";
import Navbar from "./components/Navbar";
import MemoList from "./components/MemoList";
import MemoDetail from "./components/MemoDetail";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MemoEdit from "./components/MemoEdit";
import LrEdit from "./components/LrEdit";
import DeliveryPersonManager from "./components/DeliveryPersonManager";
import DeliveryMarking from "./components/DeliveryMarking";
import Login from "./components/Login";
import UserAdmin from "./components/UserAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import AuditLog from "./components/AuditLog";
import DoorDeliveryReport from "./components/reports/DoorDeliveryReport";
import TruckReport from "./components/reports/TruckReport";
import "./styles/main.css";
import "./styles/ui.css";
import LrSearchReport from "./components/reports/LrSearchReport";
import UndeliveredReport from "./components/reports/UndeliveredReport";
import MonthlyReport from "./components/reports/MonthlyReport";
import RefundReport from "./components/reports/RefundReport";
import LrsWithoutCashMemoReport from "./components/reports/LrsWithoutCashMemoReport";
import DeliveryReport from "./components/reports/DeliveryReport";
import DeleteKeySettings from "./components/settings/DeleteKeySettings";
import api from "./api"; // <-- import your Axios instance

export default function App() {
  // Keep selected year even after refresh using localStorage
  const getInitialYear = () => localStorage.getItem("selectedYear") || "";
  const [selectedYear, setSelectedYear] = useState(getInitialYear);

  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [username, setUsername] = useState(""); // for Login, optional

  // Save selected year to localStorage whenever changed
  useEffect(() => {
    if (selectedYear) localStorage.setItem("selectedYear", selectedYear);
  }, [selectedYear]);

  // Fetch current user on app load if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/me")
        .then(res => {
          setCurrentUser(res.data); // { username, role, id }
          setIsLoggedIn(true);
        })
        .catch(() => {
          setCurrentUser(null);
          setIsLoggedIn(false);
        });
    } else {
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  }, []);

  // Listen for manual token changes (for auto logout/login)
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
      if (!token) setCurrentUser(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <BrowserRouter>
      {isLoggedIn && (
        <Navbar selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
      )}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Routes>
          {/* Login route, available to everyone */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/" />
              ) : (
                <Login
                  setIsLoggedIn={setIsLoggedIn}
                  setUsername={setUsername}
                  setCurrentUser={setCurrentUser}
                />
              )
            }
          />

          {/* Protected routes - only for logged-in users */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk", "low"]}>
                <Dashboard selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/entry"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                {/* Pass currentUser down */}
                <Entry selectedYear={selectedYear} currentUser={currentUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/memos"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <MemoList selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/memos/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <MemoDetail selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/memos/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <MemoEdit selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lrs/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <LrEdit selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/delivery-persons"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <DeliveryPersonManager />
              </ProtectedRoute>
            }
          />

          <Route
            path="/deliveries"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <DeliveryMarking selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserAdmin />
              </ProtectedRoute>
            }
          />

          {/* Any other path: if not logged in, go to login; if logged in, go to dashboard */}
          <Route
            path="*"
            element={
              isLoggedIn ? <Navigate to="/" /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/auditlog"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AuditLog selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/door-delivery"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <DoorDeliveryReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/truck"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <TruckReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/lr-search"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <LrSearchReport
                  selectedYear={selectedYear}
                  userRole={["admin"]}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/undelivered"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <UndeliveredReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/MonthlyReport"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <MonthlyReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/RefundReport"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <RefundReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/LrsWithoutCashMemoReport"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <LrsWithoutCashMemoReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/DeliveryReport"
            element={
              <ProtectedRoute allowedRoles={["admin", "clerk"]}>
                <DeliveryReport selectedYear={selectedYear} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/delete-key"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DeleteKeySettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </LocalizationProvider>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
