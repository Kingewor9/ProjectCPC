import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TelegramAuth from './components/TelegramAuth';
import ProtectedRoute from './components/ProtectedRoute';

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


function App() {
  return (
    <BrowserRouter>
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
        {/* ... other routes */}
        
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;