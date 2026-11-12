import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MEALS,
  MEAL_LABEL,
  UNITS,
  UNIT_LABEL,
  formatQty,
  parseQty,
  type Collections,
  type Meal,
  type Recipe,
  type Unit,
} from "../domain/model";
import { deleteRecipe, saveRecipe, saveStock } from "../data/actions";
import { appendPhrase, useDictation } from "../services/voice";
import { AppText, Button, Chip, Field, IconButton, Mono, Sheet, toast } from "../components/ui";
import { colors, fonts, mealColors, mealIcons, radius, space } from "../theme/tokens";

const EMOJIS = ["🍲", "🍰", "🥖", "🥗", "🍝", "🍚", "🥘", "🍳", "🥪", "🍌", "☕", "🧃", "🍗", "🐟", "🥞", "🍕"];

interface Row {
  itemId: string;
  qty: string;
}

export function RecipeEditor({
  visible,
  onClose,
  recipe,
  presetMeal,
  data,
}: {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe;
  presetMeal?: Meal;
  data: Collections;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍲");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [servings, setServings] = useState("4");
  const [rows, setRows] = useState<Row[]>([]);
  const [steps, setSteps] = useState("");
  const [search, setSearch] = useState("");
  const [newUnit, setNewUnit] = useState<Unit>("g");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(recipe?.name ?? "");
    setEmoji(recipe?.emoji ?? "🍲");
    setMeals(recipe?.meals ?? (presetMeal ? [presetMeal] : []));
    setServings(String(recipe?.servings ?? 4));
    setRows(
      (recipe?.ingredients ?? []).map((i) => ({
        itemId: i.itemId,
        qty: formatQty(i.qty),
      })),
    );
    setSteps(recipe?.steps ?? "");
    setSearch("");
    setConfirmDelete(false);
  }, [visible, recipe, presetMeal]);

  const dictation = useDictation((phrase) =>
    setSteps((text) => appendPhrase(text, phrase)),
  );
  const { listening, stop } = dictation;
  useEffect(() => {
    if (!visible && listening) stop();
  }, [visible, listening, stop]);

  const query = search.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      data.stock
        .filter((s) => !rows.some((r) => r.itemId === s.id))
        .filter((s) => !query || s.name.toLowerCase().includes(query))
        .slice(0, 8),
    [data.stock, rows, query],
  );
  const exact = data.stock.some((s) => s.name.toLowerCase() === query);

  const addRow = (itemId: string) => {
    setRows((r) => [...r, { itemId, qty: "" }]);
    setSearch("");
  };
  const createItem = () => {
    const id = saveStock({
      name: search.trim(),
      unit: newUnit,
      qty: 0,
      minQty: 0,
      place: "despensa",
    });
    addRow(id);
    toast(`${search.trim()} foi criado no estoque com quantidade 0.`);
  };

  const problem = !name.trim()
    ? "Dê um nome à receita."
    : meals.length === 0
      ? "Escolha pelo menos uma refeição."
      : rows.some((r) => !(parseQty(r.qty) > 0))
        ? "Informe a quantidade de cada ingrediente."
        : "";

  const save = () => {
    if (problem) return;
    saveRecipe({
      id: recipe?.id,
      name,
      emoji,
      meals: MEALS.filter((m) => meals.includes(m)),
      servings: parseQty(servings) || 1,
      ingredients: rows.map((r) => ({ itemId: r.itemId, qty: parseQty(r.qty) })),
      steps,
    });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={recipe ? "Editar receita" : "Nova receita"}
      footer={
        <>
          {problem ? (
            <AppText style={styles.problem}>{problem}</AppText>
          ) : null}
          {recipe ? (
            <Button
              title={confirmDelete ? "Confirmar exclusão" : "Excluir"}
              variant="danger"
              icon="trash-outline"
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                deleteRecipe(recipe.id);
                onClose();
              }}
            />
          ) : null}
          <Button title="Salvar receita" icon="checkmark" disabled={!!problem} onPress={save} />
        </>
      }
    >
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Bolo de chocolate" />

      <View style={{ gap: 6 }}>
        <Mono>Ícone</Mono>
        <View style={styles.wrap}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={`Ícone ${e}`}
              accessibilityState={{ selected: emoji === e }}
              onPress={() => setEmoji(e)}
              style={[styles.emoji, emoji === e && styles.emojiOn]}
            >
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Mono>Refeições em que entra</Mono>
        <View style={styles.wrap}>
          {MEALS.map((m) => (
            <Chip
              key={m}
              label={MEAL_LABEL[m]}
              icon={mealIcons[m]}
              color={mealColors[m]}
              selected={meals.includes(m)}
              onPress={() =>
                setMeals((cur) =>
                  cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m],
                )
              }
            />
          ))}
        </View>
      </View>

      <View style={{ maxWidth: 160 }}>
        <Field
          label="Rende (porções)"
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Mono>Ingredientes (saem do estoque)</Mono>
        {rows.map((row, i) => {
          const item = data.stockById[row.itemId];
          return (
            <View key={row.itemId} style={styles.row}>
              <AppText style={{ flex: 1 }} numberOfLines={1}>
                {item?.name ?? "Item removido"}
              </AppText>
              <TextInput
                accessibilityLabel={`Quantidade de ${item?.name ?? "item"}`}
                value={row.qty}
                onChangeText={(qty) =>
                  setRows((r) => r.map((x, k) => (k === i ? { ...x, qty } : x)))
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.subtle}
                style={styles.qty}
              />
              <Mono style={{ width: 26 }}>{item ? UNIT_LABEL[item.unit] : ""}</Mono>
              <IconButton
                icon="close-circle-outline"
                label={`Tirar ${item?.name ?? "item"}`}
                color={colors.muted}
                onPress={() => setRows((r) => r.filter((_, k) => k !== i))}
              />
            </View>
          );
        })}
        <Field
          label="Adicionar ingrediente"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar no estoque ou digitar um novo"
        />
        <View style={styles.wrap}>
          {suggestions.map((s) => (
            <Chip key={s.id} label={s.name} icon="add" onPress={() => addRow(s.id)} />
          ))}
        </View>
        {query && !exact ? (
          <View style={styles.newItem}>
            <AppText style={{ color: colors.muted }}>
              “{search.trim()}” não está no estoque. Criar medido em:
            </AppText>
            <View style={styles.wrap}>
              {UNITS.map((u) => (
                <Chip
                  key={u}
                  label={UNIT_LABEL[u]}
                  selected={newUnit === u}
                  onPress={() => setNewUnit(u)}
                />
              ))}
              <Button title="Criar e adicionar" small variant="secondary" onPress={createItem} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.stepsHead}>
          <Mono style={{ flex: 1 }}>Modo de preparo</Mono>
          {dictation.supported ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? "Parar ditado" : "Ditar o modo de preparo"}
              onPress={listening ? dictation.stop : dictation.start}
              style={[styles.mic, listening && styles.micOn]}
            >
              <Ionicons
                name={listening ? "stop" : "mic"}
                size={16}
                color={listening ? colors.onPrimary : colors.accent}
              />
              <Text
                style={[styles.micText, listening && { color: colors.onPrimary }]}
              >
                {listening ? "Parar" : "Ditar"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Field
          label=""
          accessibilityLabel="Modo de preparo"
          value={steps}
          onChangeText={setSteps}
          multiline
          placeholder={"Misture os secos, junte os ovos e o leite…"}
        />
        {listening ? (
          <Mono style={{ color: colors.accent }} accessibilityLiveRegion="polite">
            {`● ouvindo… ${dictation.interim}`}
          </Mono>
        ) : null}
        {dictation.error ? (
          <AppText style={{ color: colors.danger }}>{dictation.error}</AppText>
        ) : null}
        {!dictation.supported ? (
          <AppText style={{ color: colors.subtle, fontSize: 13 }}>
            O ditado por voz não está disponível neste navegador ou nesta versão do app.
          </AppText>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" },
  emoji: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  emojiOn: { borderColor: colors.accent, backgroundColor: "#FFB34726" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingLeft: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  qty: {
    width: 76,
    minHeight: 40,
    textAlign: "right",
    color: colors.ivory,
    fontFamily: fonts.mono,
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineStrong,
    paddingHorizontal: 6,
  },
  newItem: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
  },
  stepsHead: { flexDirection: "row", alignItems: "center" },
  mic: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  micOn: { backgroundColor: colors.accent },
  micText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13 },
  problem: { color: colors.accent, fontSize: 13, flexGrow: 1, alignSelf: "center" },
});
