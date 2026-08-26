import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Calculator } from 'lucide-react';
import { siteConfig } from '../config/site';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [mortgageType, setMortgageType] = useState('First-Time Buyer');
  const [propertyValue, setPropertyValue] = useState<number>(350000);
  const [depositAmount, setDepositAmount] = useState<number>(50000);
  const [mortgageTerm, setMortgageTerm] = useState<number>(25);
  const [employmentStatus, setEmploymentStatus] = useState('Employed (Full-Time)');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const loanAmount = Math.max(0, propertyValue - depositAmount);
  const ltv = propertyValue > 0 ? Math.round((loanAmount / propertyValue) * 100) : 0;
  
  // Estimated monthly payment formula at ~4.2% interest
  const monthlyRate = 0.042 / 12;
  const numberOfPayments = mortgageTerm * 12;
  const estimatedMonthly = loanAmount > 0
    ? Math.round(
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
      )
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setStep(1);
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity"
        onClick={resetAndClose}
      ></div>

      {/* Slide-Up Sheet Container */}
      <div className="relative neu-glass rounded-t-[32px] sm:rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border-t sm:border border-white/20 z-10 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Mobile iOS Sheet Drag Handle */}
        <div className="w-9 h-1 bg-ios-muted/40 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-5 right-5 text-ios-muted hover:text-ios-text p-2 rounded-full neu-flat transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="mb-6 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-arcade-persian dark:text-arcade-powder bg-arcade-powder/20 dark:bg-arcade-persian/30 px-3 py-1 rounded-full border border-arcade-powder/40">
                <Calculator className="w-3.5 h-3.5" />
                <span>Instant Quote Calculator</span>
              </div>
              <h3 className="font-extrabold text-2xl text-ios-text">
                Get Your Custom Quote
              </h3>
              <p className="font-light text-xs sm:text-sm text-ios-muted">
                Whole-of-market search across 90+ lenders. Step {step} of 3
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full neu-inset h-2 rounded-full mb-6 overflow-hidden border border-arcade-powder/20">
              <div
                className="bg-arcade-persian h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>

            {/* Step 1: Mortgage Type */}
            {step === 1 && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-ios-text">
                  Select your mortgage objective:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'First-Time Buyer',
                    'Home Mover',
                    'Remortgage',
                    'Buy-to-Let',
                    'Self-Employed',
                    'Income Protection',
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMortgageType(type)}
                      className={`p-3.5 rounded-2xl text-left text-sm font-medium transition-all ios-btn active:scale-95 ${
                        mortgageType === type
                          ? 'border-2 border-arcade-persian bg-arcade-persian text-arcade-platinum font-bold shadow-md'
                          : 'neu-flat text-ios-text hover:border-arcade-powder'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum ios-btn active:scale-95 font-semibold text-sm px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md"
                  >
                    <span>Next step</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Property & Borrowing Amounts */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-ios-text mb-1">
                    <span>Estimated Property Value</span>
                    <span className="text-arcade-persian dark:text-arcade-powder font-bold financial-value tabular-nums">£{propertyValue.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="1500000"
                    step="10000"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    className="w-full accent-arcade-persian cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-ios-text mb-1">
                    <span>Deposit Available</span>
                    <span className="text-arcade-persian dark:text-arcade-powder font-bold financial-value tabular-nums">£{depositAmount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max={propertyValue}
                    step="5000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full accent-arcade-persian cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-ios-text mb-1">
                    <span>Mortgage Term</span>
                    <span className="text-arcade-persian dark:text-arcade-powder font-bold financial-value tabular-nums">{mortgageTerm} Years</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    step="1"
                    value={mortgageTerm}
                    onChange={(e) => setMortgageTerm(Number(e.target.value))}
                    className="w-full accent-arcade-persian cursor-pointer"
                  />
                </div>

                {/* Calculation Summary Box */}
                <div className="p-4 neu-inset rounded-2xl flex items-center justify-between border border-arcade-powder/20">
                  <div>
                    <div className="text-xs font-light text-ios-muted">Loan Amount ({ltv}% LTV)</div>
                    <div className="text-lg font-extrabold text-ios-text financial-value tabular-nums">£{loanAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-light text-ios-muted">Est. Monthly Payment</div>
                    <div className="text-xl font-extrabold text-arcade-persian dark:text-arcade-powder financial-value tabular-nums">~£{estimatedMonthly.toLocaleString()}/mo</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="neu-flat text-ios-text font-semibold text-sm px-4 py-2.5 rounded-2xl ios-btn active:scale-95 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum ios-btn active:scale-95 font-semibold text-sm px-6 py-2.5 rounded-2xl transition-all flex items-center gap-2 shadow-md"
                  >
                    <span>Final step</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Form */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ios-text mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 neu-inset rounded-2xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  >
                    <option value="Employed (Full-Time)">Employed (Full-Time)</option>
                    <option value="Self-Employed / Sole Trader">Self-Employed / Sole Trader</option>
                    <option value="Company Director">Company Director</option>
                    <option value="Contractor / Freelancer">Contractor / Freelancer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ios-text mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 neu-inset rounded-2xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ios-text mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 neu-inset rounded-2xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ios-text mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="07123 456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 neu-inset rounded-2xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-ios-muted font-light">
                  🔒 We respect your privacy. Fee-free service. No spam guaranteed.
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="neu-flat text-ios-text font-semibold text-sm px-4 py-2.5 rounded-2xl neu-btn flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum ios-btn active:scale-95 font-semibold text-sm px-7 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2"
                  >
                    <span>Request Free Consultation</span>
                    <CheckCircle className="w-4 h-4 text-arcade-powder" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Confirmation View */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full neu-flat text-arcade-persian dark:text-arcade-powder flex items-center justify-center mx-auto border border-arcade-powder/30">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-2xl text-ios-text">
              Consultation Requested!
            </h3>
            <p className="font-light text-sm text-ios-muted max-w-md mx-auto">
              Thank you, <span className="font-semibold text-ios-text">{fullName}</span>. One of our CeMAP qualified advisors at {siteConfig.name} will contact you within 24 hours to present your whole-of-market options.
            </p>
            <div className="pt-4">
              <button
                onClick={resetAndClose}
                className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum ios-btn active:scale-95 font-semibold text-sm px-8 py-3 rounded-2xl transition-all shadow-md"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
