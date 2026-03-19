import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function TelegramAuth() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const authAttemptedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple auth attempts
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;

    const initTelegramAuth = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-web-app.js';
        script.async = true;

        script.onload = async () => {
          // Give Telegram time to initialize
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const tg = window.Telegram?.WebApp;

          if (!tg) {
            console.error('Telegram WebApp not available');
            if (isAuthenticated) {
              navigate('/dashboard', { replace: true });
              return;
            }
            await handleTestLogin();
            return;
          }

          tg.ready();
          tg.expand();

          const tgUser = tg.initDataUnsafe?.user;
          const initData = tg.initData;

          console.log('Telegram user:', tgUser);
          console.log('Init data available:', !!initData);

          if (!tgUser || !initData) {
            console.log('No Telegram data, checking fallback login');
            if (isAuthenticated) {
              navigate('/dashboard', { replace: true });
              return;
            }
            await handleTestLogin();
            return;
          }

          // Synchronously check if the current Telegram user matches the stored user
          let shouldLogin = true;
          const storedToken = localStorage.getItem('authToken');
          const storedUserStr = localStorage.getItem('user');

          if (storedToken && storedUserStr) {
            try {
              const storedUser = JSON.parse(storedUserStr);
              // Compare telegram_id or id from storedUser with the current Telegram user's id
              const storedUserId = String(storedUser.telegram_id || storedUser.id);
              const currentTgId = String(tgUser.id);
              
              if (storedUserId === currentTgId) {
                console.log('User matches locally cached data, proceeding to dashboard');
                shouldLogin = false;
                navigate('/dashboard', { replace: true });
              } else {
                console.log('User mismatch detected! Overriding cache for account switch...');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
              }
            } catch (err) {
              console.log('Error parsing stored user:', err);
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
            }
          }

          if (shouldLogin) {
            try {
              console.log('Attempting login via Telegram initData...');
              // Send initData directly to backend
              const result = await login({ initData });
              console.log('Login successful:', result);
              navigate('/dashboard', { replace: true });
            } catch (error: any) {
              console.error('Login failed:', error);
              setError(error.message || 'Login failed');
              authAttemptedRef.current = false; // Allow retry
            }
          }
        };

        script.onerror = () => {
          console.error('Failed to load Telegram script');
          handleTestLogin();
        };

        document.body.appendChild(script);
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to initialize');
        authAttemptedRef.current = false; // Allow retry
      }
    };

    const handleTestLogin = async () => {
      console.log('Using test mode');
      const testUser = {
        test_mode: true,
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        photo_url: 'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=TU'
      };

      try {
        await login(testUser);
        navigate('/dashboard', { replace: true });
      } catch (error: any) {
        console.error('Test login failed:', error);
        setError(error.message || 'Test login failed');
        authAttemptedRef.current = false; // Allow retry
      }
    };

    initTelegramAuth();
  }, []); // Empty dependency array - run only once on mount

  if (error) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
        <div className="text-center glass-panel border-neon-pink/50 p-6 max-w-md shadow-glow-violet">
          <p className="neon-text-pink font-bold mb-3 text-lg">Authentication Error</p>
          <p className="text-content font-mono text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-neon-cyan mt-6 text-lg tracking-widest uppercase font-mono animate-pulse">Connecting to Telegram</p>
      </div>
    </div>
  );
}