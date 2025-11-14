import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import CashierPage from './pages/CashierPage';
import AdminLayout from './pages/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import PromotionsPage from './pages/PromotionsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/cashier"
          element={
            <ProtectedRoute>
              <CashierPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeeManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <ProtectedRoute>
              <PromotionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<div className="text-center py-8 text-gray-500">Products page - Coming soon</div>} />
          <Route path="customers" element={<div className="text-center py-8 text-gray-500">Customers page - Coming soon</div>} />
          <Route path="settings" element={<div className="text-center py-8 text-gray-500">Settings page - Coming soon</div>} />
        </Route>
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
