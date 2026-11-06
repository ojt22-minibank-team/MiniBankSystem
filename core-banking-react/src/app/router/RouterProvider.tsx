import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import SignupPage from '../../features/auth/pages/SignupPage';
import StaffPasswordSetupPage from '../../features/auth/pages/StaffPasswordSetupPage';
import AdminDashboardPage from '../../features/admin/pages/AdminDashboardPage';
import TellerDashboardPage from '../../features/teller/pages/TellerDashboardPage';
import StaffListPage from '../../features/admin/pages/StaffListPage';
import ProfilePage from '../../features/admin/pages/ProfilePage';
import SystemRulesPage from '../../features/admin/pages/SystemRulesPage';
import AnnouncementsPage from '../../features/admin/pages/AnnouncementsPage';
import CustomersPage from '../../features/admin/pages/CustomersPage';
import AccountsPage from '../../features/operations/pages/AccountsPage';
import OtcTransactionPage from '../../features/operations/pages/OtcTransactionPage';
import ReportingPage from '../../features/reporting/pages/ReportingPage';
import AuditLogsPage from '../../features/audit-logs/pages/AuditLogsPage';
import TransactionDetailsPage from '../../features/transactions/pages/TransactionDetailsPage';
import UnauthorizedPage from '../../components/common/UnauthorizedPage';
import ProtectedRoute from './ProtectedRoute';

export default function RouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================
            Public Authentication Routes
           ======================================================== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/setup-password" element={<SignupPage />} />
        <Route path="/set-password" element={<SignupPage />} />
        <Route path="/staff-setup" element={<StaffPasswordSetupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ========================================================
            Admin & Auditor Routes (/admin/*)
           ======================================================== */}
        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Staff Management */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <StaffListPage />
            </ProtectedRoute>
          }
        />

        {/* Admin / Auditor Profile */}
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin: System Rules */}
        <Route
          path="/admin/system-rules"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <SystemRulesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Announcements */}
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Customers */}
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Bank Accounts */}
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Transaction Explorer */}
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions/:refOrId"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin / Auditor: Audit Logs */}
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin / Auditor: Reporting */}
        <Route
          path="/admin/reporting"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'AUDITOR']}>
              <ReportingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={<Navigate to="/admin/reporting" replace />}
        />

        {/* Legacy redirect for OTC under admin */}
        <Route
          path="/admin/otc"
          element={<Navigate to="/teller/otc" replace />}
        />
        <Route
          path="/admin/transfers"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        {/* ========================================================
            Teller Dedicated Routes (/teller/*)
           ======================================================== */}
        {/* Teller Dashboard */}
        <Route
          path="/teller/dashboard"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <TellerDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Teller OTC Cash Operations */}
        <Route
          path="/teller/otc"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <OtcTransactionPage />
            </ProtectedRoute>
          }
        />

        {/* Teller: Customer Inquiries */}
        <Route
          path="/teller/customers"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Teller: Customer Bank Accounts */}
        <Route
          path="/teller/accounts"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        {/* Teller: Transaction Explorer */}
        <Route
          path="/teller/transactions"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teller/transactions/:refOrId"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <TransactionDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Teller: Bulletins & Announcements */}
        <Route
          path="/teller/announcements"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* Teller Profile */}
        <Route
          path="/teller/profile"
          element={
            <ProtectedRoute requiredRole="TELLER">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teller"
          element={<Navigate to="/teller/dashboard" replace />}
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
