/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role =
  | 'ADMIN'
  | 'RO'
  | 'RO_MANAGER'
  | 'BRANCH'
  | 'BRANCH_USER'
  | 'SECTION_USER'
  | 'GUEST';

export interface User {
  id: number;
  username: string;
  role: Role | string;
  fullNameEn?: string;
  branchId?: string | null;
  branch?: { code?: string; nameEn?: string } | null;
  token?: string;
}

export function getDisplayName(user: Pick<User, 'fullNameEn' | 'username'> | null | undefined) {
  if (!user) return 'Staff';
  return user.fullNameEn || user.username || 'Staff';
}

interface AuthContextType {
  user: User | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set dummy user for now if needed, or just let it be null
    // setUser({ name: 'Anand Kumar', role: 'RO' });
    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const userWithToken: User = {
        ...data.user,
        token: data.token
      };

      setUser(userWithToken);
      localStorage.setItem('user', JSON.stringify(userWithToken));
      localStorage.setItem('token', data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

