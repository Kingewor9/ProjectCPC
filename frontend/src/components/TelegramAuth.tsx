import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function TelegramAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
            console.log('No Telegram data, using test login');
            await handleTestLogin();
            return;
          }

          // Check for user mismatch
          const storedToken = localStorage.getItem('authToken');
          if (storedToken) {
            try {
              // Try to get current user from token
              const response = await fetch('/api/me', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`
                }
              });
              
              if (response.ok) {
                const storedUser = await response.json();
                
                // If stored user doesn't match current Telegram user, clear storage
                if (storedUser.telegram_id !== String(tgUser.id)) {
                  console.log('User mismatch detected, clearing session');
                  localStorage.clear();
                }
              } else {
                // Invalid token, clear it
                localStorage.clear();
              }
            } catch (err) {
              console.log('Error checking stored user:', err);
              localStorage.clear();
            }
          }

          try {
            console.log('Attempting login...');
            
            // Send initData directly to backend
            const result = await login({ initData });
            
            console.log('Login successful:', result);
            navigate('/dashboard');
          } catch (error: any) {
            console.error('Login failed:', error);
            setError(error.message || 'Login failed');
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
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Test login failed:', error);
        setError(error.message || 'Test login failed');
      }
    };

    initTelegramAuth();
  }, [login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-darkBlue-900 via-darkBlue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-400 font-bold mb-2">Authentication Error</p>
          <p className="text-white text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkBlue-900 via-darkBlue-800 to-blue-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-white mt-4 text-lg">Connecting to Telegram...</p>
      </div>
    </div>
  );
}