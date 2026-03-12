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
    <header className="glass-panel !rounded-none !border-t-0 !border-x-0 !border-b-surfaceBorder sticky top-0 z-[100] h-16 transition-all duration-300 !overflow-visible">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 max-w-[2000px] mx-auto">
        <div className="flex justify-between items-center h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-charcoal border border-surfaceBorder overflow-hidden group-hover:border-neon-cyan/50 transition-colors shadow-glow-cyan">
              <div className="absolute inset-0 bg-neon-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img src="/logo.jpg" alt="CP Gram Logo" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; }} />
              <span className="font-heading font-bold text-lg text-white hidden relative z-10">GG</span>
            </div>
            <span className="text-xl font-heading font-bold font-heading text-white hidden sm:inline tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              CP Gram
            </span>
          </Link>

          {/* User Info and Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            {user && (
              <>
                {/* CPC Balance - Neon glowing button */}
                <button
                  onClick={() => navigate('/cp-coins')}
                  className="group relative flex items-center gap-3 bg-charcoal/50 border border-surfaceBorder hover:border-neon-cyan/50 px-3 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer overflow-hidden backdrop-blur-md"
                >
                   <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Wallet size={18} className="text-neon-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.5)] group-hover:scale-110 transition-transform" />
                  {/* Desktop view */}
                  <div className="hidden sm:block text-left">
                    <p className="text-[10px] uppercase tracking-wider text-contentMuted font-bold">CPC Balance</p>
                    <p className="text-sm font-mono font-bold text-white tracking-widest leading-tight">{user.cpcBalance.toLocaleString()}</p>
                  </div>
                  {/* Mobile view - just the number */}
                  <div className="sm:hidden">
                    <p className="text-sm font-mono font-bold text-white tracking-wider">{user.cpcBalance.toLocaleString()}</p>
                  </div>
                </button>

                {/* User Avatar with Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center gap-3 hover:bg-surface rounded-xl p-1.5 transition-colors border border-transparent hover:border-surfaceBorder"
                  >
                    <div className="flex items-center gap-3">
                      {/* Desktop user info */}
                      <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-white tracking-wide">{user.name || user.first_name}</p>
                        <p className="text-xs text-neon-cyan/80 font-mono">@{user.username}</p>
                      </div>
                      
                      {/* User avatar */}
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-neon-cyan/20 blur-md scale-110"></div>
                        {user.photo_url ? (
                          <img
                            src={user.photo_url}
                            alt={user.name}
                            className="relative w-10 h-10 rounded-full border border-neon-cyan object-cover"
                          />
                        ) : (
                          <div className="relative w-10 h-10 rounded-full bg-charcoal border border-neon-cyan flex items-center justify-center text-neon-cyan font-bold font-heading">
                            {(user.first_name || user.name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Dropdown chevron */}
                      <ChevronDown 
                        size={16} 
                        className={`text-contentMuted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Mobile Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute right-0 top-full mt-2 w-56 bg-surface backdrop-blur-xl border border-surfaceBorder rounded-2xl shadow-glass-panel py-2 z-[9999] animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                        {/* User Info in Dropdown */}
                        <div className="px-4 py-3 border-b border-surfaceBorder bg-charcoal/20">
                           <p className="text-sm font-bold text-white">{user.name || user.first_name}</p>
                           <p className="text-xs text-neon-cyan font-mono mt-1">@{user.username}</p>
                        </div>
                        {/* Settings */}
                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-contentMuted hover:bg-surface hover:text-white transition-colors group"
                        >
                          <Settings size={18} className="group-hover:text-neon-cyan transition-colors" />
                          <span className="font-medium">Settings</span>
                        </Link>

                        {/* Help */}
                        <Link
                          to="/help"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-contentMuted hover:bg-surface hover:text-white transition-colors group"
                        >
                          <HelpCircle size={18} className="group-hover:text-neon-cyan transition-colors" />
                          <span className="font-medium">Help</span>
                        </Link>

                        {/* Logout */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-contentMuted hover:bg-surface hover:text-neon-pink transition-colors border-t border-surfaceBorder mt-2 group"
                        >
                          <LogOut size={18} className="group-hover:text-neon-pink transition-colors" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>


              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}