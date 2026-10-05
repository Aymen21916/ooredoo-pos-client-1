import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminDataProvider } from './context/AdminDataContext';
import { LanguageProvider } from './context/LanguageContext'; // IMPORT NEW ENGINE
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageOffers from './pages/admin/ManageOffers';
import CashierCustomers from './pages/cashier/Customers';

import POSDashboard from './pages/cashier/POSDashboard';
import CashManagement from './pages/admin/CashManagement';
import DailyReports from './pages/admin/DailyReports';
import ManageProducts from './pages/admin/ManageProducts';
import ManageCustomers from './pages/admin/ManageCustomers';
import AdminAdvances from './pages/admin/AdminAdvances';
import AdminExpenses from './pages/admin/AdminExpenses';
import DateRangeReports from './pages/admin/DateRangeReports';
import CashierDateRangeReport from './pages/cashier/CashierDateRangeReport';
import AuditLog from './pages/admin/AuditLog';
import CashierHistory from './pages/admin/CashierHistory';
import MonthlyTrends from './pages/admin/MonthlyTrends';
import LoyaltySettings from './pages/admin/LoyaltySettings';
import ManageSimStock from './pages/admin/ManageSimStock';
import BarcodeSettings from './pages/admin/BarcodeSettings';
import RegisterLedger from './pages/admin/RegisterLedger';


function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AdminDataProvider>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes (Wrapped in Layout) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  
                  {/* Cashier-Only Routes (date-range report scoped to self) */}
                  <Route element={<ProtectedRoute requireCashier={true} />}>
                    <Route path="/pos" element={<POSDashboard />} />
                    <Route path="/cashier/customers" element={<CashierCustomers />} />
                    <Route path="/cashier/reports/range" element={<CashierDateRangeReport />} />
                  </Route>

                  {/* Admin-Only Routes */}
                  <Route element={<ProtectedRoute requireAdmin={true} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<ManageUsers />} />
                    <Route path="/admin/customers" element={<ManageCustomers />} />
                    <Route path="/admin/offers" element={<ManageOffers />} />
                    <Route path="/admin/products" element={<ManageProducts />} />
                    <Route path="/admin/finances" element={<CashManagement />} />
                    <Route path="/admin/advances" element={<AdminAdvances />} />
                    <Route path="/admin/expenses" element={<AdminExpenses />} />
                    <Route path="/admin/reports" element={<DailyReports />} />
                    <Route path="/admin/reports/range" element={<DateRangeReports />} />
                    <Route path="/admin/reports/trends" element={<MonthlyTrends />} />
                    <Route path="/admin/reports/cashier" element={<CashierHistory />} />
                    <Route path="/admin/audit" element={<AuditLog />} />
                    <Route path="/admin/loyalty" element={<LoyaltySettings />} />
                    <Route path="/admin/stock" element={<ManageSimStock />} />
                    <Route path="/admin/barcode-settings" element={<BarcodeSettings />} />
                    <Route path="/admin/register-ledger" element={<RegisterLedger />} />
                  </Route>

                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AdminDataProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;