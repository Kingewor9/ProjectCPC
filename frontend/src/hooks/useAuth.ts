import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
  if (apiService.isAuthenticated() && !user) {
    fetchUser();
  }
}, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await apiService.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setError(null);
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (telegramData: any) => {
    try {
      setLoading(true);
      const result = await apiService.authenticateWithTelegram(telegramData);
      if (result.ok) {
        apiService.setToken(result.token);
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        navigate('/dashboard');
        return result;
      }
    } catch (err) {
      setError('Authentication failed');
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.clearAuth();
    setUser(null);
    navigate('/login');
  };

  return {
    user,
    loading,
    error,
    fetchUser,
    login,
    logout,
    isAuthenticated: !!user && apiService.isAuthenticated(),
  };
};
