// Optional starter data, offered once during onboarding.
import type { Meal, Place, Unit } from "../domain/model";
import { addDays, today } from "../domain/dates";
import { addPlan, saveRecipe, saveStock } from "./actions";

export function seedExamples(): void {
  const item = (name: string, unit: Unit, qty: number, minQty: number, place: Place) =>
    saveStock({ name, unit, qty, minQty, place });

  const farinha = item("Farinha de trigo", "g", 1000, 300, "despensa");
  const acucar = item("Açúcar", "g", 800, 200, "despensa");
  const cacau = item("Chocolate em pó", "g", 150, 100, "despensa");
  const ovos = item("Ovos", "un", 10, 4, "geladeira");
  const leite = item("Leite", "ml", 1500, 500, "geladeira");
  const arroz = item("Arroz", "g", 2000, 500, "despensa");
  const feijao = item("Feijão", "g", 900, 300, "despensa");
  const frango = item("Peito de frango", "g", 600, 0, "freezer");
  const pao = item("Pão francês", "un", 6, 4, "despensa");
  const queijo = item("Queijo", "g", 250, 100, "geladeira");
  const banana = item("Banana", "un", 5, 3, "hortifruti");
  const aveia = item("Aveia", "g", 300, 100, "despensa");
  const macarrao = item("Macarrão", "g", 500, 0, "despensa");
  const tomate = item("Molho de tomate", "ml", 340, 0, "despensa");

  const recipe = (
    name: string,
    emoji: string,
    meals: Meal[],
    servings: number,
    ingredients: [string, number][],
    steps: string,
  ) =>
    saveRecipe({
      name,
      emoji,
      meals,
      servings,
      ingredients: ingredients.map(([itemId, qty]) => ({ itemId, qty })),
      steps,
    });

  const bolo = recipe(
    "Bolo de chocolate",
    "🍰",
    ["cafe", "lanche"],
    10,
    [
      [farinha, 300],
      [acucar, 250],
      [cacau, 120],
      [ovos, 3],
      [leite, 240],
    ],
    "Misture os secos. Junte os ovos e o leite e bata até ficar liso. Asse em forma untada a 180 °C por 40 minutos.",
  );
  const paoQueijo = recipe(
    "Pão na chapa com queijo",
    "🥖",
    ["cafe", "lanche"],
    2,
    [
      [pao, 2],
      [queijo, 60],
    ],
    "Abra os pães, recheie com queijo e doure na chapa dos dois lados.",
  );
  const arrozFeijao = recipe(
    "Arroz, feijão e frango grelhado",
    "🍲",
    ["almoco", "janta"],
    4,
    [
      [arroz, 300],
      [feijao, 250],
      [frango, 500],
    ],
    "Cozinhe o feijão na pressão. Refogue e cozinhe o arroz. Tempere o frango e grelhe até dourar.",
  );
  const mingau = recipe(
    "Mingau de aveia com banana",
    "🍌",
    ["cafe", "lanche"],
    2,
    [
      [aveia, 80],
      [leite, 400],
      [banana, 2],
    ],
    "Aqueça o leite com a aveia mexendo até engrossar. Sirva com a banana em rodelas.",
  );
  const massa = recipe(
    "Macarrão ao molho de tomate",
    "🍝",
    ["almoco", "janta"],
    4,
    [
      [macarrao, 500],
      [tomate, 680],
    ],
    "Cozinhe o macarrão al dente. Aqueça o molho, misture e sirva.",
  );

  const t = today();
  addPlan(t, "cafe", paoQueijo, 0.1, 0.2);
  addPlan(t, "almoco", arrozFeijao, 0.8, 0.5);
  addPlan(t, "lanche", bolo, 0.15, 0.6);
  addPlan(t, "janta", massa, 0.7, 0.3);
  addPlan(addDays(t, 1), "cafe", mingau, 0.6, 0.4);
  addPlan(addDays(t, 1), "almoco", massa, 0.2, 0.7);
}
