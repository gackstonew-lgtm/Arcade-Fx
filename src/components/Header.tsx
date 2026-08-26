import React from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
import { siteConfig } from '../config/site';

interface HeaderProps {
  onOpenQuote: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuote }) => {
  return (
    <div className="w-full px-5 pt-4 pb-3 flex items-center justify-between">
      {/* Left: Avatar + Greeting */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded-full overflow-hidden p-0.5 neu-flat shrink-0">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Client Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-ios-muted">
            <span>Hello</span>
            <span className="text-sm">👋</span>
          </div>
          <h1 className="font-extrabold text-lg sm:text-xl text-ios-text leading-tight tracking-tight">
            {siteConfig.shortName} Client
          </h1>
        </div>
      </div>

      {/* Right: Notification Bell with Red Badge + Quick Quote Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenQuote}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full neu-flat text-[#1E3A5F] dark:text-[#C9A55A] font-semibold text-xs border border-[#1E3A5F]/20 hover:scale-105 transition-transform"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>FCA Regulated</span>
        </button>

        <button
          onClick={onOpenQuote}
          className="relative w-11 h-11 rounded-full neu-flat text-ios-text flex items-center justify-center neu-btn focus:outline-none"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#111925]"></span>
        </button>
      </div>
    </div>
  );
};
