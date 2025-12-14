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
    <aside className="w-64 bg-darkBlue-800 border-r border-grey-700 min-h-screen flex flex-col">
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
  );
}
