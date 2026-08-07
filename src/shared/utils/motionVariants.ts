import type { Variants } from "motion/react";

// Shared entrance-animation variants so timing stays consistent across pages
// that stagger a stack of sections and/or a grid of cards. See DiscoverPage.tsx
// for the original usage.

export const sectionContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const cardContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// Shared on-brand gradient palette for avatar-fallback initials, derived from a
// project's name so the same project always gets the same color.
const ON_BRAND_GRADIENTS = [
  "from-[#c9983a] to-[#a67c2e]",
  "from-[#d4af37] to-[#a67c2e]",
  "from-[#a67c2e] to-[#8b7355]",
  "from-[#8b6f3a] to-[#2d2820]",
  "from-[#c9983a] to-[#2d2820]",
  "from-[#a67c2e] to-[#2d2820]",
];

export function getOnBrandGradient(name: string): string {
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ON_BRAND_GRADIENTS[hash % ON_BRAND_GRADIENTS.length];
}
