import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onOpenFilter?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onOpenFilter }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearch) onSearch(val);
  };

  return (
    <div className="w-full px-5 py-2">
      <div className="flex items-center gap-3">
        {/* Recessed Inset Neumorphic Input Bar */}
        <div className="flex-1 relative flex items-center neu-inset rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-[#1E3A5F]/30 transition-all">
          <Search className="w-5 h-5 text-ios-muted shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search 90+ lenders, mortgage rates, AIP..."
            className="w-full bg-transparent text-sm font-medium text-ios-text placeholder-ios-muted focus:outline-none"
          />
        </div>

        {/* Tactile Neumorphic Filter Button */}
        <button
          onClick={onOpenFilter}
          className="w-12 h-12 rounded-2xl bg-[#1E3A5F] dark:bg-[#294F7D] text-white flex items-center justify-center neu-btn shadow-md shrink-0"
          aria-label="Filter settings"
        >
          <SlidersHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
};
