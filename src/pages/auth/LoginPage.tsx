import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { Activity, Lock, Mail, Eye, EyeOff, AlertCircle, Shield, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await login({ email, password });
      // Redirect based on updated local storage role
      const saved = localStorage.getItem('pharma_user');
      const user = saved ? JSON.parse(saved) : null;
      if (user?.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user?.role === 'PHARMACIST') navigate('/pharmacist/dashboard');
      else if (user?.role === 'SUPPLIER') navigate('/supplier/dashboard');
      else navigate('/customer/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Login failed. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER') => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await quickLoginAs(role);
      if (role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'PHARMACIST') navigate('/pharmacist/dashboard');
      else if (role === 'SUPPLIER') navigate('/supplier/dashboard');
      else navigate('/customer/dashboard');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white text-center relative">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Activity className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PharmaPulse</h1>
          <p className="text-emerald-100 text-xs mt-1 font-medium">Enterprise Pharmacy Management & POS System</p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@pharmacy.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-600 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In Securely <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Quick Demo Credentials Helpers */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> One-Click Role Sign-In
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                className="p-2 border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Admin</span>
                <span className="text-[9px] bg-purple-200 px-1 py-0.5 rounded">All Access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('PHARMACIST')}
                className="p-2 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Pharmacist</span>
                <span className="text-[9px] bg-emerald-200 px-1 py-0.5 rounded">POS & Rx</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('SUPPLIER')}
                className="p-2 border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-700 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Supplier</span>
                <span className="text-[9px] bg-amber-200 px-1 py-0.5 rounded">Batches</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('CUSTOMER')}
                className="p-2 border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-sky-700 rounded-lg font-medium text-left transition flex items-center justify-between"
              >
                <span>Customer</span>
                <span className="text-[9px] bg-sky-200 px-1 py-0.5 rounded">Orders</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Create Customer Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
