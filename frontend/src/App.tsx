import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';
import ConfirmationModal from './components/common/ConfirmationModal';

// Auth
import LoginPage from './pages/LoginPage';

// Cashier
import CashierPage from './pages/CashierPage';

// Admin (Super Admin)
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './components/admin/AdminLayout';
import TenantManagementPage from './pages/admin/TenantManagementPage';
import SystemAnalyticsPage from './pages/admin/SystemAnalyticsPage';
import BillingManagementPage from './pages/admin/BillingManagementPage';

// Owner
import OwnerLayout from './components/owner/OwnerLayout';
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import EmployeeManagementPage from './pages/owner/EmployeeManagementPage';
import UserManagementPage from './pages/owner/UserManagementPage';
import OutletManagementPage from './pages/owner/OutletManagementPage';
import ReportsPage from './pages/owner/ReportsPage';
import SettingsPage from './pages/owner/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <ConfirmationModal />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Routes (Super Admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<SystemAnalyticsPage />} />
          <Route path="tenants" element={<TenantManagementPage />} />
          <Route path="analytics" element={<SystemAnalyticsPage />} />
          <Route path="billing" element={<BillingManagementPage />} />
          <Route index element={<Navigate to="/admin/dashboard" />} />
        </Route>

        {/* Owner Routes */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="employees" element={<EmployeeManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="outlets" element={<OutletManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route index element={<Navigate to="/owner/dashboard" />} />
        </Route>

        {/* Cashier Route */}
        <Route
          path="/cashier"
          element={
            <ProtectedRoute>
              <CashierPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy/Compatibility Routes */}
        <Route path="/dashboard" element={<Navigate to="/owner/dashboard" />} />
        <Route path="/employees" element={<Navigate to="/owner/employees" />} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
