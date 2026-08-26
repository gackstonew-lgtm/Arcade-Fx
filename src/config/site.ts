export const siteConfig = {
  name: "Arcade FX",
  shortName: "Arcade FX",
  domain: "arcadefx.live",
  browserTitle: "Arcade FX | Financial Services",
  tagline: "Independent Mortgage Broker & Financial Advisor",
  description: "Access to over 90 lenders, whole-of-market advice, and a fee-free service — finding you the right deal in days, not weeks",
  fcaNumber: "123456",
  legalDisclaimer: "Arcade FX is authorised and regulated by the Financial Conduct Authority. FCA No. 123456. Your home may be repossessed if you do not keep up repayments on your mortgage.",
  copyright: "© 2026 Arcade FX · London & Remote",
  processTitle: "The Arcade FX Process",
  whyChooseTitle: "Why Choose Arcade FX",
  contactEmail: "hello@arcadefx.live",
  contactPhone: "0800 123 4567",
  location: "London & Remote Nationwide",
} as const;

export type SiteConfig = typeof siteConfig;
