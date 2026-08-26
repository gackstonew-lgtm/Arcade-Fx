import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onOpenQuote: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenQuote }) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content (55%) */}
          <div className="w-full lg:w-[55%] space-y-6 text-left">
            {/* Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(215,52%,28%)]/10 text-[hsl(215,52%,28%)] border border-[hsl(215,52%,28%)]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase text-[10px] tracking-[0.12em]">
                Independent Mortgage Broker
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold text-[hsl(215,30%,12%)] leading-[1.08] tracking-tight whitespace-pre-line"
              style={{ fontSize: 'clamp(38px, 5vw, 70px)' }}
            >
              Your Mortgage,{"\n"}Made Simple.
            </h1>

            {/* Subtitle */}
            <p className="font-light text-base sm:text-lg text-[hsl(215,12%,52%)] leading-relaxed max-w-2xl">
              Access to over 90 lenders, whole-of-market advice, and a fee-free service — finding you the right deal in days, not weeks
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenQuote}
                className="bg-[hsl(215,52%,28%)] hover:bg-[hsl(215,52%,22%)] text-white font-semibold text-base px-7 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 group"
              >
                <span>Get a free quote</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 bg-transparent hover:bg-surface text-[hsl(215,52%,28%)] font-semibold text-base px-6 py-3.5 rounded-xl transition-colors border border-[hsl(215,52%,28%)]/20 hover:border-[hsl(215,52%,28%)]/40"
              >
                How it works
              </a>
            </div>

            {/* Trust Chips */}
            <div className="pt-6 border-t border-border/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-medium text-[hsl(215,30%,12%)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(215,52%,28%)]" />
                <span>CeMAP Qualified</span>
              </div>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(215,52%,28%)]" />
                <span>FCA Regulated</span>
              </div>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(215,52%,28%)]" />
                <span>Whole of Market</span>
              </div>
            </div>
          </div>

          {/* Right Large Image (45%, rounded-2xl) */}
          <div className="w-full lg:w-[45%]">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border group">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
                alt="Couple reviewing mortgage documents at kitchen table with warm natural light"
                className="w-full h-[400px] sm:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,30%,12%)]/40 via-transparent to-transparent"></div>
              
              {/* Badge overlay on image */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[hsl(215,30%,12%)]">Homeowner Milestone</div>
                  <div className="text-xs font-light text-[hsl(215,12%,52%)]">Whole-of-market search completed in hours</div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(42,60%,55%)]/20 text-[hsl(215,30%,12%)]">
                  ★ 4.9 Rating
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
