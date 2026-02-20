import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role = 'ADMIN' | 'RO' | 'BRANCH' | 'GUEST';

interface User {
  name: string;
  role: Role;
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session/token
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // Set dummy user for now if needed, or just let it be null
    // setUser({ name: 'Anand Kumar', role: 'RO' });
    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    // Dummy login logic
    console.log('Logging in with', credentials);
    const mockUser: User = { name: 'Anand Kumar', role: 'RO' }; // Default to RO for dev
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
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

