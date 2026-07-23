/** One jewel-tone per specialty — the visual variety the "too monochrome"
 * feedback asked for, scoped to badges/accents only so the black+white+gold
 * brand chrome stays intact. Values are inline hex (not Tailwind classes) so
 * they always win regardless of the badge component's own variant styles.
 * Backgrounds are ~10% tints of the text color, WCAG-fine at badge sizes
 * since only the (darker) text carries the contrast requirement. */
export const SPECIALTY_COLORS: Record<string, { bg: string; text: string }> = {
  Tarot: { bg: "#F3E8FF", text: "#6D28D9" },
  Astrology: { bg: "#E0E7FF", text: "#4338CA" },
  Reiki: { bg: "#CCFBF1", text: "#0F766E" },
  "Human Design": { bg: "#FEF3C7", text: "#B45309" },
  "Spiritual Coaching": { bg: "#DBEAFE", text: "#0369A1" },
  Mediumship: { bg: "#FCE7F3", text: "#BE185D" },
  Meditation: { bg: "#D1FAE5", text: "#047857" },
  Numerology: { bg: "#FFEDD5", text: "#C2410C" },
  "Energy Healing": { bg: "#CFFAFE", text: "#0E7490" },
  Clairvoyance: { bg: "#FAE8FF", text: "#A21CAF" },
};

const FALLBACK = { bg: "#F5F5F5", text: "#525252" };

export function specialtyColor(name: string): { bg: string; text: string } {
  return SPECIALTY_COLORS[name] ?? FALLBACK;
}
