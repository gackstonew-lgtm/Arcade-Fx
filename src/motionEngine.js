/**
 * motionEngine.js — Arcade FX Premium Motion & Ambient Lighting System
 * High-performance, GPU-accelerated scroll-driven animations, progressive gauge arcs,
 * desktop cursor-following card spotlight, and ambient lighting response.
 * Applied across all application screens up to the landing page.
 */

export class MotionEngine {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.revealObserver = null;
    this.init();
  }

  init() {
    this.setupScrollReveals();
    this.setupGaugeAnimations();
    this.setupHoverDepth();
    this.setupScrollLighting();
    
    // Auto re-scan for dynamic elements (e.g. AJAX rendered cards)
    window.addEventListener('arcadefx:render', () => this.refresh());
  }

  refresh() {
    this.setupScrollReveals();
    this.setupHoverDepth();
  }

  setupScrollReveals() {
    if (this.isReducedMotion) return;

    if (!this.revealObserver) {
      const observerOptions = {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      };

      this.revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);
    }

    // Comprehensive element selectors across all views and landing page
    const selectors = [
      '.card',
      '.glass-card',
      '.glass-panel',
      '.market-overview-card',
      '.mi-card',
      '.crt-card',
      '.eq-card-split',
      '.account-risk-card',
      '.signal-card-v2',
      '.scan-header-bar',
      '.signals-control-bar',
      '.landing-terminal-frame',
      '.landing-feature-card',
      '.landing-pricing-card',
      '.landing-testimonial-card',
      '.landing-stat-card',
      '.floating-card',
      '.faq-item',
      '.cap-metric-card',
      '.account-metric-card',
      '.eq-sub-card',
      '.news-workspace',
      '.news-disclosure',
      '.methodology-card'
    ];

    document.querySelectorAll(selectors.join(', ')).forEach((el) => {
      if (!el.classList.contains('scroll-reveal')) {
        el.classList.add('scroll-reveal');
        const parentGrid = el.closest('.analysis-glass-grid, .cap-metrics-row, .account-metrics-row, .signals-grid-v2, .landing-features-grid, .landing-pricing-grid, .methodology-grid');
        if (parentGrid) {
          const siblingIndex = Array.from(parentGrid.children).indexOf(el);
          const delay = (siblingIndex % 4) * 80;
          el.setAttribute('data-reveal-delay', delay);
        }
      }
      this.revealObserver.observe(el);
    });
  }

  setupGaugeAnimations() {
    const gaugeObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fillArcs = entry.target.querySelectorAll('.strength-gauge-fill, .crt-arc-fill, .eq-ring-fill, .confidence-bar-fill');
          fillArcs.forEach(arc => {
            arc.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.mi-card, .crt-card, .eq-card-split, .signal-card-v2').forEach(card => {
      gaugeObserver.observe(card);
    });
  }

  setupHoverDepth() {
    if (this.isReducedMotion) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const cardsToGlow = document.querySelectorAll('.card, .glass-card, .market-overview-card, .mi-card, .crt-card, .eq-card-split, .account-risk-card, .signal-card-v2, .landing-terminal-frame, .landing-feature-card, .landing-pricing-card, .methodology-card');
    cardsToGlow.forEach(card => {
      if (!card.classList.contains('ambient-glow-wrapper')) {
        card.classList.add('ambient-glow-wrapper');
      }

      if (canHover && !card.dataset.spotlightBound) {
        card.dataset.spotlightBound = 'true';
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
        }, { passive: true });
      }
    });
  }

  setupScrollLighting() {
    if (this.isReducedMotion || window.innerWidth < 768) return;

    let ticking = false;
    const cards = document.querySelectorAll('.ambient-glow-wrapper');

    const updateLighting = () => {
      const viewportCenter = window.innerHeight / 2;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distanceFromCenter = Math.abs(viewportCenter - cardCenter);
        const maxDistance = window.innerHeight / 1.2;

        if (distanceFromCenter < maxDistance) {
          const intensity = 1 - (distanceFromCenter / maxDistance);
          card.style.setProperty('--ambient-intensity', intensity.toFixed(2));
        }
      });

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateLighting);
        ticking = true;
      }
    }, { passive: true });
  }
}
