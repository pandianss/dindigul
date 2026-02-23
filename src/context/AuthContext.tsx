/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../services/api';

export type Role =
  | 'ADMIN'
  | 'RO'
  | 'RO_MANAGER'
  | 'BRANCH'
  | 'BRANCH_USER'
  | 'SECTION_USER'
  | 'GUEST';

export interface User {
  id: string;
  username: string;
  role: Role | string;
  fullNameEn?: string;
  branchId?: string | null;
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
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    try {
      const res = await api.post('/auth/login', credentials);
      const data = res.data;

      const userWithToken: User = {
        ...data.user,
        token: data.token
      };

      setUser(userWithToken);
      localStorage.setItem('user', JSON.stringify(userWithToken));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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

