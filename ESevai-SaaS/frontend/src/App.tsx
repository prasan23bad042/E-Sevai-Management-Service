import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './app/toastProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/queryClient';
import { LoginPage } from './pages/auth/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './layouts/AppShell';

// Dashboards
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { OwnerDashboard } from './pages/dashboard/OwnerDashboard';
import { ManagerDashboard } from './pages/dashboard/ManagerDashboard';
import { StaffDashboard } from './pages/dashboard/StaffDashboard';

// Modules
import { CentersPage } from './pages/centers/CentersPage';
import { StaffPage } from './pages/staff/StaffPage';
import { ServicesPage } from './pages/services/ServicesPage';
import { ApplicationsPage } from './pages/applications/ApplicationsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Errors
import { UnauthorizedPage, NotFoundPage } from './pages/error/ErrorPages';

import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import './App.css';

const RootRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === 'platform_admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'center_owner') return <Navigate to="/owner/dashboard" replace />;
  if (user?.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
  if (user?.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  const { checkSession, isInitializing } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Open Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Secure Routing Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                
                {/* Platform Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/centers" element={<CentersPage />} />
                  <Route path="/admin/services" element={<ServicesPage />} />
                  <Route path="/admin/reports" element={<ReportsPage />} />
                </Route>
 
                {/* Center Owner Routes */}
                <Route element={<ProtectedRoute allowedRoles={['center_owner']} />}>
                  <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                  <Route path="/owner/staff" element={<StaffPage />} />
                  <Route path="/owner/applications" element={<ApplicationsPage />} />
                  <Route path="/owner/payments" element={<PaymentsPage />} />
                  <Route path="/owner/reports" element={<ReportsPage />} />
                </Route>
 
                {/* Operations Manager Routes */}
                <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
                  <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                  <Route path="/manager/staff" element={<StaffPage />} />
                  <Route path="/manager/applications" element={<ApplicationsPage />} />
                  <Route path="/manager/documents" element={<DocumentsPage />} />
                  <Route path="/manager/payments" element={<PaymentsPage />} />
                </Route>
 
                {/* Staff Operator Routes */}
                <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                  <Route path="/staff/dashboard" element={<StaffDashboard />} />
                  <Route path="/staff/applications" element={<ApplicationsPage />} />
                  <Route path="/staff/documents" element={<DocumentsPage />} />
                  <Route path="/staff/payments" element={<PaymentsPage />} />
                </Route>
 
                {/* Generic Private Routes */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
 
                {/* Base Route Redirection based on session */}
                <Route path="/" element={<RootRedirect />} />
              </Route>
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
