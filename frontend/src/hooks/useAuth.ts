import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  // Fetch user on mount only
  useEffect(() => {
    const initializeAuth = async () => {
      if (apiService.isAuthenticated() && !user) {
        try {
          setLoading(true);
          const userData = await apiService.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (err) {
          console.error('Failed to fetch user:', err);
          apiService.clearAuth();
          setUser(null);
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      } else {
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []); // Run only once on mount

  const fetchUser = async () => {
    if (!apiService.isAuthenticated()) {
      setUser(null);
      return;
    }
    
    try {
      setLoading(true);
      const userData = await apiService.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setError(null);
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Auth error:', err);
      apiService.clearAuth();
      setUser(null);
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
    loading: loading || !initialized,
    error,
    fetchUser,
    login,
    logout,
    isAuthenticated: !!user && !!localStorage.getItem('authToken'),
  };
};