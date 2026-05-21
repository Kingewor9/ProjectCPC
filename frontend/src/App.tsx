import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TelegramAuth from './components/TelegramAuth';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// Pages
//import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SendRequestPage from './pages/SendRequestPage';
import RequestsPage from './pages/RequestsPage';
import CampaignsPage from './pages/CampaignsPage';
import PartnersPage from './pages/PartnersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HelpPage from './pages/HelpPage';
import SettingsPage from './pages/SettingsPage';
import AddChannelPage from './pages/AddChannelPage';
import AdminModerateChannelsPage from './pages/AdminModerateChannelsPage';
import CPCoinsPage from './pages/CPCoinsPage';
import BuyCoinsPage from './pages/BuyCoinsPage';
import EditChannelPage from './pages/EditChannelPage';
import BroadcastMessagePage from './pages/BroadcastMessagePage';
import FolderCrossPromotionsPage from './pages/FolderCrossPromotionsPage';
import AdminFolderPromosPage from './pages/AdminFolderPromosPage';

// Language loader component
function AppContent() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Load user's saved language preference
  useEffect(() => {
    if (user?.preferred_language) {
      i18n.changeLanguage(user.preferred_language);
    }
  }, [user, i18n]);

  return (
    <Routes>
      {/* Root route auto-authenticates */}
      <Route path="/" element={<TelegramAuth />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/cp-coins" element={<ProtectedRoute><CPCoinsPage /></ProtectedRoute>} />
      <Route path="/send-request" element={<ProtectedRoute><SendRequestPage /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
      <Route path="/partners" element={<ProtectedRoute><PartnersPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin/moderate-channels" element={<ProtectedRoute><AdminModerateChannelsPage /></ProtectedRoute>} />
      <Route path="/buy-coins" element={<ProtectedRoute><BuyCoinsPage /></ProtectedRoute>} />
      <Route path="/edit-channel/:channelId" element={<ProtectedRoute><EditChannelPage /></ProtectedRoute>} />
      <Route path="/add-channel" element={<ProtectedRoute><AddChannelPage /></ProtectedRoute>} />
      <Route path="/admin/broadcast" element={<BroadcastMessagePage />} />
      <Route path="/folder-promotions" element={<ProtectedRoute><FolderCrossPromotionsPage /></ProtectedRoute>} />
      <Route path="/admin/folder-promotions" element={<ProtectedRoute><AdminFolderPromosPage /></ProtectedRoute>} />
      {/* ... other routes */}
      
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;