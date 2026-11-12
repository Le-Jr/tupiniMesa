// Shapes shared by every device. Each record carries `updatedAt` so two
// devices can settle on the newest copy, and `deleted` so a removal travels
// through sync instead of the record silently coming back.

export type Meal = "cafe" | "almoco" | "lanche" | "janta";
export const MEALS: readonly Meal[] = ["cafe", "almoco", "lanche", "janta"];
export const MEAL_LABEL: Record<Meal, string> = {
  cafe: "Café",
  almoco: "Almoço",
  lanche: "Lanche",
  janta: "Janta",
};

export type Unit = "g" | "kg" | "ml" | "l" | "un";
export const UNITS: readonly Unit[] = ["un", "g", "kg", "ml", "l"];
export const UNIT_LABEL: Record<Unit, string> = {
  un: "un",
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
};

export type Place = "despensa" | "geladeira" | "freezer" | "hortifruti";
export const PLACES: readonly Place[] = [
  "despensa",
  "geladeira",
  "freezer",
  "hortifruti",
];
export const PLACE_LABEL: Record<Place, string> = {
  despensa: "Despensa",
  geladeira: "Geladeira",
  freezer: "Freezer",
  hortifruti: "Hortifrúti",
};

interface Base {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

/** The residence itself. One per household. */
export interface Home extends Base {
  kind: "home";
  name: string;
  people: number;
}

export interface StockItem extends Base {
  kind: "stock";
  name: string;
  unit: Unit;
  qty: number;
  /** Below this the item is flagged as running low. 0 = no alert. */
  minQty: number;
  place: Place;
}

export interface Amount {
  itemId: string;
  qty: number;
}

export interface Recipe extends Base {
  kind: "recipe";
  name: string;
  emoji: string;
  /** Meals this recipe may be planned into. */
  meals: Meal[];
  servings: number;
  /** Quantities are in the stock item's own unit. */
  ingredients: Amount[];
  steps: string;
}

export interface PlanEntry extends Base {
  kind: "plan";
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  meal: Meal;
  recipeId: string;
  /** Free position inside the meal zone, 0..1 on each axis. */
  x: number;
  y: number;
  eaten: boolean;
  eatenAt?: number;
  /** What marking it eaten actually took from stock, so undo is exact. */
  consumed?: Amount[];
}

export type Rec = Home | StockItem | Recipe | PlanEntry;

export type Records = Record<string, Rec>;

export interface Collections {
  home: Home | undefined;
  stock: StockItem[];
  recipes: Recipe[];
  plan: PlanEntry[];
  stockById: Record<string, StockItem>;
  recipesById: Record<string, Recipe>;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "pt-BR");

/** Live (non-deleted) records split by kind. */
export function collect(records: Records): Collections {
  const out: Collections = {
    home: undefined,
    stock: [],
    recipes: [],
    plan: [],
    stockById: {},
    recipesById: {},
  };
  for (const r of Object.values(records)) {
    if (r.deleted) continue;
    if (r.kind === "home") {
      if (!out.home || r.updatedAt > out.home.updatedAt) out.home = r;
    } else if (r.kind === "stock") {
      out.stock.push(r);
      out.stockById[r.id] = r;
    } else if (r.kind === "recipe") {
      out.recipes.push(r);
      out.recipesById[r.id] = r;
    } else out.plan.push(r);
  }
  out.stock.sort(byName);
  out.recipes.sort(byName);
  return out;
}

/** 1.5 -> "1,5"; 2 -> "2"; trims float noise. */
export function formatQty(qty: number, unit?: Unit): string {
  const n = Math.round(qty * 100) / 100;
  const text = String(n).replace(".", ",");
  return unit ? `${text} ${UNIT_LABEL[unit]}` : text;
}

/** Accepts "1,5", "1.5", " 2 " — returns NaN for anything else. */
export function parseQty(text: string): number {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}
