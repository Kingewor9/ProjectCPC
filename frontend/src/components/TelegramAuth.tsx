import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function TelegramAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const initTelegramAuth = async () => {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;

      script.onload = async () => {
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

        if (!tgUser || !initData) {
          await handleTestLogin();
          return;
        }

        /* ---------------------------------------
           🔥 THIS IS WHERE YOUR CODE GOES
        --------------------------------------- */
        const storedUser = localStorage.getItem('user');

        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const storedTelegramId = parsed.id || parsed.telegram_id;

          if (storedTelegramId !== tgUser.id) {
            // Telegram user switched → FULL reset
            localStorage.clear();
          }
        }
        /* --------------------------------------- */

        try {
          const telegramData = {
            id: tgUser.id,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name || '',
            username: tgUser.username || '',
            photo_url: tgUser.photo_url || '',
            language_code: tgUser.language_code || 'en',
            auth_date:
              tg.initDataUnsafe.auth_date ||
              Math.floor(Date.now() / 1000),
            hash: tg.initDataUnsafe.hash || '',
            initData
          };

          await login(telegramData);
          navigate('/dashboard');
        } catch (error) {
          console.error('Login failed:', error);
        }
      };

      document.body.appendChild(script);
    };

    const handleTestLogin = async () => {
      const testUser = {
        test_mode: true,
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        photo_url:
          'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=TU'
      };

      try {
        await login(testUser);
        navigate('/dashboard');
      } catch (error) {
        console.error('Test login failed:', error);
      }
    };

    // 🚀 ALWAYS run Telegram auth inside Mini Apps
    initTelegramAuth();
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkBlue-900 via-darkBlue-800 to-blue-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-white mt-4 text-lg">
          Connecting to Telegram...
        </p>
      </div>
    </div>
  );
}
