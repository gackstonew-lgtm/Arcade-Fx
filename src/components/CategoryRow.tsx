import React, { useState } from 'react';
import { KeyRound, RefreshCw, Building2, Briefcase, Home, ShieldAlert } from 'lucide-react';

interface CategoryRowProps {
  onSelectCategory?: (category: string) => void;
}

const categories = [
  { id: 'first-time', label: 'First-Time Buyer', icon: KeyRound },
  { id: 'remortgage', label: 'Remortgage', icon: RefreshCw },
  { id: 'buy-to-let', label: 'Buy-to-Let', icon: Building2 },
  { id: 'self-employed', label: 'Self-Employed', icon: Briefcase },
  { id: 'home-mover', label: 'Home Mover', icon: Home },
  { id: 'protection', label: 'Protection', icon: ShieldAlert },
];

export const CategoryRow: React.FC<CategoryRowProps> = ({ onSelectCategory }) => {
  const [activeId, setActiveId] = useState('first-time');

  const handleSelect = (id: string, label: string) => {
    setActiveId(id);
    if (onSelectCategory) onSelectCategory(label);
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-5 py-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id, cat.label)}
              className="flex flex-col items-center gap-2.5 shrink-0 group focus:outline-none neu-btn"
            >
              {/* Circular Icon Container */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1E3A5F] dark:bg-[#294F7D] text-white shadow-lg scale-105 ring-2 ring-[#C9A55A]'
                    : 'neu-flat text-ios-muted hover:text-[#1E3A5F] dark:hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Category Label */}
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#1E3A5F] dark:text-[#C9A55A] font-bold' : 'text-ios-muted'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
