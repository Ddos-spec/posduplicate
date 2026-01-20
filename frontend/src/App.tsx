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

// DEMO PAGES
const DemoLandingPage = lazy(() => import('./pages/demo/DemoLandingPage'));
const DemoFnbOwner = lazy(() => import('./pages/demo/fnb/DemoFnbOwner'));
const DemoFnbProducts = lazy(() => import('./pages/demo/fnb/DemoFnbProducts'));
const DemoFnbUsers = lazy(() => import('./pages/demo/fnb/DemoFnbUsers'));
const DemoCashier = lazy(() => import('./pages/demo/fnb/DemoCashier'));
const DemoAcctOwner = lazy(() => import('./pages/demo/accounting/DemoAcctOwner'));
const DemoCoA = lazy(() => import('./pages/demo/accounting/DemoCoA'));
const DemoJournal = lazy(() => import('./pages/demo/accounting/DemoJournal'));
const DemoLedger = lazy(() => import('./pages/demo/accounting/DemoLedger'));
const DemoReports = lazy(() => import('./pages/demo/accounting/DemoReports'));
const DemoAcctDistributor = lazy(() => import('./pages/demo/accounting/DemoAcctDistributor'));
const DemoAcctProducer = lazy(() => import('./pages/demo/accounting/DemoAcctProducer'));
const DemoAcctRetail = lazy(() => import('./pages/demo/accounting/DemoAcctRetail'));
const DemoForecastPage = lazy(() => import('./pages/demo/accounting/DemoForecastPage'));
const DemoAccountingReadOnlyPage = lazy(() => import('./pages/demo/accounting/DemoAccountingReadOnlyPage'));

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
const LedgerPage = lazy(() => import('./pages/accounting/LedgerPage'));
const AccountingSettingsPage = lazy(() => import('./pages/accounting/AccountingSettingsPage'));
const ForecastPage = lazy(() => import('./pages/accounting/ForecastPage'));
const AccountingReadOnlyPage = lazy(() => import('./pages/accounting/AccountingReadOnlyPage'));

// Inventory Module Pages (Mock)
const InventoryLayout = lazy(() => import('./components/inventory/InventoryLayout'));
const InventoryDashboard = lazy(() => import('./pages/inventory/InventoryDashboard'));
const StockPage = lazy(() => import('./pages/inventory/StockPage'));
const ForecastPageInventory = lazy(() => import('./pages/inventory/ForecastPage'));
const ReorderPage = lazy(() => import('./pages/inventory/ReorderPage'));

// Medsos Module Pages (Mock)
const MedsosLayout = lazy(() => import('./components/medsos/MedsosLayout'));
const MedsosDashboard = lazy(() => import('./pages/medsos/MedsosDashboard'));
const ContentCalendar = lazy(() => import('./pages/medsos/ContentCalendar'));
const CreatePost = lazy(() => import('./pages/medsos/CreatePost'));

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

        {/* DEMO ROUTES (PUBLIC ACCESS) */}
        <Route path="/demo" element={<DemoLandingPage />} />
        <Route path="/demo/fnb/owner" element={<DemoFnbOwner />} />
        <Route path="/demo/fnb/owner/products" element={<DemoFnbProducts />} />
        <Route path="/demo/fnb/owner/users" element={<DemoFnbUsers />} />
        <Route path="/demo/fnb/cashier" element={<DemoCashier />} />
        <Route path="/demo/accounting/owner" element={<DemoAcctOwner />} />
        <Route path="/demo/accounting/owner/forecast" element={<DemoForecastPage variant="owner" />} />
        <Route path="/demo/accounting/owner/coa" element={<DemoCoA />} />
        <Route path="/demo/accounting/owner/journal" element={<DemoJournal />} />
        <Route path="/demo/accounting/owner/ledger" element={<DemoLedger />} />
        <Route path="/demo/accounting/owner/reports" element={<DemoReports />} />
        
        {/* Demo Distributor */}
        <Route path="/demo/accounting/distributor" element={<DemoAcctDistributor />} />
        <Route path="/demo/accounting/distributor/forecast" element={<DemoForecastPage variant="distributor" />} />
        <Route path="/demo/accounting/distributor/pembelian" element={<DemoAccountingReadOnlyPage variant="distributor" section="pembelian" />} />
        <Route path="/demo/accounting/distributor/supplier" element={<DemoAccountingReadOnlyPage variant="distributor" section="supplier" />} />
        <Route path="/demo/accounting/distributor/stok" element={<DemoAccountingReadOnlyPage variant="distributor" section="stok" />} />
        <Route path="/demo/accounting/distributor/keuangan" element={<DemoAccountingReadOnlyPage variant="distributor" section="keuangan" />} />
        <Route path="/demo/accounting/distributor/laporan" element={<DemoAccountingReadOnlyPage variant="distributor" section="laporan" />} />

        {/* Demo Producer */}
        <Route path="/demo/accounting/producer" element={<DemoAcctProducer />} />
        <Route path="/demo/accounting/producer/forecast" element={<DemoForecastPage variant="produsen" />} />
        <Route path="/demo/accounting/producer/produksi" element={<DemoAccountingReadOnlyPage variant="produsen" section="produksi" />} />
        <Route path="/demo/accounting/producer/inventori" element={<DemoAccountingReadOnlyPage variant="produsen" section="inventori" />} />
        <Route path="/demo/accounting/producer/laporan" element={<DemoAccountingReadOnlyPage variant="produsen" section="laporan" />} />

        {/* Demo Retail */}
        <Route path="/demo/accounting/retail" element={<DemoAcctRetail />} />
        <Route path="/demo/accounting/retail/forecast" element={<DemoForecastPage variant="retail" />} />
        <Route path="/demo/accounting/retail/sales" element={<DemoAccountingReadOnlyPage variant="retail" section="sales" />} />
        <Route path="/demo/accounting/retail/customers" element={<DemoAccountingReadOnlyPage variant="retail" section="customers" />} />
        <Route path="/demo/accounting/retail/products" element={<DemoAccountingReadOnlyPage variant="retail" section="products" />} />
        <Route path="/demo/accounting/retail/inventory" element={<DemoAccountingReadOnlyPage variant="retail" section="inventory" />} />
        <Route path="/demo/accounting/retail/reports" element={<DemoAccountingReadOnlyPage variant="retail" section="reports" />} />

        {/* DEMO INVENTORY (Public Access) - Reusing Logic */}
        <Route path="/demo/inventory" element={<InventoryLayout />}>
          <Route path="dashboard" element={<InventoryDashboard />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="forecast" element={<ForecastPageInventory />} />
          <Route path="reorder" element={<ReorderPage />} />
          <Route path="settings" element={<div className="p-6">Settings Page (Coming Soon)</div>} />
          <Route index element={<Navigate to="/demo/inventory/dashboard" />} />
        </Route>

        {/* DEMO MEDSOS (Public Access) - Reusing Logic */}
        <Route path="/demo/medsos" element={<MedsosLayout />}>
          <Route path="dashboard" element={<MedsosDashboard />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="calendar" element={<ContentCalendar />} />
          <Route path="inbox" element={<div className="p-6">Inbox & Reply (Coming Soon)</div>} />
          <Route path="settings" element={<div className="p-6">Account Settings (Coming Soon)</div>} />
          <Route index element={<Navigate to="/demo/medsos/dashboard" />} />
        </Route>

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

        {/* Inventory Module Routes */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<InventoryDashboard />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="forecast" element={<ForecastPageInventory />} />
          <Route path="reorder" element={<ReorderPage />} />
          <Route path="settings" element={<div className="p-6">Settings Page (Coming Soon)</div>} />
          <Route index element={<Navigate to="/inventory/dashboard" />} />
        </Route>

        {/* Medsos Module Routes */}
        <Route
          path="/medsos"
          element={
            <ProtectedRoute>
              <MedsosLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<MedsosDashboard />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="calendar" element={<ContentCalendar />} />
          <Route path="inbox" element={<div className="p-6">Inbox & Reply (Coming Soon)</div>} />
          <Route path="settings" element={<div className="p-6">Account Settings (Coming Soon)</div>} />
          <Route index element={<Navigate to="/medsos/dashboard" />} />
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
            path="forecast"
            element={<ForecastPage variant="retail" />}
          />
          <Route
            path="settings"
            element={<AccountingReadOnlyPage variant="retail" section="settings" />}
          />
          <Route
            path="sales"
            element={<AccountingReadOnlyPage variant="retail" section="sales" />}
          />
          <Route
            path="customers"
            element={<AccountingReadOnlyPage variant="retail" section="customers" />}
          />
          <Route
            path="products"
            element={<AccountingReadOnlyPage variant="retail" section="products" />}
          />
          <Route
            path="inventory"
            element={<AccountingReadOnlyPage variant="retail" section="inventory" />}
          />
          <Route
            path="reports"
            element={<AccountingReadOnlyPage variant="retail" section="reports" />}
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
            path="forecast"
            element={<ForecastPage variant="distributor" />}
          />
          <Route
            path="settings"
            element={<AccountingReadOnlyPage variant="distributor" section="settings" />}
          />
          <Route
            path="pembelian"
            element={<AccountingReadOnlyPage variant="distributor" section="pembelian" />}
          />
          <Route
            path="supplier"
            element={<AccountingReadOnlyPage variant="distributor" section="supplier" />}
          />
          <Route
            path="stok"
            element={<AccountingReadOnlyPage variant="distributor" section="stok" />}
          />
          <Route
            path="keuangan"
            element={<AccountingReadOnlyPage variant="distributor" section="keuangan" />}
          />
          <Route
            path="laporan"
            element={<AccountingReadOnlyPage variant="distributor" section="laporan" />}
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
            path="forecast"
            element={<ForecastPage variant="produsen" />}
          />
          <Route
            path="settings"
            element={<AccountingReadOnlyPage variant="produsen" section="settings" />}
          />
          <Route
            path="produksi"
            element={<AccountingReadOnlyPage variant="produsen" section="produksi" />}
          />
          <Route
            path="inventori"
            element={<AccountingReadOnlyPage variant="produsen" section="inventori" />}
          />
          <Route
            path="laporan"
            element={<AccountingReadOnlyPage variant="produsen" section="laporan" />}
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
