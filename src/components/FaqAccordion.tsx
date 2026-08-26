import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { siteConfig } from '../config/site';

const faqs = [
  {
    question: "How long does the mortgage process take?",
    answer: "On average, getting an Agreement in Principle (AIP) takes less than 24 hours. Full mortgage application approval typically takes between 2 to 4 weeks, depending on lender underwriting backlogs and property valuation speed.",
  },
  {
    question: "Do I need a big deposit to get a mortgage?",
    answer: "Not necessarily. Deposits start from as little as 5% of the purchase price (95% Loan-to-Value). However, putting down a larger deposit (such as 10%, 15%, or 25%) unlocks significantly lower interest rates and reduced monthly repayments.",
  },
  {
    question: "Can I get a mortgage if I'm self-employed?",
    answer: "Yes, absolutely! We specialize in self-employed mortgages. Most lenders typically ask for 2 years of SA302 tax calculations and account overviews, but we work with lenders who accept just 1 year of trading history or evaluate income based on day rates for contractors.",
  },
  {
    question: "What documents will I need?",
    answer: "You will generally need: proof of ID (Passport/Driving Licence), proof of address (utility bill or council tax statement), 3 months of bank statements, 3 months of payslips (or SA302s if self-employed), and proof of deposit.",
  },
];

export const FaqAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-white rounded-3xl my-6 border border-border/50 shadow-soft-card">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-3">
          <div className="font-semibold uppercase text-[10px] tracking-[0.12em] text-[#1261D6]">
            Answers & Information
          </div>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#0F172A] tracking-tight">
            Common Questions
          </h2>
          <p className="font-light text-base text-[#64748B] pt-1">
            Everything you need to know about getting a mortgage with {siteConfig.name}.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-border border-l-4 border-l-[#1261D6] bg-[#F7F9FC] shadow-soft-card'
                    : 'border-border bg-white hover:border-border/80'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-base sm:text-lg text-[#0F172A]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#1261D6] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base font-light text-[#64748B] leading-relaxed border-t border-border/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
