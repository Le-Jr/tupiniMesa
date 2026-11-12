import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveHome } from "../data/actions";
import { seedExamples } from "../data/seed";
import { cloudConfigured, enterHousehold, setOnboarded } from "../data/store";
import Svg, { Path } from "react-native-svg";
import { AppText, Button, Eyelet, Field, Paper } from "../components/ui";
import { colors, fonts, mealColors, paperShadow, radius, space } from "../theme/tokens";

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
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 40 }]}
    >
      <View style={styles.box}>
        <Hero />
        <Text accessibilityRole="header" style={styles.logo}>
          Tupini<Text style={{ color: colors.orangeDeep }}>Mesa</Text>
        </Text>
        <Text style={styles.tagline}>
          Estoque, receitas e o cardápio da semana, amarrados num fio só.
        </Text>

        <Paper eyelet stripe={colors.orange} style={{ gap: space.lg }}>
        <View style={styles.tabs}>
          {(["create", "join"] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === m && { color: colors.onLeaf }]}>
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
                color={examples ? colors.leaf : colors.inkSoft}
              />
              <AppText style={{ flex: 1, color: colors.inkSoft }}>
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
                <AppText style={{ color: colors.inkSoft }}>
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
              <AppText style={{ color: colors.inkSoft }}>
                Esta instalação ainda não tem a sincronização configurada, então não há como
                entrar numa residência de outro aparelho. Registre a residência aqui; depois
                de configurar a sincronização (veja o README), ela pode ser compartilhada na
                aba Casa.
              </AppText>
            )}
          </View>
        )}
        </Paper>
      </View>
      <Text style={styles.signature}>
        <Text style={styles.pixel}>TUPINICODE</Text> · uma iniciativa Granjeando Talentos Signature
      </Text>
    </ScrollView>
  );
}

/** Three little recipe cards on a lace: the app in one picture. */
function Hero() {
  const cards = [
    { left: 8, top: 44, tilt: -7, emoji: "🥖", color: mealColors.cafe },
    { left: 111, top: 14, tilt: 4, emoji: "🍲", color: mealColors.almoco },
    { left: 214, top: 50, tilt: -3, emoji: "🍰", color: mealColors.lanche },
  ];
  const lace = "M47 52 C 70 8, 110 4, 150 22 S 230 30, 253 58";
  return (
    <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cards.map((c) => (
        <View
          key={c.emoji}
          style={[styles.mini, { left: c.left, top: c.top, transform: [{ rotate: `${c.tilt}deg` }] }]}
        >
          <View style={[styles.miniStripe, { backgroundColor: c.color }]} />
          <Eyelet style={styles.miniEye} />
          <Text style={{ fontSize: 28, marginTop: 8 }}>{c.emoji}</Text>
        </View>
      ))}
      <Svg width={300} height={128} style={StyleSheet.absoluteFill}>
        <Path d={lace} stroke={colors.orange} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <Path d={lace} stroke={colors.orangeDeep} strokeWidth={4.5} strokeLinecap="round" strokeDasharray="1 7" fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, alignItems: "center", padding: space.lg, paddingBottom: 40, gap: space.xxl },
  box: { width: "100%", maxWidth: 520, gap: space.lg },
  logo: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 48,
    lineHeight: 54,
    textAlign: "center",
  },
  tagline: {
    color: colors.inkSoft,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
  },
  pixel: { fontFamily: fonts.pixel, color: colors.neon, fontSize: 12 },
  hero: { width: 300, height: 128, alignSelf: "center" },
  mini: {
    position: "absolute",
    width: 78,
    height: 62,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...paperShadow,
  },
  miniStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  miniEye: { position: "absolute", top: 3, left: 32, transform: [{ scale: 0.8 }] },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.bgAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  tabOn: { backgroundColor: colors.leaf },
  tabText: { color: colors.inkSoft, fontFamily: fonts.bold, fontSize: 13, textAlign: "center" },
  check: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  signature: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11, textAlign: "center" },
});
