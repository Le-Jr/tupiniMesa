// The week board: one column per day, each split into the four meals.
// Recipe cards float freely inside it and are threaded together, day by
// day, by a lace that behaves like a real shoelace.
import React, { useCallback, useEffect, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  MEALS,
  MEAL_LABEL,
  type Collections,
  type Meal,
  type PlanEntry,
} from "../domain/model";
import { dayNumber, dowLabel, today, weekDays } from "../domain/dates";
import { missingFor } from "../domain/stock";
import { movePlan, setEaten } from "../data/actions";
import { colors, fonts, mealColors, mealIcons, radius } from "../theme/tokens";
import { toast } from "../components/ui";
import { cardXY, colX, locate, metrics, zoneY, type Metrics } from "./layout";
import { makeRope, ropePath, stepRope, type RopeState } from "./rope";

type XY = { x: number; y: number };
type PosMap = Record<string, XY>;

/** Distance from a card's top/bottom edge to the centre of its eyelet. */
const EYE = 9;
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Shared {
  pos: SharedValue<PosMap>;
  target: SharedValue<PosMap>;
  dragId: SharedValue<string | null>;
  dragStart: SharedValue<XY>;
  dragMove: SharedValue<XY>;
  pointerX: SharedValue<number>;
  scrollStart: SharedValue<number>;
  scrollX: SharedValue<number>;
}

export function Board({
  start,
  data,
  onAdd,
  onOpen,
}: {
  start: string;
  data: Collections;
  onAdd: (date: string, meal: Meal) => void;
  onOpen: (entryId: string) => void;
}) {
  const { width: windowW } = useWindowDimensions();
  const m = useMemo(() => metrics(windowW), [windowW]);
  const days = useMemo(() => weekDays(start), [start]);
  const now = today();

  const entries = useMemo(
    () =>
      data.plan.filter(
        (e) => days.includes(e.date) && data.recipesById[e.recipeId],
      ),
    [data, days],
  );

  const targets = useMemo(() => {
    const map: PosMap = {};
    for (const e of entries)
      map[e.id] = cardXY(m, days.indexOf(e.date), MEALS.indexOf(e.meal), e.x, e.y);
    return map;
  }, [entries, days, m]);

  // One lace per day: from the eyelet under the day header, through that
  // day's cards from top to bottom.
  const laces = useMemo(() => {
    const out: { key: string; a: string | null; b: string; ax: number; ay: number }[] = [];
    days.forEach((date, i) => {
      const chain = entries
        .filter((e) => e.date === date)
        .sort(
          (p, q) =>
            (targets[p.id]?.y ?? 0) - (targets[q.id]?.y ?? 0) ||
            p.id.localeCompare(q.id),
        );
      let prev: string | null = null;
      for (const e of chain) {
        out.push({
          key: `${prev ?? date}>${e.id}`,
          a: prev,
          b: e.id,
          ax: colX(m, i) + m.colW / 2,
          ay: m.headerH - 13,
        });
        prev = e.id;
      }
    });
    return out;
  }, [entries, days, targets, m]);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useScrollOffset(scrollRef);
  const pos = useSharedValue<PosMap>(targets);
  const target = useSharedValue<PosMap>(targets);
  const dragId = useSharedValue<string | null>(null);
  const dragStart = useSharedValue<XY>({ x: 0, y: 0 });
  const dragMove = useSharedValue<XY>({ x: 0, y: 0 });
  const pointerX = useSharedValue(0);
  const scrollStart = useSharedValue(0);
  const shared: Shared = useMemo(
    () => ({ pos, target, dragId, dragStart, dragMove, pointerX, scrollStart, scrollX }),
    [pos, target, dragId, dragStart, dragMove, pointerX, scrollStart, scrollX],
  );

  useEffect(() => {
    target.value = targets;
  }, [targets, target]);

  const maxScroll = Math.max(0, m.width - windowW);

  // Every frame: the dragged card follows the finger (and the board scrolls
  // when the finger nears an edge); every other card glides to where the
  // data says it belongs — including moves made on another device.
  useFrameCallback(() => {
    const goal = target.value;
    const cur = pos.value;
    const id = dragId.value;
    let next: PosMap | null = null;

    if (id) {
      const px = pointerX.value;
      const edge = 56;
      const step = px < edge ? -12 : px > windowW - edge ? 12 : 0;
      if (step !== 0) {
        const to = Math.min(maxScroll, Math.max(0, scrollX.value + step));
        if (to !== scrollX.value) scrollTo(scrollRef, to, 0, false);
      }
      const x = dragStart.value.x + dragMove.value.x + (scrollX.value - scrollStart.value);
      const y = dragStart.value.y + dragMove.value.y;
      const c = cur[id];
      if (!c || c.x !== x || c.y !== y) {
        next = { ...cur };
        next[id] = { x, y };
      }
    }

    for (const key in goal) {
      if (key === id) continue;
      const g = goal[key];
      const c = (next ?? cur)[key];
      if (!g) continue;
      if (c && c.x === g.x && c.y === g.y) continue;
      next ??= { ...cur };
      if (!c) next[key] = g;
      else {
        const dx = g.x - c.x;
        const dy = g.y - c.y;
        next[key] =
          Math.abs(dx) + Math.abs(dy) < 0.6
            ? g
            : { x: c.x + dx * 0.22, y: c.y + dy * 0.22 };
      }
    }
    for (const key in cur) {
      if (key !== id && !goal[key]) {
        next ??= { ...cur };
        delete next[key];
      }
    }
    if (next) pos.value = next;
  });

  const onDrop = useCallback(
    (id: string, x: number, y: number) => {
      const entry = entries.find((e) => e.id === id);
      const recipe = entry && data.recipesById[entry.recipeId];
      const slot = locate(m, x, y);
      const date = slot ? days[slot.day] : undefined;
      if (!entry || !recipe || !slot || !date) {
        target.value = { ...targets };
        return;
      }
      if (!recipe.meals.includes(slot.meal)) {
        toast(
          `${recipe.name} não é receita de ${MEAL_LABEL[slot.meal].toLowerCase()}. Ela volta para ${MEAL_LABEL[entry.meal].toLowerCase()}.`,
        );
        target.value = { ...targets };
        return;
      }
      movePlan(id, { date, meal: slot.meal, x: slot.fx, y: slot.fy });
    },
    [entries, data, m, days, targets, target],
  );

  const onTap = useCallback(
    (id: string, x: number, y: number) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      // The bottom-right corner of the card is the "comido" check.
      if (x > m.cardW - 44 && y > m.cardH - 40) {
        if (Platform.OS !== "web")
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEaten(id, !entry.eaten);
      } else onOpen(id);
    },
    [entries, m, onOpen],
  );

  // On a phone, open the week on today's column.
  const todayIndex = days.indexOf(now);
  useEffect(() => {
    if (todayIndex < 1 || maxScroll === 0) return;
    const x = Math.min(maxScroll, colX(m, todayIndex) - (windowW - m.colW) / 2);
    const t = setTimeout(
      () => scrollRef.current?.scrollTo({ x, y: 0, animated: false }),
      50,
    );
    return () => clearTimeout(t);
    // Only when the week changes, not on every resize tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, todayIndex]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ minWidth: "100%", justifyContent: "center" }}
      >
        <View style={[{ width: m.width, height: m.height }, styles.noSelect]}>
          {days.map((date, i) => (
            <DayColumn
              key={date}
              date={date}
              index={i}
              m={m}
              isToday={date === now}
              past={date < now}
              entries={entries}
              onAdd={onAdd}
            />
          ))}
          {entries.map((e) => (
            <Card
              key={e.id}
              entry={e}
              data={data}
              m={m}
              shared={shared}
              fallback={targets[e.id] ?? { x: 0, y: 0 }}
              onDrop={onDrop}
              onTap={onTap}
            />
          ))}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={m.width} height={m.height}>
              {laces.map((l) => (
                <Lace
                  key={l.key}
                  pos={pos}
                  a={l.a}
                  b={l.b}
                  ax={l.ax}
                  ay={l.ay}
                  cardW={m.cardW}
                  cardH={m.cardH}
                />
              ))}
            </Svg>
          </View>
        </View>
      </Animated.ScrollView>
    </ScrollView>
  );
}

// ---------- day column ----------

function DayColumn({
  date,
  index,
  m,
  isToday,
  past,
  entries,
  onAdd,
}: {
  date: string;
  index: number;
  m: Metrics;
  isToday: boolean;
  past: boolean;
  entries: PlanEntry[];
  onAdd: (date: string, meal: Meal) => void;
}) {
  const mine = entries.filter((e) => e.date === date);
  const eaten = mine.filter((e) => e.eaten).length;
  const pct = mine.length ? eaten / mine.length : 0;
  return (
    <View
      style={[
        styles.column,
        { left: colX(m, index), width: m.colW, height: m.height - m.pad },
        isToday && styles.columnToday,
        past && { opacity: 0.82 },
      ]}
    >
      <View style={[styles.dayHeader, { height: m.headerH }]}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={`${dowLabel(date)} ${dayNumber(date)}${isToday ? ", hoje" : ""}`}
          style={[styles.dow, isToday && { color: colors.primary }]}
        >
          {isToday ? ">_ HOJE" : dowLabel(date)}
        </Text>
        <Text style={[styles.dayNum, isToday && { color: colors.primary }]}>
          {dayNumber(date)}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={styles.count}>
            {mine.length ? `${eaten}/${mine.length} comido${eaten === 1 ? "" : "s"}` : "vazio"}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
        <View style={[styles.eyelet, styles.headerEyelet]} />
      </View>
      {MEALS.map((meal, k) => (
        <View
          key={meal}
          style={[styles.zone, { top: zoneY(m, k), height: m.zoneH }]}
        >
          <View style={[styles.zoneLabel, { height: m.labelH }]}>
            <Ionicons name={mealIcons[meal]} size={13} color={mealColors[meal]} />
            <Text style={[styles.zoneText, { color: mealColors[meal] }]}>
              {MEAL_LABEL[meal]}
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Adicionar receita no ${MEAL_LABEL[meal].toLowerCase()} de ${dowLabel(date)} ${dayNumber(date)}`}
              hitSlop={10}
              onPress={() => onAdd(date, meal)}
              style={({ pressed }) => [styles.add, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------- recipe card ----------

function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 300) / 100 - 1.5) * 1;
}

const Card = React.memo(function Card({
  entry,
  data,
  m,
  shared,
  fallback,
  onDrop,
  onTap,
}: {
  entry: PlanEntry;
  data: Collections;
  m: Metrics;
  shared: Shared;
  fallback: XY;
  onDrop: (id: string, x: number, y: number) => void;
  onTap: (id: string, x: number, y: number) => void;
}) {
  const id = entry.id;
  const recipe = data.recipesById[entry.recipeId];
  const missing = recipe && !entry.eaten ? missingFor(recipe, data.stockById) : [];
  const angle = useMemo(() => tilt(id), [id]);
  const { pos, target, dragId, dragStart, dragMove, pointerX, scrollStart, scrollX } =
    shared;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin(() => {
        // A drag whose release was never delivered (pointer lost outside the
        // window, for instance) must not leave its card stuck in the air.
        const stuck = dragId.value;
        if (!stuck || stuck === id) return;
        const p = pos.value[stuck];
        dragId.value = null;
        if (p) runOnJS(onDrop)(stuck, p.x, p.y);
      })
      .onStart((e) => {
        const p = pos.value[id];
        if (!p) return;
        dragStart.value = p;
        dragMove.value = { x: e.translationX, y: e.translationY };
        scrollStart.value = scrollX.value;
        pointerX.value = e.absoluteX;
        dragId.value = id;
      })
      .onUpdate((e) => {
        dragMove.value = { x: e.translationX, y: e.translationY };
        pointerX.value = e.absoluteX;
      })
      .onFinalize(() => {
        if (dragId.value !== id) return;
        const p = pos.value[id] ?? dragStart.value;
        // Hold the card where it was released until the drop is judged.
        const hold = { ...target.value };
        hold[id] = p;
        target.value = hold;
        dragId.value = null;
        runOnJS(onDrop)(id, p.x, p.y);
      });
    // Touch screens: long-press to pick up, so swiping still scrolls.
    if (Platform.OS === "web") pan.minDistance(6);
    else pan.activateAfterLongPress(220);
    const tap = Gesture.Tap()
      .maxDuration(300)
      .onEnd((e, ok) => {
        if (ok) runOnJS(onTap)(id, e.x, e.y);
      });
    return Gesture.Race(pan, tap);
  }, [id, pos, target, dragId, dragStart, dragMove, pointerX, scrollStart, scrollX, onDrop, onTap]);

  const style = useAnimatedStyle(() => {
    const p = pos.value[id] ?? fallback;
    const held = dragId.value === id;
    return {
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { rotate: `${held ? 3 : angle}deg` },
        { scale: held ? 1.06 : 1 },
      ],
      zIndex: held ? 50 : 1,
      shadowOpacity: held ? 0.55 : 0.3,
    };
  });

  if (!recipe) return null;
  const color = mealColors[entry.meal];
  const status = entry.eaten
    ? "comido"
    : missing.length
      ? `falta ${missing.length} ${missing.length === 1 ? "item" : "itens"}`
      : "estoque ok";

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${recipe.name}, ${MEAL_LABEL[entry.meal]}, ${status}`}
        accessibilityHint="Toque para ver detalhes. Arraste para mudar de dia ou refeição."
        style={[
          styles.card,
          { width: m.cardW, height: m.cardH },
          entry.eaten && styles.cardEaten,
          style,
        ]}
      >
        <View style={[styles.stripe, { backgroundColor: color }]} />
        <View style={[styles.eyelet, styles.cardEyelet, { top: EYE - 7 }]} />
        <View style={[styles.eyelet, styles.cardEyelet, { bottom: EYE - 7 }]} />
        <View style={styles.cardTop}>
          <Text style={styles.emoji}>{recipe.emoji}</Text>
          <Text
            numberOfLines={2}
            style={[styles.cardName, entry.eaten && styles.cardNameEaten]}
          >
            {recipe.name}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <Text
            numberOfLines={1}
            style={[
              styles.status,
              entry.eaten && { color: colors.leaf },
              !entry.eaten && missing.length > 0 && { color: colors.orangeDeep },
            ]}
          >
            {missing.length > 0 ? "! " : ""}
            {status}
          </Text>
          <View style={[styles.check, entry.eaten && styles.checkOn]}>
            {entry.eaten ? (
              <Ionicons name="checkmark" size={15} color={colors.paper} />
            ) : null}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

// ---------- lace ----------

function Lace({
  pos,
  a,
  b,
  ax,
  ay,
  cardW,
  cardH,
}: {
  pos: SharedValue<PosMap>;
  /** Card the lace comes from; null = the day's header eyelet at (ax, ay). */
  a: string | null;
  b: string;
  ax: number;
  ay: number;
  cardW: number;
  cardH: number;
}) {
  const sim = useSharedValue<RopeState | null>(null);
  const d = useSharedValue("");

  useFrameCallback(() => {
    const all = pos.value;
    const pb = all[b];
    if (!pb) return;
    let x0 = ax;
    let y0 = ay;
    if (a) {
      const pa = all[a];
      if (!pa) return;
      x0 = pa.x + cardW / 2;
      y0 = pa.y + cardH - EYE;
    }
    const x1 = pb.x + cardW / 2;
    const y1 = pb.y + EYE;
    const s = sim.value;
    if (!s) {
      const fresh = makeRope(x0, y0, x1, y1);
      sim.value = fresh;
      d.value = ropePath(fresh.p);
      return;
    }
    const next = stepRope(s, x0, y0, x1, y1);
    if (next) {
      sim.value = next;
      d.value = ropePath(next.p);
    }
  });

  const base = useAnimatedProps(() => ({ d: d.value }));
  const braid = useAnimatedProps(() => ({ d: d.value }));
  return (
    <>
      <AnimatedPath
        animatedProps={base}
        stroke={colors.orange}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
      <AnimatedPath
        animatedProps={braid}
        stroke={colors.orangeDeep}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeDasharray="1 7"
        fill="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Dragging across the board must never start a text selection on web.
  noSelect: Platform.OS === "web" ? { userSelect: "none" } : {},
  column: {
    position: "absolute",
    top: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  columnToday: {
    borderColor: colors.primary,
    backgroundColor: "#0E2A20",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  dow: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  dayNum: { color: colors.ivory, fontFamily: fonts.pixel, fontSize: 24 },
  count: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10 },
  bar: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  barFill: { height: 4, backgroundColor: colors.primary },
  eyelet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.brass,
    backgroundColor: colors.background,
  },
  headerEyelet: { position: "absolute", bottom: 6, left: "50%", marginLeft: -7 },
  zone: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderStyle: "dashed",
  },
  zoneLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  zoneText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  add: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.paperShade,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: "#000",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    ...(Platform.OS === "web" ? { cursor: "grab", userSelect: "none" } : null),
  },
  cardEaten: { backgroundColor: "#DCE9CF", borderColor: "#C3D6B2" },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  cardEyelet: {
    position: "absolute",
    left: "50%",
    marginLeft: -7,
    backgroundColor: colors.ink,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  emoji: { fontSize: 22 },
  cardName: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 13.5,
    lineHeight: 16,
  },
  cardNameEaten: { textDecorationLine: "line-through", color: colors.inkSoft },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  status: {
    flex: 1,
    color: colors.inkSoft,
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.inkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.leaf, borderColor: colors.leaf },
});
