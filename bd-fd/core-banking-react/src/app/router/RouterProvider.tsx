import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import AdminDashboardPage from '../../features/admin/pages/AdminDashboardPage';
import StaffListPage from '../../features/admin/pages/StaffListPage';
import SystemRulesPage from '../../features/admin/pages/SystemRulesPage';
import AnnouncementsPage from '../../features/admin/pages/AnnouncementsPage';
import CustomersPage from '../../features/admin/pages/CustomersPage';
import ProtectedRoute from './ProtectedRoute';

export default function RouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin-only protected routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <StaffListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/system-rules"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <SystemRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
