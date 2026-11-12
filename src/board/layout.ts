// Geometry of the week board. Pure functions, shared by rendering, drag &
// drop and tests. Card positions are stored as fractions of the free room
// inside a meal zone, so a layout made on a phone still makes sense on a
// desktop.
import { MEALS, type Meal } from "../domain/model.ts";

export interface Metrics {
  pad: number;
  gap: number;
  colW: number;
  headerH: number;
  zoneH: number;
  labelH: number;
  inset: number;
  cardW: number;
  cardH: number;
  width: number;
  height: number;
}

export function metrics(windowW: number): Metrics {
  const phone = windowW < 700;
  const pad = phone ? 12 : 20;
  const gap = phone ? 10 : 12;
  const colW = phone
    ? Math.min(windowW - 64, 300)
    : Math.max(210, Math.min(280, (windowW - pad * 2 - gap * 6) / 7));
  const headerH = 64;
  const zoneH = phone ? 156 : 186;
  return {
    pad,
    gap,
    colW,
    headerH,
    zoneH,
    labelH: 28,
    inset: 8,
    cardW: phone ? 158 : 166,
    cardH: 82,
    width: pad * 2 + colW * 7 + gap * 6,
    height: headerH + zoneH * MEALS.length + pad,
  };
}

export const colX = (m: Metrics, day: number) => m.pad + day * (m.colW + m.gap);
export const zoneY = (m: Metrics, meal: number) => m.headerH + meal * m.zoneH;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Top-left corner of a card, in board coordinates. */
export function cardXY(
  m: Metrics,
  day: number,
  meal: number,
  fx: number,
  fy: number,
): { x: number; y: number } {
  const roomX = m.colW - m.inset * 2 - m.cardW;
  const roomY = m.zoneH - m.labelH - m.inset - m.cardH;
  return {
    x: colX(m, day) + m.inset + clamp01(fx) * roomX,
    y: zoneY(m, meal) + m.labelH + clamp01(fy) * roomY,
  };
}

export interface Slot {
  day: number;
  meal: Meal;
  fx: number;
  fy: number;
}

/** Which day and meal a card's top-left corner lands in, judged by its centre. */
export function locate(m: Metrics, x: number, y: number): Slot | null {
  const cx = x + m.cardW / 2;
  const cy = y + m.cardH / 2;
  const day = Math.floor((cx - m.pad + m.gap / 2) / (m.colW + m.gap));
  const mealIndex = Math.floor((cy - m.headerH) / m.zoneH);
  const meal = MEALS[mealIndex];
  if (day < 0 || day > 6 || !meal) return null;
  const roomX = m.colW - m.inset * 2 - m.cardW;
  const roomY = m.zoneH - m.labelH - m.inset - m.cardH;
  return {
    day,
    meal,
    fx: clamp01((x - colX(m, day) - m.inset) / roomX),
    fy: clamp01((y - zoneY(m, mealIndex) - m.labelH) / roomY),
  };
}

/** A spot for the n-th card dropped into a zone by the "+" button. */
export function spot(n: number): { fx: number; fy: number } {
  const xs = [0.08, 0.92, 0.5, 0.25, 0.75];
  const ys = [0.1, 0.9, 0.5, 0.75, 0.25];
  return { fx: xs[n % xs.length] ?? 0.5, fy: ys[n % ys.length] ?? 0.5 };
}
