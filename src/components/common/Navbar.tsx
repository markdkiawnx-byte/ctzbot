import React from 'react';
import { Home, Flame, Users, Trophy, User } from 'lucide-react';

export type TabType = 'home' | 'earn' | 'friends' | 'leaderboard' | 'profile';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'earn' as TabType, label: 'Earn', icon: Flame },
    { id: 'friends' as TabType, label: 'Friends', icon: Users },
    { id: 'leaderboard' as TabType, label: 'Ranking', icon: Trophy },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090c]/95 backdrop-blur-xl border-t border-red-950/40 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.7)]">
      <div className="max-w-md mx-auto grid grid-cols-5 py-2 px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 relative transition-all duration-200 group ${
                isActive ? 'text-red-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {/* Active neon highlight bar */}
              {isActive && (
                <div className="absolute -top-2 w-8 h-1 bg-red-600 rounded-full shadow-[0_0_10px_#ef4444]" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <div className="absolute inset-0 bg-red-500/20 blur-sm rounded-full pointer-events-none" />
                )}
              </div>

              <span className="text-[11px] font-display font-medium tracking-wide mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
