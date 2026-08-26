import React, { useState } from 'react';
import { Heart, Scale, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FeaturedMortgageCardsProps {
  onOpenQuote: () => void;
}

const mortgageDeals = [
  {
    id: 1,
    badge: 'Exclusive Rate',
    lender: 'High Street Premier',
    rate: '3.89% Fixed',
    term: '5 Year Fixed Rate',
    fee: '£0 Product Fee',
    ltv: 'Up to 85% LTV',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    badge: 'Top Choice for 90% LTV',
    lender: 'National Mutual',
    rate: '4.15% Fixed',
    term: '2 Year Fixed Rate',
    fee: '£495 Cashback',
    ltv: 'Up to 90% LTV',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    badge: 'Self-Employed Special',
    lender: 'Specialist Capital',
    rate: '4.32% Fixed',
    term: '3 Year Fixed Rate',
    fee: 'Fee-Free Advice',
    ltv: 'Up to 80% LTV',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
];

export const FeaturedMortgageCards: React.FC<FeaturedMortgageCardsProps> = ({ onOpenQuote }) => {
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full px-5 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mortgageDeals.map((deal) => {
          const isFav = favorites[deal.id];
          return (
            <div
              key={deal.id}
              className="neu-flat rounded-3xl overflow-hidden flex flex-col justify-between group neu-btn"
            >
              {/* Media Header with Floating Glass Badges & Circular Action Buttons */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-ios-secondary">
                <img
                  src={deal.image}
                  alt={deal.lender}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                {/* Top-Left Floating Glass Status Badge */}
                <div className="absolute top-3 left-3 neu-glass text-ios-text text-[11px] font-semibold px-3 py-1 rounded-full border border-white/30">
                  {deal.badge}
                </div>

                {/* Top-Right Floating Circular Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <button
                    onClick={() => toggleFavorite(deal.id)}
                    className={`w-9 h-9 rounded-full neu-glass flex items-center justify-center transition-all ${
                      isFav
                        ? 'bg-red-500 text-white shadow-md'
                        : 'text-ios-text hover:text-red-500'
                    }`}
                    aria-label="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={onOpenQuote}
                    className="w-9 h-9 rounded-full neu-glass text-ios-text hover:text-[#1E3A5F] dark:hover:text-[#C9A55A] flex items-center justify-center transition-all"
                    aria-label="Compare"
                  >
                    <Scale className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Center Floating Pill Badge */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <button
                    onClick={onOpenQuote}
                    className="px-4 py-1.5 rounded-full bg-arcade-persian text-arcade-platinum font-bold text-xs shadow-md ios-btn active:scale-95 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-arcade-powder" />
                    <span>Compare Rates</span>
                  </button>
                </div>
              </div>

              {/* Card Body & Metadata */}
              <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ios-muted uppercase tracking-wider">
                      {deal.lender}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-arcade-persian dark:text-arcade-powder bg-arcade-powder/20 dark:bg-arcade-persian/30 px-2.5 py-0.5 rounded-full border border-arcade-powder/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {deal.ltv}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-2xl text-ios-text mt-1 tracking-tight financial-value tabular-nums">
                    {deal.rate}
                  </h4>
                  <p className="text-xs font-medium text-ios-muted mt-0.5">
                    {deal.term} · {deal.fee}
                  </p>
                </div>

                {/* Action Area */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <div className="text-[11px] font-light text-ios-muted">
                    Whole-of-market fee-free advice
                  </div>

                  <button
                    onClick={onOpenQuote}
                    className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum font-bold text-xs px-4 py-2.5 rounded-2xl ios-btn active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Check eligibility</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
