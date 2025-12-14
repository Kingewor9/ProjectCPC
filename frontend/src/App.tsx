import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiService from './services/api';

// Pages
import LoginPage from './pages/LoginPage';
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

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = apiService.getToken();
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-darkBlue-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-grey-700 border-t-blue-500 rounded-full animate-spin"></div>
    </div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/send-request"
          element={
            <ProtectedRoute>
              <SendRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <CampaignsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute>
              <PartnersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
         path="/add-channel"
         element={
         <ProtectedRoute>
          <AddChannelPage />
          </ProtectedRoute>
        } 
        />
        <Route 
         path="/admin/moderate-channels"
         element={
         <ProtectedRoute>
         <AdminModerateChannelsPage />
         </ProtectedRoute>
         } 
        />
        <Route 
        path="/cp-coins" 
        element={
        <ProtectedRoute>
        <CPCoinsPage />
        </ProtectedRoute>
        } 
        />

      {/* placeholder for buy coins page: */}
      <Route 
      path="/buy-coins" 
      element={
      <ProtectedRoute>
      <BuyCoinsPage />
      </ProtectedRoute>
      } 
      />
        {/* Redirect to dashboard on root */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
