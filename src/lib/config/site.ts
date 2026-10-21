/**
 * Central brand configuration.
 *
 * Values here are build-time defaults. Contact details, hours, time zone and booking rules are edited
 * by the owner in /admin/settings (stored in Supabase) and take precedence at runtime.
 * Leave contact fields empty rather than inventing them — empty fields are simply not shown.
 */
export const siteConfig = {
  businessName: "Hey Samrath",
  tagline: "Turning real moments into cinematic memories",
  description:
    "Hey Samrath: cinematic reels and professional video editing for wedding functions, couples, models, Navratri and Garba, events and business promotions.",
  logo: null as string | null, // e.g. "/media/logos/logo.svg"
  locale: "en-IN",
  currency: "INR",
  timezone: "Asia/Kolkata",
  contact: {
    email: "",
    phone: "",
    whatsapp: "918529515706", // digits incl. country code
    address: "",
  },
  social: {} as Record<string, string>,
  images: {
    hero: "/media/images/hero-temple-gate.jpg",
    about: "/media/images/portrait-sunset.jpg",
    aboutSecondary: "/media/images/portrait-stage.jpg",
    ogImage: "/media/images/cover-temple.jpg",
  },
  /**
   * Home hero background: "videos" plays a crossfading showreel of short clips made by
   * `npm run media:import` (entries with "hero": true in local-media.json); "image" shows only
   * the still above. The still is always the fallback (reduced motion, data saver, autoplay blocked).
   */
  heroBackground: "videos" as "videos" | "image",
} as const;

export const navigation = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/availability", label: "Availability" },
  { href: "/contact", label: "Contact" },
] as const;

export const portfolioCategories = [
  { value: "weddings", label: "Weddings" },
  { value: "pre_wedding", label: "Pre-wedding films" },
  { value: "events", label: "Events" },
  { value: "commercial", label: "Commercial" },
  { value: "social_reels", label: "Social media reels" },
  { value: "video_editing", label: "Video editing" },
  { value: "photography", label: "Photography" },
] as const;

export const categoryLabel = (value: string) => portfolioCategories.find((c) => c.value === value)?.label ?? value;

export const budgetRanges = [
  "Under ₹25,000",
  "₹25,000 – ₹50,000",
  "₹50,000 – ₹1,00,000",
  "₹1,00,000 – ₹2,50,000",
  "Above ₹2,50,000",
  "Not sure yet",
] as const;

/**
 * Testimonials are only shown when real ones are added here (with the client's permission).
 * Never add invented reviews.
 */
export const testimonials: { quote: string; name: string; context?: string }[] = [];
