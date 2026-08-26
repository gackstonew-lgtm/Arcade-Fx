import React from 'react';
import { Check } from 'lucide-react';
import { siteConfig } from '../config/site';

const checkPoints = [
  'Whole of market — 90+ lenders compared',
  'Completely fee-free advice',
  'CeMAP qualified advisors',
  'FCA regulated and fully insured',
];

export const WhyChooseUs: React.FC = () => {
  return (
    <section id="about" className="py-16 bg-white rounded-3xl my-6 border border-border/50 shadow-soft-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Text */}
          <div className="w-full lg:w-1/2 space-y-6">
            <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1261D6]">
              {siteConfig.whyChooseTitle}
            </div>
            
            <h2 className="font-extrabold text-3xl sm:text-4xl text-[#0F172A] tracking-tight leading-tight">
              We Work for You, Not the Lenders
            </h2>

            <div className="space-y-4 font-light text-base text-[#64748B] leading-relaxed">
              <p>
                Unlike single-bank advisors who can only offer products from their own institution, our whole-of-market access allows us to objectively analyze interest rates and lending criteria across 90+ banks and specialist lenders.
              </p>
              <p>
                Our comprehensive advice is completely fee-free to you — our remuneration comes directly from lenders upon completion, ensuring our recommendations are driven solely by your best financial interests.
              </p>
            </div>

            {/* Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {checkPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1261D6]/10 text-[#1261D6] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="font-medium text-sm text-[#0F172A]">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full lg:w-1/2">
            <div className="relative rounded-2xl overflow-hidden shadow-soft-card border border-border">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
                alt="Mortgage advisor consulting with clients in a professional office setting"
                className="w-full h-[400px] sm:h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/20 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
