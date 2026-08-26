import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';

interface CtaBannerProps {
  onOpenQuote: () => void;
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ onOpenQuote }) => {
  return (
    <section id="contact" className="my-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative bg-gradient-to-r from-[#1E3A5F] via-[#294F7D] to-[#0B1018] rounded-3xl p-8 sm:p-14 text-white text-center shadow-2xl overflow-hidden border border-white/20">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C9A55A]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#C9A55A] border border-[#C9A55A]/30">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase text-[10px] tracking-[0.12em]">
              No obligation borrowing assessment
            </span>
          </div>

          <h2 className="font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Find Out How Much You Could Borrow
          </h2>

          <p className="font-light text-base sm:text-xl text-white/90 leading-relaxed">
            Free consultation · No obligation · Whole market comparison in 24 hours
          </p>

          <div className="pt-4 flex justify-center">
            <button
              onClick={onOpenQuote}
              className="bg-white text-[#1E3A5F] hover:bg-white/95 font-bold text-base sm:text-lg px-8 py-4 rounded-2xl transition-all shadow-xl neu-btn flex items-center gap-3"
            >
              <span>Get a free quote</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="font-light text-xs sm:text-sm text-white/70 tracking-wide pt-2">
            FCA regulated · Fee-free · Available evenings and weekends
          </div>
        </div>
      </div>
    </section>
  );
};
