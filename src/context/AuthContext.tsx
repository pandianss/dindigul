/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role =
  | 'ADMIN'
  | 'RO_USER'
  | 'LPC_USER'
  | 'BRANCH_USER'
  | 'GUEST'
  | 'RO_MANAGER'
  | 'SECTION_USER'
  | 'BRANCH'
  | 'RO';

export interface User {
  id: number;
  username: string;
  role: Role | string;
  fullNameEn?: string;
  branchId?: string | null;
  branch?: {
    id?: string;
    code?: string;
    nameEn?: string;
    type?: string;
    headUserId?: string;
  } | null;
  departments?: { id: string, nameEn: string }[];
  managedDepartments?: { id: string, nameEn: string }[];
  token?: string;
}

export function getDisplayName(user: Pick<User, 'fullNameEn' | 'username'> | null | undefined) {
  if (!user) return 'Staff';
  return user.fullNameEn || user.username || 'Staff';
}

export interface MfaPending {
  tempToken: string;
}

interface AuthContextType {
  user: User | null;
  mfaPending: MfaPending | null;
  login: (credentials: any) => Promise<void>;
  submitMfa: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => void;
  isLoading: boolean;
  autoLoginError: { message: string, sysUser?: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [mfaPending, setMfaPending] = useState<MfaPending | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLoginError, setAutoLoginError] = useState<{ message: string, sysUser?: string } | null>(null);

  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (sessionStorage.getItem('manualLogout') === 'true') {
        setIsLoading(false);
        return;
      }
      if (user) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/auto-login');
        const data = await res.json();
        if (res.ok) {
          const userWithToken: User = { ...data.user, token: data.token };
          setUser(userWithToken);
          localStorage.setItem('user', JSON.stringify(userWithToken));
          localStorage.setItem('token', data.token);
        } else if (res.status === 404 || res.status === 401) {
          setAutoLoginError({ message: data.error, sysUser: data.sysUser });
        }
      } catch (error) {
        console.error('Auto-login attempt failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    attemptAutoLogin();
  }, [user]);

  const login = async (credentials: any) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // MFA required – enter pending state
    if (data.requiresMfa) {
      setMfaPending({ tempToken: data.tempToken });
      return;
    }

    const userWithToken: User = { ...data.user, token: data.token };
    setUser(userWithToken);
    sessionStorage.removeItem('manualLogout');
    localStorage.setItem('user', JSON.stringify(userWithToken));
    localStorage.setItem('token', data.token);
  };

  const submitMfa = async (code: string) => {
    if (!mfaPending) throw new Error('No MFA challenge active');
    const res = await fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: mfaPending.tempToken, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MFA verification failed');

    const userWithToken: User = { ...data.user, token: data.token };
    setMfaPending(null);
    setUser(userWithToken);
    sessionStorage.removeItem('manualLogout');
    localStorage.setItem('user', JSON.stringify(userWithToken));
    localStorage.setItem('token', data.token);
  };

  const cancelMfa = () => setMfaPending(null);

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setMfaPending(null);
      setAutoLoginError(null);
      sessionStorage.setItem('manualLogout', 'true');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, mfaPending, login, submitMfa, cancelMfa, logout, isLoading, autoLoginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
