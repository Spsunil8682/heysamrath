/**
 * Service descriptions shown on the home and services pages. Edit the wording here.
 *
 * Booking options (name, duration, whether a date is blocked) live in the database and are edited
 * in /admin/services. Keep each `slug` equal to the matching database service's slug so
 * "Request this service" preselects it on the booking form.
 */
export type ServiceInfo = {
  slug: string;
  name: string;
  summary: string;
  includes: string[];
  deliverables: string;
  /** Decorative cover image (local /media path), used when `posterOf` is not set or not found. */
  image: string;
  /** Use the poster of this local-library video (its slug in local-media.json) as the cover. */
  posterOf?: string;
};

export const services: ServiceInfo[] = [
  {
    slug: "wedding",
    name: "Wedding Function Reels",
    summary: "Cinematic and trending reels for every wedding function.",
    includes: [
      "Haldi ceremony",
      "Mataji / Mata Pujan",
      "Ganesh Pujan",
      "DJ Night",
      "Nighasi / Nikasi",
      "Baraat",
      "Reception",
      "Pheras (wedding rituals)",
    ],
    deliverables: "Highlight reels, cinematic shots, trending edits, and emotional moments.",
    image: "/media/images/cover-celebration.jpg",
    posterOf: "dj-night",
  },
  {
    slug: "couple-reels",
    name: "Couple & Pre-Wedding Reels",
    summary: "Romantic, cinematic, and trending reels for couples.",
    includes: ["Couple reels", "Pre-wedding reels", "Romantic transitions", "Save-the-date reels", "Anniversary reels"],
    deliverables: "Cinematic shots, music sync, color grading, and storytelling.",
    image: "/media/images/portrait-sunset.jpg",
    posterOf: "couple",
  },
  {
    slug: "model-reels",
    name: "Model & Fashion Reels",
    summary: "Stylish reels that highlight personality, outfits, and visual storytelling.",
    includes: ["Model portfolio reels", "Fashion reels", "Outfit transitions", "Makeup model reels", "Beauty and glamour reels"],
    deliverables: "Posing shots, cinematic movement, transitions, and polished edits.",
    image: "/media/images/portrait-stage.jpg",
    posterOf: "model-shoot",
  },
  {
    slug: "makeup-salon-reels",
    name: "Makeup Artist & Salon Reels",
    summary: "Attractive promotional content for makeup artists, salons, and beauty professionals.",
    includes: [
      "Bridal makeup reels",
      "Makeup transformation reels",
      "Before-and-after videos",
      "Makeup model reels",
      "Salon promotional reels",
    ],
    deliverables: "Transformation edits, detail shots, and social media-ready videos.",
    image: "/media/images/cover-temple.jpg",
    posterOf: "model-shoot",
  },
  {
    slug: "business-reels",
    name: "Shop & Business Promotion Reels",
    summary: "Help local businesses showcase their products, services, and brands.",
    includes: [
      "Shop promotion reels",
      "Clothing store reels",
      "Product showcase reels",
      "Cafe and restaurant reels",
      "Business launch promotions",
    ],
    deliverables: "Product close-ups, store walkthroughs, offers, and promotional edits.",
    image: "/media/images/portrait-gimbal.jpg",
  },
  {
    slug: "events",
    name: "Event & Festival Reels",
    summary: "Capture the energy, celebrations, and atmosphere of special events.",
    includes: [
      "Navratri and Garba reels",
      "DJ night reels",
      "Birthday reels",
      "Cultural event reels",
      "College and party events",
      "Celebration highlights",
    ],
    deliverables: "Fast-paced edits, crowd highlights, beat sync, and cinematic moments.",
    image: "/media/images/cover-stage.jpg",
    posterOf: "sawriya-seth",
  },
  {
    slug: "video-editing",
    name: "Professional Reels Editing",
    summary: "For customers who already have footage and only need editing.",
    includes: [
      "Wedding reels editing",
      "Trending Instagram reels",
      "Cinematic color grading",
      "Beat sync and transitions",
      "Slow-motion edits",
      "Social media shorts",
    ],
    deliverables: "Edited vertical videos ready for Instagram and other platforms.",
    image: "/media/images/cover-darshan.jpg",
  },
];
