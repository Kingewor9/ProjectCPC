import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-obsidian text-content selection:bg-neon-cyan/20 selection:text-neon-cyan relative">
      <Header />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto w-full relative z-10 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
