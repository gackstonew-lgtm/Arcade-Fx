/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          bg: "var(--bg-canvas)",
          surface: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          elevated: "var(--surface-elevated)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          navy: "var(--brand-navy)",
          gold: "var(--accent-gold)",
          success: "#20C997",
          warning: "#FFB020",
          danger: "#FF453A",
          divider: "var(--divider-subtle)",
        },
        phantom: {
          lightBg: "#F5F5F7",
          lightSurface: "#FFFFFF",
          lightSecondary: "#F0F0F3",
          lightText: "#111111",
          lightMuted: "#6B6B73",
          darkBg: "#08090B",
          darkSurface: "#111214",
          darkElevated: "#18191D",
          darkText: "#F5F5F7",
          darkMuted: "#989BA3",
          success: "#20C997",
          warning: "#FFB020",
          danger: "#FF453A",
        },
        brand: {
          navy: "#1E3A5F",
          darkNavy: "#0B1018",
          gold: "#C9A55A",
          soft: "#EAF3FF",
        },
        arcade: {
          persian: "var(--arcade-persian-blue)",
          platinum: "var(--arcade-platinum)",
          powder: "var(--arcade-powder-blue)",
          persianSoft: "var(--arcade-persian-blue-soft)",
          powderSoft: "var(--arcade-powder-blue-soft)",
        },
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
        '5xl': '32px',
        'pill': '50px',
      },
      fontFamily: {
        sans: [
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
      },
      transitionTimingFunction: {
        'ios-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

