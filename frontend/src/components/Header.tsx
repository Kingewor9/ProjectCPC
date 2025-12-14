import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-darkBlue-800 border-b border-grey-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white">
              <img 
                src="/logo.jpg" 
                alt="CP Gram Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to GG if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-blue-600 font-bold text-lg">GG</span>';
                }}
              />
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">CP Gram</span>
          </Link>

          {/* User Info and Actions */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                {/* CPC Balance - Now Clickable */}
                <button
                  onClick={() => navigate('/cp-coins')}
                  className="hidden sm:flex items-center gap-2 bg-darkBlue-700 hover:bg-darkBlue-600 px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  <Wallet size={18} className="text-blue-400" />
                  <div>
                    <p className="text-xs text-grey-400">CPC Balance</p>
                    <p className="text-lg font-bold text-white">{user.cpcBalance}</p>
                  </div>
                </button>

                {/* User Avatar */}
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-white">{user.name || user.first_name}</p>
                    <p className="text-xs text-grey-400">@{user.username}</p>
                  </div>
                  {user.photo_url ? (
                    <img
                      src={user.photo_url}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-blue-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {(user.first_name || user.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-darkBlue-700 rounded-lg transition-colors text-grey-400 hover:text-red-400"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}