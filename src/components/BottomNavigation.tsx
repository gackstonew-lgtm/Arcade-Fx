import React, { useState } from 'react';
import { Home, KeyRound, Layers, Users, Calculator } from 'lucide-react';

interface BottomNavigationProps {
  onOpenQuote: () => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home, href: '#' },
  { id: 'services', label: 'Services', icon: KeyRound, href: '#services' },
  { id: 'process', label: 'Process', icon: Layers, href: '#how-it-works' },
  { id: 'advisors', label: 'Advisors', icon: Users, href: '#about' },
  { id: 'quote', label: 'Quote', icon: Calculator, href: '#', isQuote: true },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenQuote }) => {
  const [activeTab, setActiveTab] = useState('home');

  const handleNavClick = (item: typeof navItems[0]) => {
    setActiveTab(item.id);
    if (item.isQuote) {
      onOpenQuote();
    }
  };

  return (
    <div className="md:hidden fixed bottom-3 left-4 right-4 z-40 neu-glass rounded-full shadow-2xl px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => {
                if (item.isQuote) e.preventDefault();
                handleNavClick(item);
              }}
              className="flex flex-col items-center justify-center py-1 px-3 relative group focus:outline-none neu-btn"
            >
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isActive
                    ? 'text-arcade-persian dark:text-arcade-powder scale-110'
                    : 'text-ios-muted group-hover:text-arcade-persian dark:group-hover:text-arcade-powder'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>

              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors ${
                  isActive ? 'text-arcade-persian dark:text-arcade-powder font-bold' : 'text-ios-muted'
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-arcade-persian dark:bg-arcade-powder absolute -bottom-0.5 shadow-sm"></span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
};
