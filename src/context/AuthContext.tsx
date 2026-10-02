import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.ts';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER';
  phone?: string;
  status: string;
  customerId?: number;
  supplierId?: number;
  pharmacistId?: number;
}

interface AuthContextType {
  user: User | null;
  role: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pharma_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('pharma_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      if (res?.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('pharma_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authService.login(credentials);
    if (res?.success && res.data) {
      localStorage.setItem('pharma_access_token', res.data.accessToken);
      localStorage.setItem('pharma_refresh_token', res.data.refreshToken);
      localStorage.setItem('pharma_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      // Fetch full details with linked role IDs
      await fetchCurrentUser();
    }
  };

  const register = async (data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) => {
    const res = await authService.register(data);
    if (res?.success && res.data) {
      localStorage.setItem('pharma_access_token', res.data.accessToken);
      localStorage.setItem('pharma_refresh_token', res.data.refreshToken);
      localStorage.setItem('pharma_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      await fetchCurrentUser();
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const quickLoginAs = async (targetRole: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER') => {
    const roleCredentials = {
      ADMIN: { email: 'admin@pharmacy.com', password: 'Admin@123' },
      PHARMACIST: { email: 'sarah.pharmacist@pharmacy.com', password: 'Pharmacist@123' },
      SUPPLIER: { email: 'orders@medisupply.com', password: 'Supplier@123' },
      CUSTOMER: { email: 'john.miller@example.com', password: 'Customer@123' },
    };

    const creds = roleCredentials[targetRole];
    await login(creds);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        quickLoginAs,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
