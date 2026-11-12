import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveHome } from "../data/actions";
import { seedExamples } from "../data/seed";
import { cloudConfigured, enterHousehold, setOnboarded } from "../data/store";
import { AppText, Button, Field, Mono } from "../components/ui";
import { colors, fonts, radius, space } from "../theme/tokens";

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [people, setPeople] = useState("4");
  const [examples, setExamples] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = () => {
    saveHome(name, Number(people));
    if (examples) seedExamples();
    setOnboarded();
  };

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      await enterHousehold(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 40 }]}
    >
      <View style={styles.box}>
        <Mono style={{ color: colors.secondary }}>{">_ planejamento alimentar da família"}</Mono>
        <Text accessibilityRole="header" style={styles.logo}>
          TUPINI<Text style={{ color: colors.primary }}>MESA</Text>
        </Text>
        <Text style={styles.tagline}>
          Estoque, receitas e o cardápio da semana, amarrados num fio só.
        </Text>

        <View style={styles.tabs}>
          {(["create", "join"] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === m && { color: colors.onPrimary }]}>
                {m === "create" ? "Registrar residência" : "Entrar com código"}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === "create" ? (
          <View style={{ gap: space.lg }}>
            <Field
              label="Nome da residência"
              value={name}
              onChangeText={setName}
              placeholder="Casa da família Silva"
            />
            <View style={{ maxWidth: 180 }}>
              <Field
                label="Quantas pessoas comem aí"
                value={people}
                onChangeText={setPeople}
                keyboardType="number-pad"
              />
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: examples }}
              onPress={() => setExamples((v) => !v)}
              style={styles.check}
            >
              <Ionicons
                name={examples ? "checkbox" : "square-outline"}
                size={22}
                color={examples ? colors.primary : colors.muted}
              />
              <AppText style={{ flex: 1, color: colors.muted }}>
                Começar com exemplos (alguns itens de estoque e receitas, como o bolo de
                chocolate) para ver o app funcionando. Dá para apagar depois.
              </AppText>
            </Pressable>
            <Button title="Criar e começar" icon="arrow-forward" onPress={create} />
          </View>
        ) : (
          <View style={{ gap: space.lg }}>
            {cloudConfigured ? (
              <>
                <AppText style={{ color: colors.muted }}>
                  Peça o código de convite a quem já usa o TupiniMesa na sua casa (aba Casa).
                  Tudo o que estiver lá aparece aqui.
                </AppText>
                <Field
                  label="Código de convite"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="ABCD2345"
                />
                {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
                <Button
                  title={busy ? "Entrando…" : "Entrar na residência"}
                  icon="log-in-outline"
                  disabled={busy || code.trim().length < 6}
                  onPress={() => void join()}
                />
              </>
            ) : (
              <AppText style={{ color: colors.muted }}>
                Esta instalação ainda não tem a sincronização configurada, então não há como
                entrar numa residência de outro aparelho. Registre a residência aqui; depois
                de configurar a sincronização (veja o README), ela pode ser compartilhada na
                aba Casa.
              </AppText>
            )}
          </View>
        )}
      </View>
      <Text style={styles.signature}>Tupinicode · uma iniciativa Granjeando Talentos Signature</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, alignItems: "center", padding: space.lg, paddingBottom: 40, gap: space.xxl },
  box: { width: "100%", maxWidth: 520, gap: space.lg },
  logo: {
    color: colors.ivory,
    fontFamily: fonts.pixel,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: 2,
  },
  tagline: { color: colors.ivory, fontFamily: fonts.serif, fontSize: 20, lineHeight: 27 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    gap: 4,
    marginTop: space.md,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, textAlign: "center" },
  check: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  signature: { color: colors.subtle, fontFamily: fonts.mono, fontSize: 11, textAlign: "center" },
});
