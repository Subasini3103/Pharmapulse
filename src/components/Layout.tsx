import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { notificationService } from '../services/notificationService.ts';
import {
  Activity,
  LayoutDashboard,
  Users,
  Pill,
  Tags,
  Truck,
  UserCheck,
  Package,
  Layers,
  FileText,
  ShoppingCart,
  Receipt,
  FileBarChart,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Store,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, role, logout, quickLoginAs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [demoSwitchOpen, setDemoSwitchOpen] = useState(false);

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res?.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Non-fatal notification error
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nav items configuration based on role
  const getNavItems = () => {
    if (role === 'ADMIN') {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Medicines', path: '/admin/medicines', icon: Pill },
        { label: 'Categories', path: '/admin/categories', icon: Tags },
        { label: 'Inventory & Stock', path: '/admin/inventory', icon: Package },
        { label: 'Batches (FEFO)', path: '/admin/batches', icon: Layers },
        { label: 'Point of Sale (POS)', path: '/admin/sales', icon: ShoppingCart },
        { label: 'Invoices', path: '/admin/invoices', icon: Receipt },
        { label: 'Prescriptions', path: '/admin/prescriptions', icon: FileText },
        { label: 'Purchases (Supplies)', path: '/admin/purchases', icon: Truck },
        { label: 'Suppliers', path: '/admin/suppliers', icon: Store },
        { label: 'Customers', path: '/admin/customers', icon: UserCheck },
        { label: 'User Security & RBAC', path: '/admin/users', icon: Users },
        { label: 'Reports & Analytics', path: '/admin/reports', icon: FileBarChart },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
      ];
    }
    if (role === 'PHARMACIST') {
      return [
        { label: 'Dashboard', path: '/pharmacist/dashboard', icon: LayoutDashboard },
        { label: 'Point of Sale (POS)', path: '/pharmacist/sales', icon: ShoppingCart },
        { label: 'Medicines Catalog', path: '/pharmacist/medicines', icon: Pill },
        { label: 'Inventory & Alerts', path: '/pharmacist/inventory', icon: Package },
        { label: 'Prescription Verification', path: '/pharmacist/prescriptions', icon: FileText },
        { label: 'Invoices & Billing', path: '/pharmacist/invoices', icon: Receipt },
      ];
    }
    if (role === 'SUPPLIER') {
      return [
        { label: 'Dashboard', path: '/supplier/dashboard', icon: LayoutDashboard },
        { label: 'Supplied Medicines', path: '/supplier/medicines', icon: Pill },
        { label: 'Batch Records', path: '/supplier/supplies', icon: Layers },
        { label: 'Purchase Orders', path: '/supplier/purchases', icon: Truck },
      ];
    }
    if (role === 'CUSTOMER') {
      return [
        { label: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
        { label: 'Browse Medicines', path: '/customer/medicines', icon: Pill },
        { label: 'My Prescriptions', path: '/customer/prescriptions', icon: FileText },
        { label: 'Purchase History', path: '/customer/purchases', icon: ShoppingCart },
        { label: 'My Invoices', path: '/customer/invoices', icon: Receipt },
        { label: 'Profile Settings', path: '/customer/profile', icon: UserCheck },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-200">ADMIN</span>;
      case 'PHARMACIST':
        return <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">PHARMACIST</span>;
      case 'SUPPLIER':
        return <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">SUPPLIER</span>;
      case 'CUSTOMER':
        return <span className="bg-sky-100 text-sky-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-sky-200">CUSTOMER</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Mobile Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
                  <Activity className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-slate-900">PharmaPulse</span>
                    <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">PMS</span>
                  </div>
                  <p className="text-[11px] text-slate-600 hidden md:block">PostgreSQL &bull; FEFO Inventory &bull; POS</p>
                </div>
              </div>
            </div>

            {/* Right: Quick Role Switcher, Notification & Profile */}
            <div className="flex items-center gap-3">
              {/* Quick Role Switcher Button */}
              <div className="relative">
                <button
                  onClick={() => setDemoSwitchOpen(!demoSwitchOpen)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Switch Role</span>
                </button>

                {demoSwitchOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-100">
                      Quick Demo Switcher
                    </div>
                    <button
                      onClick={async () => {
                        await quickLoginAs('ADMIN');
                        setDemoSwitchOpen(false);
                        navigate('/admin/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center justify-between"
                    >
                      <span className="font-medium">1. Admin</span>
                      <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Full RBAC</span>
                    </button>
                    <button
                      onClick={async () => {
                        await quickLoginAs('PHARMACIST');
                        setDemoSwitchOpen(false);
                        navigate('/pharmacist/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between"
                    >
                      <span className="font-medium">2. Pharmacist</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">POS & Rx</span>
                    </button>
                    <button
                      onClick={async () => {
                        await quickLoginAs('SUPPLIER');
                        setDemoSwitchOpen(false);
                        navigate('/supplier/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center justify-between"
                    >
                      <span className="font-medium">3. Supplier</span>
                      <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Supply Orders</span>
                    </button>
                    <button
                      onClick={async () => {
                        await quickLoginAs('CUSTOMER');
                        setDemoSwitchOpen(false);
                        navigate('/customer/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center justify-between"
                    >
                      <span className="font-medium">4. Customer</span>
                      <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">My Invoices</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">System Alerts</span>
                        {unreadCount > 0 && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-600">No alerts at this time.</div>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition ${
                              n.isRead ? 'bg-white opacity-70' : 'bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {n.type === 'LOW_STOCK' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              ) : n.type === 'EXPIRED' ? (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-slate-900 font-semibold">{n.title}</p>
                                <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                                <p className="text-slate-600 text-[10px] mt-1">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Role Info */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">{user?.name}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">{getRoleBadge()}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Logout securely"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sticky top-22">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              {role} Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full shadow-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-base">PharmaPulse</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-500 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 px-2 py-2 bg-slate-50 rounded-xl mb-4">
                  <p className="text-xs text-slate-600 font-medium">{user?.name}</p>
                  <div className="mt-1">{getRoleBadge()}</div>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full py-2.5 px-4 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
