import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CategoryRow } from './components/CategoryRow';
import { PromoHeroCard } from './components/PromoHeroCard';
import { SegmentedFilter } from './components/SegmentedFilter';
import { SectionHeader } from './components/SectionHeader';
import { FeaturedMortgageCards } from './components/FeaturedMortgageCards';
import { FilterDrawer } from './components/FilterDrawer';
import { BottomNavigation } from './components/BottomNavigation';
import { TrustBar } from './components/TrustBar';
import { Services } from './components/Services';
import { HowItWorks } from './components/HowItWorks';
import { WhyChooseUs } from './components/WhyChooseUs';
import { MeetTheTeam } from './components/MeetTheTeam';
import { Reviews } from './components/Reviews';
import { FaqAccordion } from './components/FaqAccordion';
import { CtaBanner } from './components/CtaBanner';
import { Footer } from './components/Footer';
import { QuoteModal } from './components/QuoteModal';

export const App: React.FC = () => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleOpenQuoteModal = () => setIsQuoteModalOpen(true);
  const handleCloseQuoteModal = () => setIsQuoteModalOpen(false);

  const handleOpenFilterDrawer = () => setIsFilterDrawerOpen(true);
  const handleCloseFilterDrawer = () => setIsFilterDrawerOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-ios-bg text-ios-text selection:bg-[#1E3A5F] selection:text-white pb-20 md:pb-0 transition-colors duration-300">
      {/* 1. Desktop Navbar (hidden on mobile) */}
      <div className="hidden md:block">
        <Navbar
          onOpenQuote={handleOpenQuoteModal}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      </div>

      {/* 2. Mobile App Header (visible on mobile <768px) */}
      <div className="md:hidden">
        <Header onOpenQuote={handleOpenQuoteModal} />
      </div>

      {/* Main Responsive Body */}
      <main className="flex-grow max-w-7xl mx-auto w-full pt-2">
        {/* 3. Search Bar with Primary Blue Filter Action */}
        <SearchBar
          onSearch={(q) => setSearchQuery(q)}
          onOpenFilter={handleOpenFilterDrawer}
        />

        {/* 4. Horizontally Scrollable Category Selector */}
        <CategoryRow onSelectCategory={(cat) => console.log('Selected category:', cat)} />

        {/* 5. Promotional Hero Banner Card */}
        <PromoHeroCard onOpenQuote={handleOpenQuoteModal} />

        {/* 6. Segmented Filter Controls & Sort Pill */}
        <SegmentedFilter
          onTabChange={(tab) => console.log('Selected tab:', tab)}
          onSortToggle={handleOpenFilterDrawer}
        />

        {/* 7. Section Header & Featured Mortgage Deal Cards */}
        <SectionHeader
          title="Featured Mortgage Deals"
          actionText="See All"
          onActionClick={handleOpenQuoteModal}
        />
        <FeaturedMortgageCards onOpenQuote={handleOpenQuoteModal} />

        {/* 8. Trust Bar Statistics */}
        <div className="my-8">
          <TrustBar />
        </div>

        {/* 9. Additional Core Services */}
        <Services onOpenQuote={handleOpenQuoteModal} />

        {/* 10. Process: How It Works */}
        <HowItWorks />

        {/* 11. Why Choose Arcade FX */}
        <WhyChooseUs />

        {/* 12. Meet The Advisory Team */}
        <MeetTheTeam />

        {/* 13. Client Testimonials */}
        <Reviews />

        {/* 14. FAQ Accordion */}
        <FaqAccordion />

        {/* 15. CTA Banner */}
        <CtaBanner onOpenQuote={handleOpenQuoteModal} />
      </main>

      {/* 16. Footer */}
      <Footer />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNavigation onOpenQuote={handleOpenQuoteModal} />

      {/* Interactive Lead Calculator Quote Modal */}
      <QuoteModal isOpen={isQuoteModalOpen} onClose={handleCloseQuoteModal} />

      {/* Mobile Bottom Sheet Filter Drawer */}
      <FilterDrawer isOpen={isFilterDrawerOpen} onClose={handleCloseFilterDrawer} />
    </div>
  );
};

export default App;
