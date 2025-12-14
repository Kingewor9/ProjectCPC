import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    // Redirect if already logged in
    if (user && localStorage.getItem('authToken')) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Telegram Web App
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();

        // Setup login button handler
        const loginButton = document.getElementById('telegram-login-btn');
        if (loginButton) {
          loginButton.onclick = () => {
            handleTelegramAuth();
          };
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleTelegramAuth = async () => {
    try {
      if (window.Telegram?.WebApp?.initData) {
        const tg = window.Telegram.WebApp;
        const userData = tg.initDataUnsafe?.user;

        if (userData) {
          const telegramData = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name || '',
            username: userData.username || '',
            photo_url: userData.photo_url || '',
            auth_date: Math.floor(Date.now() / 1000),
            hash: tg.initData || '',
          };

          await login(telegramData);
        }
      } else {
        // Fallback for testing without Telegram
        const testUser = {
          test_mode: true,
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          photo_url: 'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=TU',
        };
        await login(testUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkBlue-900 via-darkBlue-800 to-blue-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 overflow-hidden p-2">
            <img 
              src="/logo.jpg" 
              alt="CP Gram Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to GG if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.className = 'w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30';
                  parent.innerHTML = '<span class="text-4xl font-bold text-white">GG</span>';
                }
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">CP Gram</h1>
          <p className="text-grey-300 text-lg">Cross-Promotion Platform</p>
        </div>

        {/* Card */}
        <div className="bg-darkBlue-800 rounded-2xl border border-grey-700 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-grey-400">
              Sign in with your Telegram account to continue
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-3 bg-darkBlue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="text-white font-medium">Send Cross-Promotions</p>
                <p className="text-grey-400 text-sm">Share your content with partner channels</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="text-white font-medium">Manage Campaigns</p>
                <p className="text-grey-400 text-sm">Schedule and track your promotional content</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="text-white font-medium">Track Analytics</p>
                <p className="text-grey-400 text-sm">Monitor your growth and engagement</p>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button
            id="telegram-login-btn"
            onClick={handleTelegramAuth}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <LogIn size={20} />
            Login with Telegram
          </button>

          {/* Demo Button */}
          <button
            onClick={handleTelegramAuth}
            className="w-full bg-grey-700 hover:bg-grey-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Demo Login
          </button>

          {/* Info */}
          <p className="text-xs text-grey-400 text-center">
            Your data is secured with JWT tokens and never shared without consent.
          </p>
        </div>
      </div>
    </div>
  );
}