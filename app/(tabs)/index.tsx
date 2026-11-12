import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Meal } from "../../src/domain/model";
import { addDays, today, weekDays, weekLabel, weekStart } from "../../src/domain/dates";
import { addPlan } from "../../src/data/actions";
import { useData, useStore } from "../../src/data/store";
import { Board } from "../../src/board/Board";
import { spot } from "../../src/board/layout";
import { EntrySheet, RecipePicker } from "../../src/features/PlanSheets";
import { RecipeEditor } from "../../src/features/RecipeEditor";
import { IconButton, Mono, PixelTitle } from "../../src/components/ui";
import { colors, space } from "../../src/theme/tokens";

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const data = useData();
  const sync = useStore((s) => s.sync);
  const [start, setStart] = useState(() => weekStart(today()));
  const days = useMemo(() => weekDays(start), [start]);
  const [slot, setSlot] = useState<{ date: string; meal: Meal } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newMeal, setNewMeal] = useState<Meal | null>(null);

  const week = data.plan.filter((e) => days.includes(e.date));
  const eaten = week.filter((e) => e.eaten).length;
  const isThisWeek = start === weekStart(today());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
          <Mono style={{ color: colors.secondary }}>
            {`>_ ${data.home?.name ?? "TupiniMesa"} / ${sync === "local" ? "só neste aparelho" : sync === "offline" ? "offline" : "sincronizado"}`}
          </Mono>
          <PixelTitle>Cardápio</PixelTitle>
        </View>
        <View style={styles.nav}>
          <IconButton
            icon="chevron-back"
            label="Semana anterior"
            onPress={() => setStart((s) => addDays(s, -7))}
          />
          <View style={{ alignItems: "center", minWidth: 132 }}>
            <Mono style={{ color: colors.ivory }}>{weekLabel(start)}</Mono>
            <Mono>
              {week.length ? `${eaten}/${week.length} comidos` : "nada planejado"}
            </Mono>
          </View>
          <IconButton
            icon="chevron-forward"
            label="Próxima semana"
            onPress={() => setStart((s) => addDays(s, 7))}
          />
          {isThisWeek ? null : (
            <IconButton
              icon="today-outline"
              label="Voltar para esta semana"
              color={colors.accent}
              onPress={() => setStart(weekStart(today()))}
            />
          )}
        </View>
      </View>

      <Board
        start={start}
        data={data}
        onAdd={(date, meal) => setSlot({ date, meal })}
        onOpen={setOpenId}
      />

      <RecipePicker
        slot={slot}
        data={data}
        onClose={() => setSlot(null)}
        onPick={(recipeId) => {
          if (!slot) return;
          const n = data.plan.filter(
            (e) => e.date === slot.date && e.meal === slot.meal,
          ).length;
          const { fx, fy } = spot(n);
          addPlan(slot.date, slot.meal, recipeId, fx, fy);
          setSlot(null);
        }}
        onCreate={(meal) => {
          setSlot(null);
          setNewMeal(meal);
        }}
      />
      <EntrySheet
        entry={data.plan.find((e) => e.id === openId)}
        data={data}
        weekDays={days}
        onClose={() => setOpenId(null)}
      />
      <RecipeEditor
        visible={!!newMeal}
        presetMeal={newMeal ?? undefined}
        data={data}
        onClose={() => setNewMeal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  nav: { flexDirection: "row", alignItems: "center", gap: 2 },
});
