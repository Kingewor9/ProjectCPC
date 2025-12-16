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
      <aside className="hidden md:flex w-64 bg-darkBlue-800 border-r border-grey-700 min-h-screen flex-col">
        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-grey-300 hover:bg-darkBlue-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="px-4 py-4 space-y-2 border-t border-grey-700">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-grey-400 hover:bg-darkBlue-700 hover:text-grey-200'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation - Fixed at bottom, only visible on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-darkBlue-800 border-t border-grey-700 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-grey-400 active:bg-darkBlue-700'
                }`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
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