import React from 'react';
import { KeyRound, Home, RefreshCw, Building2, Briefcase, ShieldAlert, ArrowRight } from 'lucide-react';

interface ServicesProps {
  onOpenQuote: () => void;
}

const servicesData = [
  {
    icon: KeyRound,
    title: 'First-Time Buyer',
    description: 'We handle everything, from Agreement in Principle (AIP) through to keys in hand and final completion.',
  },
  {
    icon: Home,
    title: 'Home Mover',
    description: 'Seamless transition to your next property with the best interest rate and structure for your new situation.',
  },
  {
    icon: RefreshCw,
    title: 'Remortgage',
    description: 'Save money and lower monthly payments when your existing fixed rate ends or to release equity.',
  },
  {
    icon: Building2,
    title: 'Buy-to-Let',
    description: 'Specialist landlord mortgages tailored for portfolio investors and first-time property landlords.',
  },
  {
    icon: Briefcase,
    title: 'Self-Employed',
    description: 'Complex income structure? We find specialist lenders who calculate affordability on actual earnings.',
  },
  {
    icon: ShieldAlert,
    title: 'Protection',
    description: 'Comprehensive financial security including life insurance, critical illness, and income protection.',
  },
];

export const Services: React.FC<ServicesProps> = ({ onOpenQuote }) => {
  return (
    <section id="services" className="py-16 neu-flat rounded-3xl my-6 border border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1E3A5F] dark:text-[#C9A55A]">
            Our Core Specialties
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-ios-text tracking-tight">
            How We Can Help
          </h2>
          <p className="font-light text-base text-ios-muted pt-1">
            Tailored whole-of-market advice to secure the ideal financial product for your exact circumstances.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesData.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="neu-flat rounded-2xl p-7 flex flex-col justify-between group neu-btn"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl neu-inset text-[#1E3A5F] dark:text-[#C9A55A] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-xl text-ios-text group-hover:text-[#1E3A5F] dark:group-hover:text-[#C9A55A] transition-colors">
                    {service.title}
                  </h3>
                  <p className="font-light text-sm text-ios-muted leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-border/40">
                  <button
                    onClick={onOpenQuote}
                    className="inline-flex items-center gap-2 font-semibold text-sm text-[#1E3A5F] dark:text-[#C9A55A] group-hover:translate-x-1 transition-transform"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
