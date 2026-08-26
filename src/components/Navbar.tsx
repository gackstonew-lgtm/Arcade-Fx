import React, { useState, useEffect, useRef } from 'react';
import { Home, Menu, X, ArrowRight, Moon, Sun } from 'lucide-react';
import { siteConfig } from '../config/site';

interface NavbarProps {
  onOpenQuote: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenQuote, darkMode = false, onToggleDarkMode }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 720px)');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        burgerRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (
        mobileMenuOpen &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    desktopQuery.addEventListener('change', handleMediaChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      desktopQuery.removeEventListener('change', handleMediaChange);
    };
  }, [mobileMenuOpen]);

  return (
    <header
      ref={headerRef}
      className="sn-03 sticky top-4 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-300"
    >
      <div className="sn-03__sticky neu-glass rounded-full px-6 py-3.5 flex items-center justify-between shadow-soft-card">
        {/* Wordmark & Brand Icon */}
        <a href="#" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-9 h-9 rounded-full bg-arcade-persian text-arcade-platinum flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Home className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-ios-text">
            {siteConfig.name}
          </span>
        </a>

        {/* Desktop Navigation Links & Action */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#services"
            className="text-sm font-medium text-ios-muted hover:text-arcade-persian dark:hover:text-arcade-powder transition-colors"
          >
            Services
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-ios-muted hover:text-arcade-persian dark:hover:text-arcade-powder transition-colors"
          >
            How It Works
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-ios-muted hover:text-arcade-persian dark:hover:text-arcade-powder transition-colors"
          >
            About
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-ios-muted hover:text-arcade-persian dark:hover:text-arcade-powder transition-colors"
          >
            Contact
          </a>

          {/* Light/Dark Toggle */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-9 h-9 rounded-full neu-flat flex items-center justify-center text-ios-text hover:text-arcade-persian dark:hover:text-arcade-powder transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Tactile CTA Button */}
          <button
            onClick={onOpenQuote}
            className="bg-arcade-persian hover:bg-arcade-persian/90 text-arcade-platinum font-bold text-sm px-5 py-2.5 rounded-full transition-all shadow-md ios-btn active:scale-95 flex items-center gap-2 group"
          >
            <span>Get a quote</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </nav>

        {/* Mobile Actions: Hamburger + Theme Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-9 h-9 rounded-full neu-flat flex items-center justify-center text-ios-text"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            ref={burgerRef}
            id="sn-03-burger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full neu-flat text-ios-text focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="sn-03-drawer"
          className="md:hidden mt-3 neu-glass rounded-3xl p-6 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200"
        >
          <a
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-ios-text hover:text-[#1E3A5F] py-1"
          >
            Services
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-ios-text hover:text-[#1E3A5F] py-1"
          >
            How It Works
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-ios-text hover:text-[#1E3A5F] py-1"
          >
            About
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-ios-text hover:text-[#1E3A5F] py-1"
          >
            Contact
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenQuote();
            }}
            className="w-full bg-[#1E3A5F] dark:bg-[#294F7D] text-white neu-btn font-bold text-sm px-5 py-3 rounded-full transition-all flex items-center justify-center gap-2"
          >
            <span>Get a quote</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
