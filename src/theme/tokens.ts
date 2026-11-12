// "Caderno de receitas": the whole app follows the recipe card — warm paper,
// deep green serif ink, a coloured stripe, brass eyelets and the orange lace
// of the Granjeando Talentos watering can. Tupinicode stays in the wordmark
// and in the small terminal-style labels.
import type { Meal } from "../domain/model";

export const colors = {
  /** Page background: soft sage paper. */
  bg: "#E9EEDC",
  /** Day columns and quiet insets. */
  bgAlt: "#F3F6EA",
  /** Cards, sheets' inner blocks, tab bar. */
  paper: "#FFFEFA",
  field: "#FFFFFF",
  line: "#DCE3CE",
  lineStrong: "#BFCBAC",
  ink: "#0E3526",
  inkSoft: "#4B6657",
  inkFaint: "#74897A",
  /** Primary actions and "done" states. */
  leaf: "#267A3B",
  leafSoft: "#DCEFD3",
  onLeaf: "#FFFEFA",
  orange: "#F28C28",
  orangeDeep: "#B5570A",
  orangeSoft: "#FDEBD3",
  brass: "#D9A93F",
  danger: "#B93A24",
  dangerSoft: "#FBE3DC",
  eaten: "#DCE9CF",
  overlay: "#0E352699",
  /** Tupinicode wordmark only. */
  neon: "#00A848",
};

/** Fill colours (stripes, chips). Text on them stays `ink`. */
export const mealColors: Record<Meal, string> = {
  cafe: "#FFB347",
  almoco: "#5DB56A",
  lanche: "#F2784B",
  janta: "#7FA6D9",
};

export const mealEmoji: Record<Meal, string> = {
  cafe: "☕",
  almoco: "🍛",
  lanche: "🥪",
  janta: "🌙",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const fonts = {
  body: "Inter",
  medium: "InterMedium",
  bold: "InterBold",
  mono: "JetBrainsMono",
  pixel: "Pixel",
  serif: "Fraunces",
};

/** The soft drop shadow every paper card shares. */
export const paperShadow = {
  shadowColor: "#36452A",
  shadowOpacity: 0.16,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
