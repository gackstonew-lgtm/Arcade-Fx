import React from 'react';
import { Home } from 'lucide-react';
import { siteConfig } from '../config/site';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0F172A] text-white/80 pt-16 pb-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-white/10">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Home className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-2xl text-white tracking-tight">
                {siteConfig.name}
              </span>
            </div>
            <p className="font-light text-sm text-white/70 leading-relaxed max-w-sm">
              Whole-of-market independent mortgage broker and financial advisory. Delivering transparent, fee-free mortgage advice tailored to your goals.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 font-light text-sm text-white/70">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Mortgage Services
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  {siteConfig.processTitle}
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  {siteConfig.whyChooseTitle}
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Request Consultation
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & Location */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider">
              Contact & Support
            </h4>
            <div className="font-light text-sm text-white/70 space-y-2">
              <p>📍 {siteConfig.location}</p>
              <p>📞 {siteConfig.contactPhone} (Mon-Fri 8am-8pm)</p>
              <p>✉️ {siteConfig.contactEmail}</p>
            </div>
          </div>
        </div>

        {/* Regulatory Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col space-y-4">
          <p className="font-light text-[10px] text-white/50 leading-normal max-w-5xl">
            {siteConfig.legalDisclaimer}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-white/60 font-light pt-2 border-t border-white/5">
            <div>{siteConfig.copyright}</div>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>·</span>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <span>·</span>
              <a href="#" className="hover:text-white transition-colors">FCA Status</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
