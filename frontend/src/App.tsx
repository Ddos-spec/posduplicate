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
import ProductManagementPage from './pages/owner/ProductManagementPage';
import IngredientsManagementPage from './pages/owner/IngredientsManagementPage';

// SECURITY: Base protected route - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

// SECURITY: Admin-only route guard
// Allows: super admin, admin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" />;
  }

  const allowedRoles = ['super admin', 'admin'];
  const userRole = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  if (user && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <Navigate to="/login" />;
}

// SECURITY: Owner-level route guard
// Allows: super admin, admin, owner, manager
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" />;
  }

  const allowedRoles = ['super admin', 'admin', 'owner', 'manager'];
  const userRole = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  if (user && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <Navigate to="/login" />;
}

// SECURITY: Cashier-level route guard
// Allows: any authenticated user (cashier, owner, admin, etc.)
function CashierRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

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
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
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
            <OwnerRoute>
              <OwnerLayout />
            </OwnerRoute>
          }
        >
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="employees" element={<EmployeeManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="outlets" element={<OutletManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="products" element={<ProductManagementPage />} />
          <Route path="ingredients" element={<IngredientsManagementPage />} />
          <Route index element={<Navigate to="/owner/dashboard" />} />
        </Route>

        {/* Cashier Route */}
        <Route
          path="/cashier"
          element={
            <CashierRoute>
              <CashierPage />
            </CashierRoute>
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
