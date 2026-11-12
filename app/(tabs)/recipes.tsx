import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MEALS, MEAL_LABEL, type Meal, type Recipe } from "../../src/domain/model";
import { missingFor } from "../../src/domain/stock";
import { useData } from "../../src/data/store";
import { RecipeEditor } from "../../src/features/RecipeEditor";
import { Button, Chip, Empty, Mono, Paper, Screen } from "../../src/components/ui";
import { colors, fonts, mealColors, mealEmoji, radius, space } from "../../src/theme/tokens";

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
      crumb={`${data.recipes.length} no caderno`}
      title="Receitas"
      actions={<Button title="Nova receita" icon="add" small onPress={() => edit()} />}
    >
      <View style={styles.filters}>
        <Chip label="Todas" selected={!filter} onPress={() => setFilter(null)} />
        {MEALS.map((m) => (
          <Chip
            key={m}
            label={`${mealEmoji[m]} ${MEAL_LABEL[m]}`}
            color={mealColors[m]}
            selected={filter === m}
            onPress={() => setFilter(filter === m ? null : m)}
          />
        ))}
      </View>

      {list.length === 0 ? (
        <Empty
          emoji="📖"
          title={filter ? `Nenhuma receita de ${MEAL_LABEL[filter].toLowerCase()}` : "Nenhuma receita ainda"}
          body="Monte uma receita com os ingredientes do estoque. O modo de preparo pode ser ditado por voz."
          action={<Button title="Criar receita" icon="add" onPress={() => edit()} />}
        />
      ) : (
        <View style={styles.grid}>
          {list.map((r, i) => {
            const missing = missingFor(r, data.stockById);
            return (
              <Paper
                key={r.id}
                accessibilityLabel={`Editar ${r.name}`}
                onPress={() => edit(r)}
                stripe={mealColors[r.meals[0] ?? "almoco"]}
                eyelet
                tilt={((i % 3) - 1) * 0.8}
                style={styles.card}
              >
                <View style={styles.cardHead}>
                  <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
                  <Text style={styles.name} numberOfLines={2}>
                    {r.name}
                  </Text>
                </View>
                <View style={styles.meals}>
                  {r.meals.map((m) => (
                    <View key={m} style={[styles.tag, { backgroundColor: `${mealColors[m]}44` }]}>
                      <Text style={styles.tagText}>{`${mealEmoji[m]} ${MEAL_LABEL[m]}`}</Text>
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
                    : "✓ dá para fazer hoje"}
                </Mono>
              </Paper>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  card: { flexGrow: 1, flexBasis: 260, maxWidth: 480 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 23 },
  meals: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
});
