// Tupinicode Design Guide v6 (dark jungle, neon terminal, pixel display)
// blended with Granjeando Talentos (ivory paper, deep serif green, the orange
// of the watering can). Chrome is Tupinicode; the things you touch and move
// — the recipe cards and the lace — are Granjeando.
import type { Meal } from "../domain/model";

export const colors = {
  // Tupinicode
  primary: "#00FF6A",
  secondary: "#00C653",
  forest: "#0D3B2E",
  background: "#071A14",
  accent: "#FFB347",
  ivory: "#F5F7EF",
  muted: "#A4B9AF",
  subtle: "#6F8A7D",
  line: "#1F4236",
  lineStrong: "#2E5E4C",
  danger: "#FFB4A9",
  surface: "#0C241C",
  surfaceRaised: "#113126",
  overlay: "#020A07E6",
  onPrimary: "#04140E",
  // Granjeando Talentos
  paper: "#F5F7EF",
  paperShade: "#E4E9D8",
  ink: "#0E3526",
  inkSoft: "#4B6657",
  leaf: "#3FA34D",
  leafLight: "#A6D36B",
  orange: "#F28C28",
  orangeDeep: "#C96510",
  brass: "#E9C46A",
};

export const mealColors: Record<Meal, string> = {
  cafe: "#FFB347",
  almoco: "#3FA34D",
  lanche: "#F2784B",
  janta: "#7FA6D9",
};

export const mealIcons = {
  cafe: "cafe",
  almoco: "restaurant",
  lanche: "pizza",
  janta: "moon",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };

export const fonts = {
  body: "Inter",
  medium: "InterMedium",
  bold: "InterBold",
  mono: "JetBrainsMono",
  pixel: "Pixel",
  serif: "Fraunces",
};
