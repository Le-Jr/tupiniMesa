import test from "node:test";
import assert from "node:assert/strict";
import { consume, restore, missingFor, shoppingList, isLow } from "../src/domain/stock.ts";
import { collect, parseQty, formatQty } from "../src/domain/model.ts";
import { weekStart, weekDays, addDays } from "../src/domain/dates.ts";

const item = (id, qty, extra = {}) => ({ id, kind: "stock", updatedAt: 1, name: id, unit: "g", qty, minQty: 0, place: "despensa", ...extra });
const recipe = (id, ingredients) => ({ id, kind: "recipe", updatedAt: 1, name: id, emoji: "x", meals: ["almoco"], servings: 1, ingredients, steps: "" });
const byId = (...items) => Object.fromEntries(items.map((i) => [i.id, i]));

test("consume takes ingredients and restore puts them back exactly", () => {
  const stock = byId(item("farinha", 500), item("ovos", 2));
  const bolo = recipe("bolo", [{ itemId: "farinha", qty: 300 }, { itemId: "ovos", qty: 3 }]);
  const { changed, consumed } = consume(bolo, stock);
  const after = byId(...changed);
  assert.equal(after.farinha.qty, 200);
  assert.equal(after.ovos.qty, 0, "never negative");
  assert.deepEqual(consumed, [{ itemId: "farinha", qty: 300 }, { itemId: "ovos", qty: 2 }]);
  const back = byId(...restore(consumed, after));
  assert.equal(back.farinha.qty, 500);
  assert.equal(back.ovos.qty, 2);
});

test("an ingredient listed twice draws from the running balance", () => {
  const { changed, consumed } = consume(
    recipe("r", [{ itemId: "a", qty: 60 }, { itemId: "a", qty: 60 }]),
    byId(item("a", 100)),
  );
  assert.equal(changed.length, 1);
  assert.equal(changed[0].qty, 0);
  assert.equal(consumed.reduce((s, c) => s + c.qty, 0), 100);
});

test("missingFor and shoppingList", () => {
  const stock = byId(item("a", 100), item("b", 0));
  const r = recipe("r", [{ itemId: "a", qty: 80 }, { itemId: "b", qty: 1 }, { itemId: "gone", qty: 2 }]);
  assert.deepEqual(missingFor(r, stock), [{ itemId: "b", qty: 1 }, { itemId: "gone", qty: 2 }]);
  const plan = (id, date, eaten = false) => ({ id, kind: "plan", updatedAt: 1, date, meal: "almoco", recipeId: "r", x: 0, y: 0, eaten });
  const list = shoppingList(
    [plan("1", "2026-11-11"), plan("2", "2026-11-12"), plan("3", "2026-11-12", true), plan("4", "2026-11-01")],
    { r }, stock, "2026-11-11",
  );
  const a = list.find((l) => l.itemId === "a");
  assert.equal(a.needed, 160, "two pending cards; eaten and past ones ignored");
  assert.equal(a.missing, 60);
});

test("isLow, collect, quantities, dates", () => {
  assert.equal(isLow(item("a", 0)), true);
  assert.equal(isLow(item("a", 5, { minQty: 10 })), true);
  assert.equal(isLow(item("a", 50, { minQty: 10 })), false);
  const c = collect({ a: item("a", 1), b: { ...item("b", 1), deleted: true } });
  assert.equal(c.stock.length, 1);
  assert.equal(parseQty("1,5"), 1.5);
  assert.ok(Number.isNaN(parseQty("abc")));
  assert.equal(formatQty(0.1 + 0.2, "kg"), "0,3 kg");
  assert.equal(weekStart("2026-11-11"), "2026-11-09");
  assert.equal(weekStart("2026-11-15"), "2026-11-09", "Sunday belongs to the week that started Monday");
  assert.equal(weekDays("2026-11-09")[6], "2026-11-15");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
