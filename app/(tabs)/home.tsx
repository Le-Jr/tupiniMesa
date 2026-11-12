import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { saveHome } from "../../src/data/actions";
import {
  cloudConfigured,
  disconnect,
  enterHousehold,
  shareHousehold,
  syncNow,
  useData,
  useStore,
} from "../../src/data/store";
import { AppText, Button, Field, LaceDivider, Mono, Paper, Screen, toast } from "../../src/components/ui";
import { colors, fonts, radius, space } from "../../src/theme/tokens";

export default function HomeScreen() {
  const data = useData();
  const meta = useStore((s) => s.meta);
  const sync = useStore((s) => s.sync);
  const syncError = useStore((s) => s.syncError);
  const lastSyncAt = useStore((s) => s.lastSyncAt);

  const [name, setName] = useState("");
  const [people, setPeople] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const homeName = data.home?.name ?? "";
  const homePeople = data.home?.people ?? 1;
  useEffect(() => {
    setName(homeName);
    setPeople(String(homePeople));
  }, [homeName, homePeople]);
  const changed = name.trim() !== homeName || people !== String(homePeople);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  };

  const eatenTotal = data.plan.filter((e) => e.eaten).length;

  return (
    <Screen crumb="quem come aqui" title={homeName || "Casa"}>
      <Paper stripe={colors.leaf} eyelet style={styles.section}>
        <Text style={styles.heading}>🏡 Residência</Text>
        <Field label="Nome" value={name} onChangeText={setName} />
        <View style={{ maxWidth: 180 }}>
          <Field label="Pessoas" value={people} onChangeText={setPeople} keyboardType="number-pad" />
        </View>
        <View style={styles.stats}>
          <Stat n={data.stock.length} label="itens no estoque" />
          <Stat n={data.recipes.length} label="receitas" />
          <Stat n={eatenTotal} label="refeições comidas" />
        </View>
        {changed ? (
          <Button
            title="Salvar residência"
            icon="checkmark"
            onPress={() => {
              saveHome(name, Number(people));
              toast("Residência atualizada.");
            }}
          />
        ) : null}
      </Paper>

      <Paper stripe={colors.orange} eyelet style={styles.section}>
        <Text style={styles.heading}>🔗 Sincronização entre aparelhos</Text>
        {!cloudConfigured ? (
          <AppText style={{ color: colors.inkSoft }}>
            Os dados estão salvos só neste aparelho. Para sincronizar web e Android, crie um
            projeto gratuito no Supabase, rode o arquivo supabase/schema.sql e preencha as duas
            chaves do arquivo .env (passo a passo no README). Nada do que você cadastrar agora
            se perde: tudo sobe quando a sincronização for ligada.
          </AppText>
        ) : meta.householdId ? (
          <>
            <View style={styles.codeBox}>
              <Mono style={{ color: colors.inkSoft }}>Código de convite da casa</Mono>
              <Text selectable accessibilityLabel={`Código ${meta.code}`} style={styles.code}>
                {meta.code}
              </Text>
              <Text style={styles.codeHint}>
                Digite este código em “Entrar com código” nos outros aparelhos da família.
              </Text>
            </View>
            <AppText style={{ color: sync === "offline" ? colors.orangeDeep : colors.inkSoft }}>
              {sync === "offline"
                ? `Sem sincronizar agora: ${syncError ?? "sem conexão"}. As mudanças ficam guardadas e sobem sozinhas.`
                : sync === "syncing"
                  ? "Sincronizando…"
                  : `Sincronizado${lastSyncAt ? ` às ${new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}.${meta.dirty.length ? ` ${meta.dirty.length} mudança(s) aguardando envio.` : ""}`}
            </AppText>
            <View style={styles.actions}>
              <Button
                title="Copiar código"
                icon="copy-outline"
                variant="secondary"
                onPress={() => {
                  void Clipboard.setStringAsync(meta.code ?? "").then(() =>
                    toast("Código copiado."),
                  );
                }}
              />
              <Button
                title="Sincronizar agora"
                icon="sync"
                variant="secondary"
                disabled={busy}
                onPress={() => void run(() => syncNow(true))}
              />
              <Button
                title={confirmLeave ? "Confirmar: parar de sincronizar" : "Desconectar"}
                variant="danger"
                onPress={() => {
                  if (!confirmLeave) return setConfirmLeave(true);
                  disconnect();
                  setConfirmLeave(false);
                }}
              />
            </View>
            {confirmLeave ? (
              <AppText style={{ color: colors.inkSoft }}>
                Os dados continuam neste aparelho, mas deixam de receber e enviar mudanças.
              </AppText>
            ) : null}
          </>
        ) : (
          <>
            <AppText style={{ color: colors.inkSoft }}>
              Compartilhe esta residência para usar em outros aparelhos, ou entre numa
              residência que já existe. Ao entrar, o que está neste aparelho é somado ao que já
              existe lá.
            </AppText>
            <Button
              title={busy ? "Conectando…" : "Compartilhar esta residência"}
              icon="cloud-upload-outline"
              disabled={busy}
              onPress={() => void run(() => shareHousehold(homeName))}
            />
            <View style={styles.join}>
              <Field
                label="Ou entre com um código"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="ABCD2345"
              />
              <Button
                title="Entrar"
                variant="secondary"
                disabled={busy || code.trim().length < 6}
                onPress={() => void run(() => enterHousehold(code))}
              />
            </View>
          </>
        )}
        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
      </Paper>

      <View style={{ alignItems: "center", marginTop: space.lg }}>
        <LaceDivider width={96} />
      </View>

      <Text style={styles.signature}>
        TupiniMesa · Tupinicode{"\n"}uma iniciativa Granjeando Talentos Signature
      </Text>
    </Screen>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Mono>{label}</Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.lg, marginBottom: space.xl },
  heading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  stat: {
    flexGrow: 1,
    flexBasis: 130,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 2,
  },
  statN: { color: colors.leaf, fontFamily: fonts.serif, fontSize: 30 },
  codeBox: {
    backgroundColor: colors.orangeSoft,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.orange,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 6,
    alignItems: "flex-start",
  },
  code: { color: colors.ink, fontFamily: fonts.mono, fontSize: 30, letterSpacing: 4 },
  codeHint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  join: { flexDirection: "row", gap: space.sm, alignItems: "flex-end", flexWrap: "wrap" },
  signature: {
    color: colors.inkFaint,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: space.sm,
  },
});
