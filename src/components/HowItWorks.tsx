import React from 'react';
import { PhoneCall, Search, FileText, CheckCircle } from 'lucide-react';
import { siteConfig } from '../config/site';

const steps = [
  {
    number: '01',
    icon: PhoneCall,
    title: 'Free Consultation',
    description: 'We discuss your financial goals, examine budget constraints, and determine your exact borrowing power with zero commitment.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Whole Market Search',
    description: 'We scan over 90 lenders including exclusive broker-only rates to pinpoint the most cost-effective deal for your needs.',
  },
  {
    number: '03',
    icon: FileText,
    title: 'Mortgage Application',
    description: 'We compile all documentation, handle administrative paperwork, and submit directly to underwriters for fast decision in principle.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Completion',
    description: 'We liaise with solicitors, valuers, and lenders right up to final funds distribution and receiving your keys.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-16 bg-white rounded-3xl my-6 border border-border/50 shadow-soft-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1261D6]">
            Step-by-Step Guidance
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#0F172A] tracking-tight">
            {siteConfig.processTitle}
          </h2>
          <p className="font-light text-base text-[#64748B] pt-1">
            Transparent, efficient, and stress-free path to securing your ideal mortgage.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative bg-[#F7F9FC] rounded-2xl p-7 border border-border/60 hover:shadow-soft-card transition-shadow duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Large Faded Step Number (opacity 0.07) */}
                <span className="absolute top-2 right-4 text-7xl font-extrabold text-[#1261D6] select-none opacity-[0.07] pointer-events-none">
                  {step.number}
                </span>

                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1261D6] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-[#1261D6]/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-[#0F172A]">
                    {step.title}
                  </h3>
                  <p className="font-light text-sm text-[#64748B] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="relative z-10 pt-4 mt-6 border-t border-border/40 text-xs font-semibold text-[#1261D6] uppercase tracking-wider">
                  Step {index + 1} of 4
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
