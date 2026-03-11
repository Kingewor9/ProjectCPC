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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32">
        <div className="mb-10 sm:mb-12 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Settings</h1>
          <p className="text-contentMuted text-lg font-sans">
            Manage your account preferences and notifications
          </p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-8 glass-panel border-neon-emerald/30 bg-neon-emerald/5 p-5 flex items-start gap-4 animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-neon-emerald/20 flex items-center justify-center shrink-0">
              <Check className="text-neon-emerald" size={16} />
            </div>
            <div>
              <p className="text-white font-bold mb-1">Preferences Updated</p>
              <p className="text-neon-emerald/80 text-sm font-sans">Settings saved successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 glass-panel border-red-500/30 bg-red-500/5 p-5 flex items-start gap-4 animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-red-500 font-bold">!</span>
            </div>
            <div>
              <p className="text-white font-bold mb-1">Error</p>
              <p className="text-red-400 text-sm font-sans">{error}</p>
            </div>
          </div>
        )}

        {/* Account Settings */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center relative group overflow-hidden">
               <div className="absolute inset-0 bg-neon-cyan/20 translate-y-[100%] group-hover:translate-y-0 transition-transform"></div>
               <Globe size={24} className="text-neon-cyan relative z-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Account</h2>
          </div>

          <div className="space-y-6">
            {/* Language Setting */}
            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none group-hover:bg-neon-cyan/10 transition-colors duration-1000"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-1">Language</h3>
                  <p className="text-contentMuted text-sm font-sans">
                    Choose your preferred language for the interface
                  </p>
                </div>
                {isSaving && (
                  <div className="w-8 h-8 relative">
                    <div className="absolute inset-0 border-2 border-neon-cyan/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-neon-cyan text-transparent rounded-full animate-spin border-t-transparent"></div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={isSaving}
                    className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                      selectedLanguage === lang.code
                        ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'border-surfaceBorder bg-surface/30 hover:border-contentMuted hover:bg-surface/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-heading font-bold mb-1 ${selectedLanguage === lang.code ? 'text-neon-cyan' : 'text-white'}`}>{lang.nativeName}</p>
                        <p className="text-contentMuted text-xs font-sans tracking-wider uppercase">{lang.name}</p>
                      </div>
                      {selectedLanguage === lang.code && (
                        <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                          <Check className="text-neon-cyan" size={14} />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Setting */}
            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-violet/5 rounded-full blur-3xl pointer-events-none group-hover:bg-neon-violet/10 transition-colors duration-1000"></div>
              
              <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                Theme
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                {[
                  { value: 'dark', label: 'Dark Neon', description: 'Current aesthetic' },
                  { value: 'light', label: 'Light', description: 'Coming soon' },
                  { value: 'auto', label: 'Auto', description: 'System default' }
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => handleThemeChange(theme.value)}
                    disabled={theme.value !== 'dark'}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      selectedTheme === theme.value
                        ? 'border-neon-violet bg-neon-violet/10 shadow-[0_0_15px_rgba(138,43,226,0.15)]'
                        : 'border-surfaceBorder bg-surface/30 hover:border-contentMuted hover:bg-surface/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <p className={`font-heading font-bold mb-1 ${selectedTheme === theme.value ? 'text-neon-violet' : 'text-white'}`}>{theme.label}</p>
                    <p className="text-contentMuted text-xs font-sans uppercase tracking-widest">{theme.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-neon-emerald/10 border border-neon-emerald/30 flex items-center justify-center relative group overflow-hidden">
               <div className="absolute inset-0 bg-neon-emerald/20 translate-y-[100%] group-hover:translate-y-0 transition-transform"></div>
               <Bell size={24} className="text-neon-emerald relative z-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'emailNotifications',
                label: 'Email Notifications',
                description: 'Receive important updates and alerts directly to your inbox.',
              },
              {
                key: 'pushNotifications',
                label: 'Push Notifications',
                description: 'Get real-time alerts on your device for immediate actions.',
              },
              {
                key: 'campaignUpdates',
                label: 'Campaign Updates',
                description: 'Stay updated when campaigns start, run, and complete successfully.',
              },
              {
                key: 'weeklyReport',
                label: 'Weekly Report',
                description: 'Receive a comprehensive summary of your performance metrics every week.',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="glass-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-contentMuted group"
              >
                <div className="flex-1 pr-4">
                  <p className="text-white font-heading font-bold text-lg mb-1">{item.label}</p>
                  <p className="text-contentMuted text-sm font-sans">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key as keyof typeof settings)}
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 cursor-pointer border-2 shadow-inner ${
                    settings[item.key as keyof typeof settings]
                      ? 'bg-neon-emerald/20 border-neon-emerald/50'
                      : 'bg-surface border-surfaceBorder'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center shadow-md ${
                      settings[item.key as keyof typeof settings]
                        ? 'translate-x-6 bg-neon-emerald shadow-[0_0_10px_rgba(0,255,157,0.5)]'
                        : 'translate-x-[2px] bg-contentMuted'
                    }`}
                  >
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center relative group overflow-hidden">
               <div className="absolute inset-0 bg-red-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform"></div>
               <Lock size={24} className="text-red-500 relative z-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Privacy & Security</h2>
          </div>

          <div className="space-y-4">
            <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 group-hover:bg-red-500/10"></div>
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-2">Data Privacy</h3>
                <p className="text-contentMuted text-sm font-sans">
                  Your data is protected with JWT tokens and bank-grade encryption algorithms. We maintain a strict policy of never sharing your informational assets with third-party entities without your explicit consensus.
                </p>
              </div>
              <a href="#" className="relative z-10 inline-flex items-center justify-center gap-2 bg-charcoal hover:bg-surface border border-surfaceBorder hover:border-red-500/50 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm tracking-widest uppercase shrink-0">
                Privacy Policy
              </a>
            </div>

            <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 group-hover:bg-red-500/10"></div>
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-2">Authentication Management</h3>
                <p className="text-contentMuted text-sm font-sans">
                  Your account is cryptographically secured directly through Telegram's robust authentication protocol. To modify your credentials or active sessions, please utilize your native Telegram application settings.
                </p>
              </div>
              <a 
                href="https://t.me/settings" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative z-10 inline-flex items-center justify-center gap-2 bg-charcoal hover:bg-surface border border-surfaceBorder hover:border-red-500/50 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm tracking-widest uppercase shrink-0"
              >
                Telegram Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}