import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Wallet, ChevronDown, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
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
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-blue-600 font-bold text-lg">GG</span>';
                }}
              />
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">CP Gram</span>
          </Link>

          {/* User Info and Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                {/* CPC Balance - Clickable, responsive sizing */}
                <button
                  onClick={() => navigate('/cp-coins')}
                  className="flex items-center gap-2 bg-darkBlue-700 hover:bg-darkBlue-600 px-2 sm:px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  <Wallet size={18} className="text-blue-400" />
                  {/* Desktop view */}
                  <div className="hidden sm:block">
                    <p className="text-xs text-grey-400">CPC Balance</p>
                    <p className="text-lg font-bold text-white">{user.cpcBalance}</p>
                  </div>
                  {/* Mobile view - just the number */}
                  <div className="sm:hidden">
                    <p className="text-sm font-bold text-white">{user.cpcBalance}</p>
                  </div>
                </button>

                {/* User Avatar with Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center gap-2 hover:bg-darkBlue-700 rounded-lg p-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {/* Desktop user info */}
                      <div className="text-right hidden lg:block">
                        <p className="text-sm font-medium text-white">{user.name || user.first_name}</p>
                        <p className="text-xs text-grey-400">@{user.username}</p>
                      </div>
                      
                      {/* User avatar */}
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
                      
                      {/* Dropdown chevron - only on mobile */}
                      <ChevronDown 
                        size={16} 
                        className={`text-grey-400 transition-transform md:hidden ${dropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Mobile Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40 md:hidden"
                        onClick={() => setDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute right-0 mt-2 w-56 bg-darkBlue-700 rounded-lg shadow-lg border border-grey-700 py-2 z-50 md:hidden">
                        {/* User Info in Dropdown */}
                        <div className="px-4 py-3 border-b border-grey-700">
                          <p className="text-sm font-medium text-white">{user.name || user.first_name}</p>
                          <p className="text-xs text-grey-400">@{user.username}</p>
                        </div>

                        {/* Settings */}
                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-grey-300 hover:bg-darkBlue-600 hover:text-white transition-colors"
                        >
                          <Settings size={18} />
                          <span className="font-medium">Settings</span>
                        </Link>

                        {/* Help */}
                        <Link
                          to="/help"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-grey-300 hover:bg-darkBlue-600 hover:text-white transition-colors"
                        >
                          <HelpCircle size={18} />
                          <span className="font-medium">Help</span>
                        </Link>

                        {/* Logout */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-grey-300 hover:bg-darkBlue-600 hover:text-red-400 transition-colors border-t border-grey-700 mt-2"
                        >
                          <LogOut size={18} />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop Logout Button - Hidden on mobile */}
                <button
                  onClick={handleLogout}
                  className="hidden md:block p-2 hover:bg-darkBlue-700 rounded-lg transition-colors text-grey-400 hover:text-red-400"
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