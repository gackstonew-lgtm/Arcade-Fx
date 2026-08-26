import React from 'react';
import { Star } from 'lucide-react';
import { siteConfig } from '../config/site';

const reviewsData = [
  {
    quote: `${siteConfig.name} found us a rate 0.4% lower than our bank's best offer. The process was completely stress-free and they handled everything.`,
    clientName: "James & Priya",
    mortgageType: "First-Time Buyers",
  },
  {
    quote: `As a self-employed business owner, high-street banks kept turning me down. ${siteConfig.name} presented my accounts correctly and got my offer approved in 4 days.`,
    clientName: "Robert Sterling",
    mortgageType: "Self-Employed Remortgage",
  },
  {
    quote: `Seamless experience moving from our 2-bed flat to a family house. Their whole-of-market comparison saved us over £280 a month on repayments.`,
    clientName: "Eleanor & Mark Davies",
    mortgageType: "Home Movers",
  },
];

export const Reviews: React.FC = () => {
  return (
    <section className="py-16 bg-white rounded-3xl my-6 border border-border/50 shadow-soft-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1261D6]">
            Verified Client Feedback
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#0F172A] tracking-tight">
            Trusted by Hundreds of Homeowners
          </h2>
          <p className="font-light text-base text-[#64748B] pt-1">
            Read how we've helped clients across the UK secure their ideal mortgage rates.
          </p>
        </div>

        {/* 3 Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviewsData.map((review, index) => (
            <div
              key={index}
              className="bg-[#F7F9FC] rounded-2xl p-7 border border-border/60 hover:shadow-soft-card transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* 5 Gold Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>

                {/* Italic Quote */}
                <blockquote className="font-light italic text-base text-[#0F172A] leading-relaxed">
                  "{review.quote}"
                </blockquote>
              </div>

              {/* Client Info in 10px Muted */}
              <div className="pt-6 mt-6 border-t border-border/40">
                <div className="font-bold text-sm text-[#0F172A]">
                  {review.clientName}
                </div>
                <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#64748B] mt-0.5">
                  {review.mortgageType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
