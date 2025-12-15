import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Still checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBlue-900 text-white">
        Loading...
      </div>
    );
  }

  // Not authenticated → redirect to Telegram auth
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Authenticated → render page
  return <>{children}</>;
}
