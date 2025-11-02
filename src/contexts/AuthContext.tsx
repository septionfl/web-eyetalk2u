import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_USERS = [
  {
    id: '1',
    email: 'admin@eyetalk2u.com',
    password: 'password', // Dalam production, ini harus hash
    name: 'Administrator',
    role: 'admin' as const
  },
  {
    id: '2',
    email: 'operator@eyetalk2u.com',
    password: 'password123',
    name: 'Operator',
    role: 'operator' as const
  },
  {
    id: '3',
    email: 'viewer@eyetalk2u.com',
    password: 'viewer123',
    name: 'Viewer',
    role: 'viewer' as const
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        // Verify token is still valid (next, this will be an API call)
        const tokenExpiry = localStorage.getItem('token_expiry');
        if (tokenExpiry && new Date() < new Date(tokenExpiry)) {
          setUser(user);
        } else {
          // Token expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('token_expiry');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('token_expiry');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find user with matching credentials
      const validUser = VALID_USERS.find(u => 
        u.email === email && u.password === password
      );

      if (!validUser) {
        return {
          success: false,
          message: 'Email or password is wrong. Please try again.'
        };
      }

      // Create user object without password
      const userData: User = {
        id: validUser.id,
        email: validUser.email,
        name: validUser.name,
        role: validUser.role
      };

      // Generate mock token (in real app, this comes from backend)
      const token = `eyt_${btoa(JSON.stringify(userData))}_${Date.now()}`;
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('token_expiry', tokenExpiry.toISOString());

      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'There is a problem when login. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expiry');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};