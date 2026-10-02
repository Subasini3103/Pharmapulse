import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { Layout } from './components/Layout.tsx';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.tsx';

// Dashboards
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { PharmacistDashboard } from './pages/pharmacist/PharmacistDashboard.tsx';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard.tsx';
import { CustomerDashboard } from './pages/customer/CustomerDashboard.tsx';

// Operational Pages
import { MedicinesPage } from './pages/medicines/MedicinesPage.tsx';
import { CategoriesPage } from './pages/categories/CategoriesPage.tsx';
import { InventoryPage } from './pages/inventory/InventoryPage.tsx';
import { BatchesPage } from './pages/batches/BatchesPage.tsx';
import { PrescriptionsPage } from './pages/prescriptions/PrescriptionsPage.tsx';
import { SalesPOSPage } from './pages/sales/SalesPOSPage.tsx';
import { InvoicesPage } from './pages/invoices/InvoicesPage.tsx';
import { PurchasesPage } from './pages/purchases/PurchasesPage.tsx';
import { SuppliersPage } from './pages/suppliers/SuppliersPage.tsx';
import { CustomersPage } from './pages/customers/CustomersPage.tsx';
import { UsersPage } from './pages/users/UsersPage.tsx';
import { ReportsPage } from './pages/reports/ReportsPage.tsx';
import { AuditLogsPage } from './pages/audit/AuditLogsPage.tsx';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage.tsx';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'PHARMACIST') return <Navigate to="/pharmacist/dashboard" replace />;
  if (user.role === 'SUPPLIER') return <Navigate to="/supplier/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ADMIN Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="suppliers" element={<SuppliersPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="batches" element={<BatchesPage />} />
                    <Route path="prescriptions" element={<PrescriptionsPage />} />
                    <Route path="sales" element={<SalesPOSPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="audit-logs" element={<AuditLogsPage />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* PHARMACIST Routes */}
          <Route
            path="/pharmacist/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<PharmacistDashboard />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="prescriptions" element={<PrescriptionsPage />} />
                    <Route path="sales" element={<SalesPOSPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="*" element={<Navigate to="/pharmacist/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* SUPPLIER Routes */}
          <Route
            path="/supplier/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SUPPLIER']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<SupplierDashboard />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="supplies" element={<BatchesPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="*" element={<Navigate to="/supplier/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* CUSTOMER Routes */}
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'CUSTOMER']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<CustomerDashboard />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="prescriptions" element={<PrescriptionsPage />} />
                    <Route path="purchases" element={<InvoicesPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="profile" element={<CustomerProfilePage />} />
                    <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
