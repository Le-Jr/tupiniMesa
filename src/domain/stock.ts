import type { Amount, PlanEntry, Recipe, StockItem } from "./model.ts";

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Ingredients a recipe lacks right now, given the stock. */
export function missingFor(
  recipe: Recipe,
  stockById: Record<string, StockItem>,
): Amount[] {
  const out: Amount[] = [];
  for (const ing of recipe.ingredients) {
    const have = stockById[ing.itemId]?.qty ?? 0;
    if (have < ing.qty) out.push({ itemId: ing.itemId, qty: round(ing.qty - have) });
  }
  return out;
}

export interface ShoppingLine {
  itemId: string;
  needed: number;
  have: number;
  missing: number;
}

/**
 * What the still-to-eat part of the plan needs in total, against the stock.
 * Only lines with something missing are returned.
 */
export function shoppingList(
  entries: PlanEntry[],
  recipesById: Record<string, Recipe>,
  stockById: Record<string, StockItem>,
  fromDate: string,
): ShoppingLine[] {
  const needed: Record<string, number> = {};
  for (const e of entries) {
    if (e.eaten || e.date < fromDate) continue;
    const recipe = recipesById[e.recipeId];
    if (!recipe) continue;
    for (const ing of recipe.ingredients)
      needed[ing.itemId] = (needed[ing.itemId] ?? 0) + ing.qty;
  }
  const lines: ShoppingLine[] = [];
  for (const [itemId, total] of Object.entries(needed)) {
    const have = stockById[itemId]?.qty ?? 0;
    if (total > have)
      lines.push({
        itemId,
        needed: round(total),
        have,
        missing: round(total - have),
      });
  }
  return lines;
}

/**
 * Takes a recipe's ingredients out of stock. Stock never goes negative: the
 * amount actually taken is returned so the operation can be undone exactly.
 */
export function consume(
  recipe: Recipe,
  stockById: Record<string, StockItem>,
): { changed: StockItem[]; consumed: Amount[] } {
  const changed: StockItem[] = [];
  const consumed: Amount[] = [];
  // Same item listed twice in a recipe must draw from the running balance.
  const balance: Record<string, StockItem> = {};
  for (const ing of recipe.ingredients) {
    const item = balance[ing.itemId] ?? stockById[ing.itemId];
    if (!item) continue;
    const take = Math.min(item.qty, ing.qty);
    if (take <= 0) continue;
    balance[item.id] = { ...item, qty: round(item.qty - take) };
    consumed.push({ itemId: item.id, qty: take });
  }
  changed.push(...Object.values(balance));
  return { changed, consumed };
}

/** Puts back what `consume` took. Items deleted meanwhile are skipped. */
export function restore(
  consumed: Amount[],
  stockById: Record<string, StockItem>,
): StockItem[] {
  const balance: Record<string, StockItem> = {};
  for (const c of consumed) {
    const item = balance[c.itemId] ?? stockById[c.itemId];
    if (!item) continue;
    balance[item.id] = { ...item, qty: round(item.qty + c.qty) };
  }
  return Object.values(balance);
}

export function isLow(item: StockItem): boolean {
  return item.minQty > 0 ? item.qty <= item.minQty : item.qty <= 0;
}
