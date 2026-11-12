import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MEALS, MEAL_LABEL, type Meal, type Recipe } from "../../src/domain/model";
import { missingFor } from "../../src/domain/stock";
import { useData } from "../../src/data/store";
import { RecipeEditor } from "../../src/features/RecipeEditor";
import { Button, Chip, Empty, Mono, Screen } from "../../src/components/ui";
import { colors, fonts, mealColors, mealIcons, radius, space } from "../../src/theme/tokens";

export default function RecipesScreen() {
  const data = useData();
  const [filter, setFilter] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<Recipe | undefined>();
  const [open, setOpen] = useState(false);
  const list = filter ? data.recipes.filter((r) => r.meals.includes(filter)) : data.recipes;

  const edit = (r?: Recipe) => {
    setEditing(r);
    setOpen(true);
  };

  return (
    <Screen
      crumb="RECEITAS"
      title="Receitas"
      actions={<Button title="Nova receita" icon="add" small onPress={() => edit()} />}
    >
      <View style={styles.filters}>
        <Chip label="Todas" selected={!filter} onPress={() => setFilter(null)} />
        {MEALS.map((m) => (
          <Chip
            key={m}
            label={MEAL_LABEL[m]}
            icon={mealIcons[m]}
            color={mealColors[m]}
            selected={filter === m}
            onPress={() => setFilter(filter === m ? null : m)}
          />
        ))}
      </View>

      {list.length === 0 ? (
        <Empty
          icon="book-outline"
          title={filter ? `Nenhuma receita de ${MEAL_LABEL[filter].toLowerCase()}` : "Nenhuma receita ainda"}
          body="Monte uma receita com os ingredientes do estoque. O modo de preparo pode ser ditado por voz."
          action={<Button title="Criar receita" icon="add" onPress={() => edit()} />}
        />
      ) : (
        <View style={styles.grid}>
          {list.map((r) => {
            const missing = missingFor(r, data.stockById);
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${r.name}`}
                onPress={() => edit(r)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.cardHead}>
                  <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
                  <Text style={styles.name} numberOfLines={2}>
                    {r.name}
                  </Text>
                </View>
                <View style={styles.meals}>
                  {r.meals.map((m) => (
                    <View key={m} style={[styles.tag, { backgroundColor: `${mealColors[m]}33` }]}>
                      <Text style={styles.tagText}>{MEAL_LABEL[m]}</Text>
                    </View>
                  ))}
                </View>
                <Mono style={{ color: colors.inkSoft }}>
                  {`${r.ingredients.length} ingrediente${r.ingredients.length === 1 ? "" : "s"} · rende ${r.servings}`}
                </Mono>
                <Mono style={{ color: missing.length ? colors.orangeDeep : colors.leaf }}>
                  {missing.length
                    ? `! falta ${missing
                        .map((x) => data.stockById[x.itemId]?.name ?? "item")
                        .join(", ")}`
                    : "dá para fazer hoje"}
                </Mono>
              </Pressable>
            );
          })}
        </View>
      )}

      <RecipeEditor
        visible={open}
        recipe={editing}
        data={data}
        onClose={() => setOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  card: {
    flexGrow: 1,
    flexBasis: 260,
    maxWidth: 480,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 23 },
  meals: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
});
