import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';
import ConfirmationModal from './components/common/ConfirmationModal';
import PWARefreshPrompt from './components/common/PWARefreshPrompt';

// Auth (eager - needed immediately)
import LoginPage from './pages/LoginPage';

// Lazy load everything else
const CashierPage = lazy(() => import('./pages/CashierPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const TenantManagementPage = lazy(() => import('./pages/admin/TenantManagementPage'));
const SystemAnalyticsPage = lazy(() => import('./pages/admin/SystemAnalyticsPage'));
const BillingManagementPage = lazy(() => import('./pages/admin/BillingManagementPage'));
const ApiDocumentationPage = lazy(() => import('./pages/admin/ApiDocumentationPage'));
const ApiKeyManagementPage = lazy(() => import('./pages/admin/ApiKeyManagementPage'));
const OwnerLayout = lazy(() => import('./components/owner/OwnerLayout'));
const OwnerDashboardPage = lazy(() => import('./pages/owner/OwnerDashboardPage'));
const UserManagementPage = lazy(() => import('./pages/owner/UserManagementPage'));
const OutletManagementPage = lazy(() => import('./pages/owner/OutletManagementPage'));
const ReportsPage = lazy(() => import('./pages/owner/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/owner/SettingsPage'));
const ProductManagementPage = lazy(() => import('./pages/owner/ProductManagementPage'));
const TransactionDetailPage = lazy(() => import('./pages/owner/TransactionDetailPage'));
const IntegrationsPage = lazy(() => import('./pages/owner/IntegrationsPage'));

// Module Selector
const ModuleSelectorPage = lazy(() => import('./pages/ModuleSelectorPage'));

// Accounting Module Pages
const AccountingLayout = lazy(() => import('./components/accounting/AccountingLayout'));
const DashboardAkuntansiPage = lazy(() => import('./pages/accounting/DashboardAkuntansiPage'));
const DashboardRetailPage = lazy(() => import('./pages/accounting/DashboardRetailPage'));
const DashboardDistributorPage = lazy(() => import('./pages/accounting/DashboardDistributorPage'));
const DashboardProdusenPage = lazy(() => import('./pages/accounting/DashboardProdusenPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const AccountingUserManagementPage = lazy(() => import('./pages/accounting/UserManagementPage'));
const CreateUserPage = lazy(() => import('./pages/accounting/CreateUserPage'));
const CreateJournalPage = lazy(() => import('./pages/accounting/CreateJournalPage'));
const IncomeStatementPage = lazy(() => import('./pages/accounting/IncomeStatementPage'));
const AccountingPlaceholderPage = lazy(() => import('./pages/accounting/PlaceholderPage'));
const LedgerPage = lazy(() => import('./pages/accounting/LedgerPage'));
const AccountingSettingsPage = lazy(() => import('./pages/accounting/AccountingSettingsPage'));
const ForecastPage = lazy(() => import('./pages/accounting/ForecastPage'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// SECURITY: Base protected route - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

// SECURITY: Admin-only route guard
// Allows: super admin, admin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
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
  const token = useAuthStore((state) => state.token);
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

// SECURITY: Accounting module route guard
// Allows: super admin, admin, owner, manager, distributor, produsen, retail, accountant
function AccountingRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" />;
  }

  const allowedRoles = [
    'super admin',
    'super_admin',
    'admin',
    'owner',
    'manager',
    'distributor',
    'produsen',
    'retail',
    'accountant'
  ];
  const userRole = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  if (user && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <Navigate to="/login" />;
}

// SECURITY: Cashier-level route guard
// Allows: any authenticated user (cashier, owner, admin, etc.)
function CashierRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 1000,
          success: { duration: 1000 },
          error: { duration: 2000 },
        }}
      />
      <ConfirmationModal />
      <PWARefreshPrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Module Selector Route */}
        <Route
          path="/module-selector"
          element={
            <ProtectedRoute>
              <ModuleSelectorPage />
            </ProtectedRoute>
          }
        />

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
          <Route path="api-keys" element={<ApiKeyManagementPage />} />
          <Route path="api-docs" element={<ApiDocumentationPage />} />
          <Route index element={<Navigate to="/admin/dashboard" />} />
        </Route>

        {/* Owner Routes (FNB Module) */}
        <Route
          path="/owner"
          element={
            <OwnerRoute>
              <OwnerLayout />
            </OwnerRoute>
          }
        >
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="outlets" element={<OutletManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="inventory" element={<ProductManagementPage />} />
          <Route path="products" element={<Navigate to="/owner/inventory" />} />
          <Route path="transactions/:id" element={<TransactionDetailPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />

          <Route index element={<Navigate to="/owner/dashboard" />} />
        </Route>

        {/* Accounting Module Routes */}
        <Route
          path="/accounting"
          element={
            <AccountingRoute>
              <AccountingLayout />
            </AccountingRoute>
          }
        >
          <Route path="dashboard" element={<DashboardAkuntansiPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="coa" element={<ChartOfAccountsPage />} />
          <Route path="journal" element={<CreateJournalPage />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="reports" element={<IncomeStatementPage />} />
          <Route path="users" element={<AccountingUserManagementPage />} />
          <Route path="users/create" element={<CreateUserPage />} />
          <Route path="settings" element={<AccountingSettingsPage />} />
          <Route index element={<Navigate to="/accounting/dashboard" />} />
        </Route>

        {/* Accounting Retail Dashboard */}
        <Route
          path="/accounting/retail"
          element={
            <AccountingRoute>
              <AccountingLayout variant="retail" />
            </AccountingRoute>
          }
        >
          <Route index element={<DashboardRetailPage />} />
          <Route
            path="sales"
            element={
              <AccountingPlaceholderPage
                title="Sales Orders"
                backTo="/accounting/retail"
                backLabel="Kembali ke Dashboard Retail"
              />
            }
          />
          <Route
            path="customers"
            element={
              <AccountingPlaceholderPage
                title="Customers"
                backTo="/accounting/retail"
                backLabel="Kembali ke Dashboard Retail"
              />
            }
          />
          <Route
            path="products"
            element={
              <AccountingPlaceholderPage
                title="Products"
                backTo="/accounting/retail"
                backLabel="Kembali ke Dashboard Retail"
              />
            }
          />
          <Route
            path="inventory"
            element={
              <AccountingPlaceholderPage
                title="Inventory"
                backTo="/accounting/retail"
                backLabel="Kembali ke Dashboard Retail"
              />
            }
          />
          <Route
            path="reports"
            element={
              <AccountingPlaceholderPage
                title="Reports"
                backTo="/accounting/retail"
                backLabel="Kembali ke Dashboard Retail"
              />
            }
          />
        </Route>

        {/* Accounting Distributor Dashboard */}
        <Route
          path="/accounting/distributor"
          element={
            <AccountingRoute>
              <AccountingLayout variant="distributor" />
            </AccountingRoute>
          }
        >
          <Route index element={<DashboardDistributorPage />} />
          <Route
            path="pembelian"
            element={
              <AccountingPlaceholderPage
                title="Pembelian"
                backTo="/accounting/distributor"
                backLabel="Kembali ke Dashboard Distributor"
              />
            }
          />
          <Route
            path="supplier"
            element={
              <AccountingPlaceholderPage
                title="Supplier"
                backTo="/accounting/distributor"
                backLabel="Kembali ke Dashboard Distributor"
              />
            }
          />
          <Route
            path="stok"
            element={
              <AccountingPlaceholderPage
                title="Stok"
                backTo="/accounting/distributor"
                backLabel="Kembali ke Dashboard Distributor"
              />
            }
          />
          <Route
            path="keuangan"
            element={
              <AccountingPlaceholderPage
                title="Keuangan"
                backTo="/accounting/distributor"
                backLabel="Kembali ke Dashboard Distributor"
              />
            }
          />
          <Route
            path="laporan"
            element={
              <AccountingPlaceholderPage
                title="Laporan"
                backTo="/accounting/distributor"
                backLabel="Kembali ke Dashboard Distributor"
              />
            }
          />
        </Route>

        {/* Accounting Produsen Dashboard */}
        <Route
          path="/accounting/produsen"
          element={
            <AccountingRoute>
              <AccountingLayout variant="produsen" />
            </AccountingRoute>
          }
        >
          <Route index element={<DashboardProdusenPage />} />
          <Route
            path="produksi"
            element={
              <AccountingPlaceholderPage
                title="Produksi"
                backTo="/accounting/produsen"
                backLabel="Kembali ke Dashboard Produsen"
              />
            }
          />
          <Route
            path="inventori"
            element={
              <AccountingPlaceholderPage
                title="Inventori"
                backTo="/accounting/produsen"
                backLabel="Kembali ke Dashboard Produsen"
              />
            }
          />
          <Route
            path="laporan"
            element={
              <AccountingPlaceholderPage
                title="Laporan"
                backTo="/accounting/produsen"
                backLabel="Kembali ke Dashboard Produsen"
              />
            }
          />
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

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
