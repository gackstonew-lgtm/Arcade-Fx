import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface SegmentedFilterProps {
  onTabChange?: (tab: string) => void;
  onSortToggle?: () => void;
}

export const SegmentedFilter: React.FC<SegmentedFilterProps> = ({ onTabChange, onSortToggle }) => {
  const [activeTab, setActiveTab] = useState('Fixed Rates');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="w-full px-5 py-3 flex items-center justify-between gap-4">
      {/* Recessed Inset Track with Raised Active Tab */}
      <div className="inline-flex items-center p-1.5 neu-inset rounded-2xl border border-arcade-powder/20">
        {['Fixed Rates', 'Tracker', 'Whole Market'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ios-btn active:scale-95 ${
                isActive
                  ? 'bg-arcade-persian text-arcade-platinum shadow-md'
                  : 'text-ios-muted hover:text-arcade-persian dark:hover:text-arcade-powder'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Floating Tactile Sort Button */}
      <button
        onClick={onSortToggle}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl neu-flat text-ios-text text-xs font-semibold ios-btn active:scale-95 hover:text-arcade-persian dark:hover:text-arcade-powder border border-arcade-powder/30"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-arcade-persian dark:text-arcade-powder" />
        <span>Sort</span>
      </button>
    </div>
  );
};
