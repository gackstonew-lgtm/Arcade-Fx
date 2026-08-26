import React from 'react';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionClick?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionText = 'See All',
  onActionClick,
}) => {
  return (
    <div className="w-full px-5 pt-6 pb-3 flex items-center justify-between">
      <h3 className="font-extrabold text-xl sm:text-2xl text-[#0F172A] tracking-tight">
        {title}
      </h3>

      {actionText && (
        <button
          onClick={onActionClick}
          className="text-sm font-semibold text-[#1261D6] hover:text-[#0B4FAF] transition-colors focus:outline-none"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
