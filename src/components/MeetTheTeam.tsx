import React from 'react';
import { Award, Shield } from 'lucide-react';

const advisors = [
  {
    name: 'David Harrison',
    title: 'Senior Mortgage Specialist',
    chip: 'CeMAP Qualified',
    chipType: 'cemap',
    bio: 'Over 14 years advising first-time buyers and complex home movers across London and the South East.',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Sarah Jenkins',
    title: 'Buy-to-Let & Portfolio Lead',
    chip: 'FCA ARN: 849201',
    chipType: 'fca',
    bio: 'Specialist advisor for professional landlords, property investors, and commercial remortgage structuring.',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Marcus Vance',
    title: 'Self-Employed & High Net Worth',
    chip: 'CeMAP Qualified',
    chipType: 'cemap',
    bio: 'Expert at navigating complex director incomes, dividend structures, and retained profit calculations.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
  },
];

export const MeetTheTeam: React.FC = () => {
  return (
    <section className="py-16 neu-flat rounded-3xl my-6 border border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1E3A5F] dark:text-[#C9A55A]">
            Expert Advisory Team
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-ios-text tracking-tight">
            Your Advisors
          </h2>
          <p className="font-light text-base text-ios-muted pt-1">
            Fully qualified mortgage specialists dedicated to securing your ideal financial outcome.
          </p>
        </div>

        {/* 3 Advisor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {advisors.map((advisor, index) => (
            <div
              key={index}
              className="neu-flat rounded-2xl p-6 neu-btn flex flex-col items-center text-center space-y-4"
            >
              {/* Square Rounded Portrait */}
              <div className="w-full aspect-square rounded-2xl overflow-hidden relative shadow-sm">
                <img
                  src={advisor.image}
                  alt={advisor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Specialty Chip */}
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold neu-inset text-[#1E3A5F] dark:text-[#C9A55A]">
                  {advisor.chipType === 'cemap' ? <Award className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>{advisor.chip}</span>
                </span>
              </div>

              {/* Name & Title */}
              <div>
                <h3 className="font-bold text-xl text-ios-text">
                  {advisor.name}
                </h3>
                <div className="text-xs font-medium text-ios-muted mt-1">
                  {advisor.title}
                </div>
              </div>

              {/* Short Bio */}
              <p className="font-light text-sm text-ios-muted leading-relaxed pt-1">
                {advisor.bio}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
