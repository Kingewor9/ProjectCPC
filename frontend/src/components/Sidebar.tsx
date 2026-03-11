import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Send,
  Inbox,
  Zap,
  Settings,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Send Promo', href: '/send-request', icon: Send },
  { name: 'Requests', href: '/requests', icon: Inbox },
  { name: 'Campaigns', href: '/campaigns', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Partners', href: '/partners', icon: Settings },
];

const bottomNavigation = [
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile (md:flex) */}
      <aside className="hidden md:flex w-72 glass-panel !rounded-none !border-y-0 !border-l-0 border-r-surfaceBorder h-full flex-col z-20">
        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
          {navigation.map((item, i) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden ${
                  active
                    ? 'bg-neon-violet/10 text-white shadow-[0_0_15px_rgba(138,43,226,0.15)] border border-neon-violet/30'
                    : 'text-contentMuted hover:bg-surface hover:text-white border border-transparent hover:border-surfaceBorder'
                }`}
                style={{animationDelay: `${i * 50}ms`}}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-violet shadow-[0_0_10px_rgba(138,43,226,0.8)]"></div>
                )}
                <Icon size={22} className={`transition-colors duration-300 ${active ? 'text-neon-violet drop-shadow-[0_0_5px_rgba(138,43,226,0.5)]' : 'group-hover:text-white'}`} />
                <span className="font-medium tracking-wide font-sans">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="px-4 py-6 space-y-3 border-t border-surfaceBorder bg-black/20">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-surface text-white border border-surfaceBorder'
                    : 'text-contentMuted hover:bg-surface hover:text-white border border-transparent'
                }`}
              >
                <Icon size={20} className={active ? 'text-white' : 'group-hover:text-white transition-colors'} />
                <span className="font-medium text-sm tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation - Fixed at bottom, only visible on mobile */}
      <nav className="md:hidden glass-panel !rounded-none !border-b-0 !border-x-0 !border-t-surfaceBorder fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom pb-2">
        <div className="flex justify-around items-center px-1 py-1 h-16">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all h-full min-w-[3.5rem] ${
                  active
                    ? 'text-neon-violet'
                    : 'text-contentMuted hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neon-violet shadow-[0_0_8px_rgba(138,43,226,0.8)] rounded-b-full"></div>
                )}
                <Icon size={22} className={`mb-1 transition-transform ${active ? 'scale-110 drop-shadow-[0_0_5px_rgba(138,43,226,0.4)]' : ''}`} />
                <span className={`text-[10px] font-bold tracking-wider leading-none uppercase ${active ? 'opacity-100' : 'opacity-70'}`}>
                  {item.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}