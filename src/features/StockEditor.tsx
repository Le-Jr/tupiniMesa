import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  PLACES,
  PLACE_LABEL,
  UNITS,
  UNIT_LABEL,
  formatQty,
  parseQty,
  type Place,
  type StockItem,
  type Unit,
} from "../domain/model";
import { deleteStock, saveStock } from "../data/actions";
import { AppText, Button, Chip, Field, Mono, Sheet } from "../components/ui";
import { colors, space } from "../theme/tokens";

export function StockEditor({
  visible,
  onClose,
  item,
  usedIn,
}: {
  visible: boolean;
  onClose: () => void;
  item?: StockItem;
  /** Names of recipes using this item, shown before deleting. */
  usedIn: string[];
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Unit>("un");
  const [qty, setQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [place, setPlace] = useState<Place>("despensa");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(item?.name ?? "");
    setUnit(item?.unit ?? "un");
    setQty(item ? formatQty(item.qty) : "");
    setMinQty(item && item.minQty > 0 ? formatQty(item.minQty) : "");
    setPlace(item?.place ?? "despensa");
    setConfirmDelete(false);
  }, [visible, item]);

  const q = qty.trim() === "" ? 0 : parseQty(qty);
  const min = minQty.trim() === "" ? 0 : parseQty(minQty);
  const problem = !name.trim()
    ? "Dê um nome ao item."
    : Number.isNaN(q) || Number.isNaN(min)
      ? "Use só números nas quantidades (ex.: 1,5)."
      : "";

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={item ? "Editar item" : "Novo item do estoque"}
      footer={
        <>
          {problem ? (
            <AppText style={{ color: colors.orangeDeep, fontSize: 13, flexGrow: 1, alignSelf: "center" }}>
              {problem}
            </AppText>
          ) : null}
          {item ? (
            <Button
              title={confirmDelete ? "Confirmar exclusão" : "Excluir"}
              variant="danger"
              icon="trash-outline"
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                deleteStock(item.id);
                onClose();
              }}
            />
          ) : null}
          <Button
            title="Salvar"
            icon="checkmark"
            disabled={!!problem}
            onPress={() => {
              saveStock({ id: item?.id, name, unit, qty: q, minQty: min, place });
              onClose();
            }}
          />
        </>
      }
    >
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Farinha de trigo" />
      <View style={{ gap: 6 }}>
        <Mono>Medido em</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {UNITS.map((u) => (
            <Chip key={u} label={UNIT_LABEL[u]} selected={unit === u} onPress={() => setUnit(u)} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Field
          label={`Quantidade (${UNIT_LABEL[unit]})`}
          value={qty}
          onChangeText={setQty}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Field
          label="Avisar abaixo de"
          value={minQty}
          onChangeText={setMinQty}
          keyboardType="decimal-pad"
          placeholder="sem aviso"
        />
      </View>
      <View style={{ gap: 6 }}>
        <Mono>Onde fica</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {PLACES.map((p) => (
            <Chip
              key={p}
              label={PLACE_LABEL[p]}
              selected={place === p}
              onPress={() => setPlace(p)}
            />
          ))}
        </View>
      </View>
      {confirmDelete && usedIn.length > 0 ? (
        <AppText style={{ color: colors.danger }}>
          Este item é ingrediente de: {usedIn.join(", ")}. Essas receitas vão mostrar “item
          removido”.
        </AppText>
      ) : null}
    </Sheet>
  );
}
