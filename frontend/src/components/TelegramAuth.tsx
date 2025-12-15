import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function TelegramAuth() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    const initTelegramAuth = async () => {
      // Load Telegram WebApp script
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      
      script.onload = async () => {
        const tg = window.Telegram?.WebApp;
        
        if (!tg) {
          console.error('Telegram WebApp not available');
          // Fallback for testing
          await handleTestLogin();
          return;
        }

        // Initialize Telegram WebApp
        tg.ready();
        tg.expand();

        // Get user data from Telegram
        const userData = tg.initDataUnsafe?.user;
        const initData = tg.initData;

        if (userData && initData) {
          // Authenticate with backend
          try {
            const telegramData = {
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name || '',
              username: userData.username || '',
              photo_url: userData.photo_url || '',
              language_code: userData.language_code || 'en',
              auth_date: tg.initDataUnsafe.auth_date || Math.floor(Date.now() / 1000),
              hash: tg.initDataUnsafe.hash || '',
              initData: initData // Send full initData for backend validation
            };

            await login(telegramData);
            navigate('/dashboard');
          } catch (error) {
            console.error('Login failed:', error);
            // Show error UI
          }
        } else {
          // No user data - fallback for testing
          await handleTestLogin();
        }
      };

      document.body.appendChild(script);
    };

    const handleTestLogin = async () => {
      // Test mode for development
      const testUser = {
        test_mode: true,
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        photo_url: 'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=TU',
      };
      
      try {
        await login(testUser);
        navigate('/dashboard');
      } catch (error) {
        console.error('Test login failed:', error);
      }
    };

    // Only auto-login if not already logged in
    if (!user && !localStorage.getItem('authToken')) {
      initTelegramAuth();
    } else {
      navigate('/dashboard');
    }
  }, [login, navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkBlue-900 via-darkBlue-800 to-blue-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-white mt-4 text-lg">Connecting to Telegram...</p>
      </div>
    </div>
  );
}