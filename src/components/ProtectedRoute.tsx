import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardRoute =
      user.role === 'ADMIN'
        ? '/admin/dashboard'
        : user.role === 'PHARMACIST'
        ? '/pharmacist/dashboard'
        : user.role === 'SUPPLIER'
        ? '/supplier/dashboard'
        : '/customer/dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-600">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">403 – Access Denied</h1>
          <p className="text-slate-600 text-sm mb-6">
            Your account role <span className="font-semibold text-slate-800 uppercase px-2 py-0.5 bg-slate-100 rounded">({user.role})</span> does not have authorization to access this page. Backend security rules restrict this resource.
          </p>
          <div className="space-y-3">
            <Link
              to={dashboardRoute}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go to My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
