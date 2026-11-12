// What the screens are allowed to do to the data.
import { randomUUID } from "expo-crypto";
import type {
  Amount,
  Home,
  Meal,
  Place,
  PlanEntry,
  Recipe,
  StockItem,
  Unit,
} from "../domain/model";
import { collect } from "../domain/model";
import { consume, restore } from "../domain/stock";
import { getState, put, remove } from "./store";

const data = () => collect(getState().records);

export function saveHome(name: string, people: number): void {
  const current = data().home;
  const home: Home = {
    id: current?.id ?? randomUUID(),
    kind: "home",
    updatedAt: 0,
    name: name.trim() || "Minha casa",
    people: Math.max(1, Math.round(people) || 1),
  };
  put(home);
}

export interface StockInput {
  id?: string;
  name: string;
  unit: Unit;
  qty: number;
  minQty: number;
  place: Place;
}

export function saveStock(input: StockInput): string {
  const item: StockItem = {
    id: input.id ?? randomUUID(),
    kind: "stock",
    updatedAt: 0,
    name: input.name.trim(),
    unit: input.unit,
    qty: Math.max(0, input.qty),
    minQty: Math.max(0, input.minQty),
    place: input.place,
  };
  put(item);
  return item.id;
}

export function adjustStock(id: string, delta: number): void {
  const item = data().stockById[id];
  if (!item) return;
  put({ ...item, qty: Math.max(0, Math.round((item.qty + delta) * 1000) / 1000) });
}

export function deleteStock(id: string): void {
  remove(id);
}

export interface RecipeInput {
  id?: string;
  name: string;
  emoji: string;
  meals: Meal[];
  servings: number;
  ingredients: Amount[];
  steps: string;
}

export function saveRecipe(input: RecipeInput): string {
  const recipe: Recipe = {
    id: input.id ?? randomUUID(),
    kind: "recipe",
    updatedAt: 0,
    name: input.name.trim(),
    emoji: input.emoji,
    meals: input.meals,
    servings: Math.max(1, Math.round(input.servings) || 1),
    ingredients: input.ingredients.filter((i) => i.qty > 0),
    steps: input.steps.trim(),
  };
  put(recipe);
  return recipe.id;
}

/** Deletes a recipe and its cards that were not eaten yet. */
export function deleteRecipe(id: string): void {
  const pending = data()
    .plan.filter((e) => e.recipeId === id && !e.eaten)
    .map((e) => e.id);
  remove(id, ...pending);
}

export function addPlan(
  date: string,
  meal: Meal,
  recipeId: string,
  x: number,
  y: number,
): string {
  const entry: PlanEntry = {
    id: randomUUID(),
    kind: "plan",
    updatedAt: 0,
    date,
    meal,
    recipeId,
    x,
    y,
    eaten: false,
  };
  put(entry);
  return entry.id;
}

export function movePlan(
  id: string,
  to: { date: string; meal: Meal; x: number; y: number },
): void {
  const entry = data().plan.find((e) => e.id === id);
  if (!entry) return;
  put({ ...entry, ...to });
}

export function removePlan(id: string): void {
  const d = data();
  const entry = d.plan.find((e) => e.id === id);
  if (!entry) return;
  // Removing an eaten card gives its ingredients back.
  const back = entry.eaten && entry.consumed ? restore(entry.consumed, d.stockById) : [];
  put(...back);
  remove(id);
}

/** Marks a card eaten (taking ingredients from stock) or undoes it. */
export function setEaten(id: string, eaten: boolean): void {
  const d = data();
  const entry = d.plan.find((e) => e.id === id);
  if (!entry || entry.eaten === eaten) return;
  if (eaten) {
    const recipe = d.recipesById[entry.recipeId];
    const { changed, consumed } = recipe
      ? consume(recipe, d.stockById)
      : { changed: [], consumed: [] };
    put(...changed, { ...entry, eaten: true, eatenAt: Date.now(), consumed });
  } else {
    const back = restore(entry.consumed ?? [], d.stockById);
    put(...back, {
      ...entry,
      eaten: false,
      eatenAt: undefined,
      consumed: undefined,
    });
  }
}
