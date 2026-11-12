import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  PLACES,
  PLACE_LABEL,
  formatQty,
  type StockItem,
  type Unit,
} from "../../src/domain/model";
import { today } from "../../src/domain/dates";
import { isLow, shoppingList } from "../../src/domain/stock";
import { adjustStock } from "../../src/data/actions";
import { useData } from "../../src/data/store";
import { StockEditor } from "../../src/features/StockEditor";
import { AppText, Button, Empty, IconButton, Mono, Screen } from "../../src/components/ui";
import { colors, fonts, radius, space } from "../../src/theme/tokens";

const STEP: Record<Unit, number> = { un: 1, g: 50, kg: 0.25, ml: 100, l: 0.25 };

export default function StockScreen() {
  const data = useData();
  const [editing, setEditing] = useState<StockItem | undefined>();
  const [open, setOpen] = useState(false);

  const shopping = useMemo(
    () => shoppingList(data.plan, data.recipesById, data.stockById, today()),
    [data],
  );
  const usedIn = editing
    ? data.recipes
        .filter((r) => r.ingredients.some((i) => i.itemId === editing.id))
        .map((r) => r.name)
    : [];

  const edit = (item?: StockItem) => {
    setEditing(item);
    setOpen(true);
  };

  return (
    <Screen
      crumb="ESTOQUE"
      title="Estoque"
      actions={<Button title="Novo item" icon="add" small onPress={() => edit()} />}
    >
      {shopping.length > 0 ? (
        <View style={styles.shopping}>
          <Text style={styles.shoppingTitle}>Falta para o cardápio planejado</Text>
          {shopping.map((line) => {
            const item = data.stockById[line.itemId];
            return (
              <View key={line.itemId} style={styles.shoppingRow}>
                <Text style={styles.shoppingName}>{item?.name ?? "Item removido"}</Text>
                <Text style={styles.shoppingQty}>
                  comprar {formatQty(line.missing, item?.unit)}
                </Text>
              </View>
            );
          })}
          <Text style={styles.shoppingNote}>
            Soma de tudo que ainda não foi comido de hoje em diante, menos o que há em casa.
          </Text>
        </View>
      ) : null}

      {data.stock.length === 0 ? (
        <Empty
          icon="basket-outline"
          title="Estoque vazio"
          body="Cadastre o que há na despensa, na geladeira e no freezer, com a quantidade de cada item. As receitas usam esses itens como ingredientes."
          action={<Button title="Cadastrar item" icon="add" onPress={() => edit()} />}
        />
      ) : (
        PLACES.map((place) => {
          const items = data.stock.filter((s) => s.place === place);
          if (items.length === 0) return null;
          return (
            <View key={place} style={{ marginBottom: space.xl, gap: space.sm }}>
              <Mono style={{ color: colors.secondary }}>{`> ${PLACE_LABEL[place]} (${items.length})`}</Mono>
              {items.map((item) => {
                const low = isLow(item);
                return (
                  <View key={item.id} style={[styles.row, low && styles.rowLow]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${item.name}`}
                      onPress={() => edit(item)}
                      style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
                    >
                      <AppText numberOfLines={1}>{item.name}</AppText>
                      {low ? (
                        <Mono style={{ color: colors.accent }}>
                          {item.qty <= 0 ? "! acabou" : "! acabando"}
                        </Mono>
                      ) : null}
                    </Pressable>
                    <IconButton
                      icon="remove"
                      label={`Diminuir ${item.name}`}
                      onPress={() => adjustStock(item.id, -STEP[item.unit])}
                    />
                    <Text style={[styles.qty, low && { color: colors.accent }]}>
                      {formatQty(item.qty, item.unit)}
                    </Text>
                    <IconButton
                      icon="add"
                      label={`Aumentar ${item.name}`}
                      onPress={() => adjustStock(item.id, STEP[item.unit])}
                    />
                  </View>
                );
              })}
            </View>
          );
        })
      )}

      <StockEditor
        visible={open}
        item={editing}
        usedIn={usedIn}
        onClose={() => setOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shopping: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginBottom: space.xl,
    borderLeftWidth: 6,
    borderLeftColor: colors.orange,
  },
  shoppingTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19 },
  shoppingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperShade,
    paddingVertical: 6,
  },
  shoppingName: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15, flex: 1 },
  shoppingQty: { color: colors.orangeDeep, fontFamily: fonts.mono, fontSize: 13 },
  shoppingNote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: space.lg,
    paddingRight: 4,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowLow: { borderColor: colors.accent },
  qty: {
    minWidth: 78,
    textAlign: "center",
    color: colors.ivory,
    fontFamily: fonts.mono,
    fontSize: 15,
  },
});
