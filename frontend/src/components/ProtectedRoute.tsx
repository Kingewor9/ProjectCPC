import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Still checking auth state on initial mount
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBlue-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
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
