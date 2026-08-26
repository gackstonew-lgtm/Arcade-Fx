import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface PromoHeroCardProps {
  onOpenQuote: () => void;
}

export const PromoHeroCard: React.FC<PromoHeroCardProps> = ({ onOpenQuote }) => {
  return (
    <div className="w-full px-5 py-3">
      <div className="relative bg-gradient-to-r from-arcade-persian via-[#1261D6] to-ios-surface rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden border border-arcade-powder/30">
        {/* Subtle background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-arcade-powder/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left Content Area */}
          <div className="space-y-3.5 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-arcade-powder/20 backdrop-blur-md text-arcade-powder text-xs font-semibold border border-arcade-powder/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Fee-Free Advice</span>
            </div>

            <h2 className="font-extrabold text-2xl sm:text-3xl text-arcade-platinum tracking-tight leading-tight">
              Check Borrowing Power <span className="italic font-light opacity-95 text-arcade-powder">for Free</span>
            </h2>

            <p className="font-light text-xs sm:text-sm text-arcade-powder/90 leading-relaxed">
              Compare rates from over 90 lenders in under 60 seconds with zero obligation.
            </p>

            <div className="pt-2">
              <button
                onClick={onOpenQuote}
                className="bg-arcade-platinum hover:bg-white text-arcade-persian font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-md ios-btn active:scale-95 flex items-center gap-2 group"
              >
                <span>Get a free quote</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Visual Badge Area */}
          <div className="hidden sm:flex shrink-0 items-center justify-center relative">
            <div className="w-28 h-28 rounded-3xl bg-arcade-powder/10 backdrop-blur-md border border-arcade-powder/30 p-3 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="text-3xl mb-1">🏠</div>
              <div className="font-extrabold text-lg text-arcade-platinum">90+</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-arcade-powder">Lenders</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
