// Sheets opened from the board: pick a recipe for a meal, and inspect or
// change a card that is already planned.
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MEALS,
  MEAL_LABEL,
  formatQty,
  type Collections,
  type Meal,
  type PlanEntry,
} from "../domain/model";
import { dayNumber, dowLabel, shortDate } from "../domain/dates";
import { missingFor } from "../domain/stock";
import { movePlan, removePlan, setEaten } from "../data/actions";
import { AppText, Button, Chip, Empty, Mono, Sheet } from "../components/ui";
import { colors, fonts, mealColors, mealEmoji, paperShadow, radius, space } from "../theme/tokens";

export function RecipePicker({
  slot,
  onClose,
  data,
  onPick,
  onCreate,
}: {
  slot: { date: string; meal: Meal } | null;
  onClose: () => void;
  data: Collections;
  onPick: (recipeId: string) => void;
  onCreate: (meal: Meal) => void;
}) {
  // Keep the last slot while the sheet animates out.
  const [last, setLast] = useState(slot);
  useEffect(() => {
    if (slot) setLast(slot);
  }, [slot]);
  const s = slot ?? last;
  if (!s) return null;
  const options = data.recipes.filter((r) => r.meals.includes(s.meal));
  const label = MEAL_LABEL[s.meal];
  return (
    <Sheet
      visible={!!slot}
      onClose={onClose}
      title={`${label} · ${dowLabel(s.date)} ${shortDate(s.date)}`}
      footer={
        <Button
          title={`Nova receita de ${label.toLowerCase()}`}
          icon="add"
          variant="secondary"
          onPress={() => onCreate(s.meal)}
        />
      }
    >
      {options.length === 0 ? (
        <Empty
          emoji={mealEmoji[s.meal]}
          title={`Nenhuma receita de ${label.toLowerCase()} ainda`}
          body="Crie uma receita marcada para esta refeição e ela aparece aqui para entrar no cardápio."
        />
      ) : (
        options.map((r) => {
          const missing = missingFor(r, data.stockById);
          return (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${r.name}`}
              onPress={() => onPick(r.id)}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>{r.name}</Text>
                <Mono
                  style={{ color: missing.length ? colors.orangeDeep : colors.inkSoft }}
                >
                  {missing.length
                    ? `falta ${missing
                        .map((x) => data.stockById[x.itemId]?.name ?? "item")
                        .join(", ")}`
                    : "estoque ok"}
                </Mono>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.leaf} />
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
}

export function EntrySheet({
  entry,
  onClose,
  data,
  weekDays,
}: {
  entry: PlanEntry | undefined;
  onClose: () => void;
  data: Collections;
  weekDays: string[];
}) {
  const [last, setLast] = useState(entry);
  useEffect(() => {
    if (entry) setLast(entry);
  }, [entry]);
  const e = entry ?? last;
  const recipe = e ? data.recipesById[e.recipeId] : undefined;
  if (!e || !recipe) return null;
  const move = (date: string, meal: Meal) =>
    movePlan(e.id, { date, meal, x: e.x, y: e.y });
  return (
    <Sheet
      visible={!!entry}
      onClose={onClose}
      title={`${recipe.emoji} ${recipe.name}`}
      footer={
        <>
          <Button
            title="Tirar do cardápio"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              removePlan(e.id);
              onClose();
            }}
          />
          <Button
            title={e.eaten ? "Desfazer comido" : "Marcar como comido"}
            icon={e.eaten ? "arrow-undo" : "checkmark-circle"}
            onPress={() => setEaten(e.id, !e.eaten)}
          />
        </>
      }
    >
      <View style={styles.meta}>
        <Chip label={`${mealEmoji[e.meal]} ${MEAL_LABEL[e.meal]}`} color={mealColors[e.meal]} selected />
        <Mono>{`${dowLabel(e.date)} ${shortDate(e.date)} · rende ${recipe.servings}`}</Mono>
      </View>
      {e.eaten ? (
        <AppText style={{ color: colors.leaf }}>
          Comido. Os ingredientes já saíram do estoque; desfazer devolve tudo.
        </AppText>
      ) : null}

      <View style={{ gap: 6 }}>
        <Mono>Ingredientes</Mono>
        {recipe.ingredients.length === 0 ? (
          <AppText style={{ color: colors.inkSoft }}>Sem ingredientes cadastrados.</AppText>
        ) : (
          recipe.ingredients.map((ing) => {
            const item = data.stockById[ing.itemId];
            const short = !e.eaten && (item?.qty ?? 0) < ing.qty;
            return (
              <View key={ing.itemId} style={styles.ing}>
                <AppText style={{ flex: 1 }}>{item?.name ?? "Item removido"}</AppText>
                <Mono style={{ color: colors.ink, fontSize: 12 }}>{formatQty(ing.qty, item?.unit)}</Mono>
                {e.eaten ? null : (
                  <Mono style={{ color: short ? colors.orangeDeep : colors.inkFaint, minWidth: 96, textAlign: "right" }}>
                    {short ? "só " : ""}tem {formatQty(item?.qty ?? 0, item?.unit)}
                  </Mono>
                )}
              </View>
            );
          })
        )}
      </View>

      {recipe.steps ? (
        <View style={styles.paper}>
          <Text style={styles.paperTitle}>Modo de preparo</Text>
          <Text style={styles.paperText}>{recipe.steps}</Text>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Mono>Mover para</Mono>
        <View style={styles.wrap}>
          {weekDays.map((d) => (
            <Chip
              key={d}
              label={`${dowLabel(d)} ${dayNumber(d)}`}
              selected={d === e.date}
              onPress={() => move(d, e.meal)}
            />
          ))}
        </View>
        <View style={styles.wrap}>
          {MEALS.filter((m) => recipe.meals.includes(m)).map((m) => (
            <Chip
              key={m}
              label={`${mealEmoji[m]} ${MEAL_LABEL[m]}`}
              color={mealColors[m]}
              selected={m === e.meal}
              onPress={() => move(e.date, m)}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    ...paperShadow,
  },
  optionName: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17 },
  meta: { flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" },
  ing: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  paper: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
    transform: [{ rotate: "-0.5deg" }],
    ...paperShadow,
  },
  paperTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17 },
  paperText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
});
