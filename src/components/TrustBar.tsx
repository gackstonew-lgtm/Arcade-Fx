import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface StatItemProps {
  value: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4">
      <div className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight">
        {value}
      </div>
      <div className="text-white/80 font-light text-xs sm:text-sm mt-0.5">
        {label}
      </div>
    </div>
  );
};

export const TrustBar: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Simple count up effect on view
  const [lenders, setLenders] = useState(0);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 1500;
      const steps = 30;
      const stepTime = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        setLenders(Math.min(90, Math.floor((step / steps) * 90)));
        setAmount(Math.min(800, Math.floor((step / steps) * 800)));

        if (step >= steps) {
          clearInterval(timer);
        }
      }, stepTime);

      return () => clearInterval(timer);
    }
  }, [isInView]);

  return (
    <section ref={ref} className="bg-[#1e3a5f] w-full min-h-[72px] flex items-center py-4 sm:py-0 border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/20">
          <StatItem
            value={`${isInView ? lenders : 0}+`}
            label="Lenders"
          />
          <StatItem
            value={`£${isInView ? amount : 0}M+`}
            label="Arranged"
          />
          <StatItem
            value="4.9★"
            label="Google Reviews"
          />
          <StatItem
            value="Fee Free"
            label="Service"
          />
        </div>
      </div>
    </section>
  );
};
