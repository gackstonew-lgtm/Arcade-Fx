import React, { useState } from 'react';
import { X, CheckCircle, SlidersHorizontal } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters?: (filters: any) => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, onApplyFilters }) => {
  const [selectedType, setSelectedType] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState('Fixed Rate');

  if (!isOpen) return null;

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({ selectedType, selectedTerm });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Sheet / Drawer Container */}
      <div className="relative neu-glass w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-white/20 z-10 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Handlebar indicator for mobile sheet */}
        <div className="w-12 h-1.5 bg-ios-muted/40 rounded-full mx-auto sm:hidden mb-2"></div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2 text-ios-text font-extrabold text-lg">
            <SlidersHorizontal className="w-5 h-5 text-arcade-persian dark:text-arcade-powder" />
            <span>Filter Mortgage Options</span>
          </div>
          <button
            onClick={onClose}
            className="text-ios-muted hover:text-ios-text p-2 rounded-full neu-flat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Section 1: Mortgage Type */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-ios-muted">
            Mortgage Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['All', 'First-Time Buyer', 'Remortgage', 'Buy-to-Let', 'Self-Employed', 'Protection'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ios-btn active:scale-95 ${
                  selectedType === type
                    ? 'border-arcade-persian bg-arcade-persian text-arcade-platinum shadow-sm'
                    : 'neu-flat text-ios-text hover:border-arcade-powder'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section 2: Rate Type */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-ios-muted">
            Rate Structure
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Fixed Rate', 'Tracker', 'Discounted'].map((term) => (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ios-btn active:scale-95 ${
                  selectedTerm === term
                    ? 'border-arcade-persian bg-arcade-persian text-arcade-platinum shadow-sm'
                    : 'neu-flat text-ios-text hover:border-arcade-powder'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border/40 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl neu-flat text-ios-text font-semibold text-sm ios-btn active:scale-95 border border-arcade-powder/30"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="w-2/3 py-3 rounded-2xl bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum font-bold text-sm shadow-md ios-btn active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Apply Filters</span>
            <CheckCircle className="w-4 h-4 text-arcade-powder" />
          </button>
        </div>
      </div>
    </div>
  );
};
