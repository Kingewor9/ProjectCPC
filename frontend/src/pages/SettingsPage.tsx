import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Bell, Lock, Globe, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
];

export default function SettingsPage() {
  const { user, fetchUser } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    campaignUpdates: true,
    weeklyReport: true,
  });
  
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's current language preference
  useEffect(() => {
    if (user?.preferred_language) {
      setSelectedLanguage(user.preferred_language);
    } else if (user?.language_code) {
      // Fallback to Telegram language if available
      setSelectedLanguage(user.language_code);
    }
  }, [user]);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleLanguageChange = async (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const result = await apiService.updateUserSettings({
        preferred_language: languageCode
      });

      if (result.ok) {
        setSaveSuccess(true);
        // Refresh user data to get updated language
        await fetchUser();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Failed to save language preference');
      }
    } catch (err: any) {
      console.error('Error updating language:', err);
      setError(err.message || 'Failed to save language preference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    // TODO: Implement theme switching logic
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-grey-400 text-sm sm:text-base">
            Manage your account preferences and notifications
          </p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="text-green-400" size={20} />
            <p className="text-green-400 font-medium">Settings saved successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Account Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe size={24} className="text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Account</h2>
          </div>

          <div className="space-y-4">
            {/* Language Setting */}
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">Language</h3>
                  <p className="text-grey-400 text-xs sm:text-sm">
                    Choose your preferred language for the interface
                  </p>
                </div>
                {isSaving && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={isSaving}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedLanguage === lang.code
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-grey-600 bg-darkBlue-700 hover:border-grey-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{lang.nativeName}</p>
                        <p className="text-grey-400 text-xs">{lang.name}</p>
                      </div>
                      {selectedLanguage === lang.code && (
                        <Check className="text-blue-400" size={18} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Setting */}
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">Theme</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'dark', label: 'Dark', description: 'Current theme' },
                  { value: 'light', label: 'Light', description: 'Coming soon' },
                  { value: 'auto', label: 'Auto', description: 'System default' }
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => handleThemeChange(theme.value)}
                    disabled={theme.value !== 'dark'}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTheme === theme.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-grey-600 bg-darkBlue-700 hover:border-grey-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <p className="text-white font-medium mb-1">{theme.label}</p>
                    <p className="text-grey-400 text-xs">{theme.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={24} className="text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'emailNotifications',
                label: 'Email Notifications',
                description: 'Receive important updates via email',
              },
              {
                key: 'pushNotifications',
                label: 'Push Notifications',
                description: 'Get real-time alerts on your device',
              },
              {
                key: 'campaignUpdates',
                label: 'Campaign Updates',
                description: 'Notifications when campaigns start, run, and end',
              },
              {
                key: 'weeklyReport',
                label: 'Weekly Report',
                description: 'Receive a summary of your performance every week',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1 pr-4">
                  <p className="text-white font-medium text-sm sm:text-base">{item.label}</p>
                  <p className="text-grey-400 text-xs sm:text-sm">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key as keyof typeof settings)}
                  className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                    settings[item.key as keyof typeof settings]
                      ? 'bg-blue-600'
                      : 'bg-grey-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      settings[item.key as keyof typeof settings]
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={24} className="text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Privacy & Security</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">Data Privacy</h3>
              <p className="text-grey-400 text-sm mb-4">
                Your data is protected with JWT tokens and encryption. We never share your information
                without your explicit consent.
              </p>
              <a href="#" className="text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base">
                Read our Privacy Policy →
              </a>
            </div>

            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">Change Password</h3>
              <p className="text-grey-400 text-sm mb-4">
                Your account is secured through Telegram authentication. To change your password,
                update your Telegram account settings.
              </p>
              <a 
                href="https://t.me/settings" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base"
              >
                Go to Telegram Settings →
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}