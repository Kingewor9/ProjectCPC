import Layout from '../components/Layout';
import { Bell, Lock, Globe } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    campaignUpdates: true,
    weeklyReport: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-grey-400">Manage your account preferences and notifications</p>
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Notifications</h2>
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
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-grey-400 text-sm">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key as keyof typeof settings)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
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
            <h2 className="text-2xl font-bold text-white">Privacy & Security</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Data Privacy</h3>
              <p className="text-grey-400 mb-4">
                Your data is protected with JWT tokens and encryption. We never share your information
                without your explicit consent.
              </p>
              <a href="#" className="text-blue-400 hover:text-blue-300 font-medium">
                Read our Privacy Policy →
              </a>
            </div>

            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
              <p className="text-grey-400 mb-4">
                Your account is secured through Telegram authentication. To change your password,
                update your Telegram account settings.
              </p>
              <a href="https://t.me/settings" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">
                Go to Telegram Settings →
              </a>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Globe size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Account</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Language</h3>
              <select className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>

            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Theme</h3>
              <select className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                <option>Dark (Current)</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
