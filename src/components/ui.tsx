import React, { useEffect, useSyncExternalStore } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, paperShadow, radius, space } from "../theme/tokens";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.text, style]} />;
}

/** Small typewriter label, like the status line on a recipe card. */
export function Mono({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.mono, style]} />;
}

/** Serif heading, the same hand as the recipe names. */
export function Title({ style, ...rest }: TextProps) {
  return <Text accessibilityRole="header" {...rest} style={[styles.title, style]} />;
}

/** Brass eyelet, the hole the lace goes through. */
export function Eyelet({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.eyelet, style]} />;
}

/** A short stretch of the orange lace, used as an ornament under titles. */
export function LaceDivider({ width = 132 }: { width?: number }) {
  const d = `M8 9 C ${width * 0.25} 1, ${width * 0.35} 17, ${width * 0.5} 9 S ${width * 0.75} 1, ${width - 8} 9`;
  return (
    <Svg width={width} height={18} accessibilityElementsHidden importantForAccessibility="no">
      <Path d={d} stroke={colors.orange} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      <Path
        d={d}
        stroke={colors.orangeDeep}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeDasharray="1 7"
        fill="none"
      />
      <Circle cx={8} cy={9} r={5} fill={colors.ink} stroke={colors.brass} strokeWidth={2.5} />
      <Circle cx={width - 8} cy={9} r={5} fill={colors.ink} stroke={colors.brass} strokeWidth={2.5} />
    </Svg>
  );
}

/** The recipe-card look for any block: paper, stripe, eyelet, slight tilt. */
export function Paper({
  children,
  stripe,
  eyelet,
  tilt = 0,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  stripe?: string;
  eyelet?: boolean;
  tilt?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      {stripe ? <View style={[styles.stripe, { backgroundColor: stripe }]} /> : null}
      {eyelet ? <Eyelet style={styles.paperEyelet} /> : null}
      {children}
    </>
  );
  const look = [
    styles.paper,
    stripe ? { paddingLeft: space.lg + 8 } : null,
    eyelet ? { paddingTop: space.lg + 10 } : null,
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    style,
  ];
  if (!onPress) return <View style={look}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [look, pressed && { opacity: 0.85 }]}
    >
      {body}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg =
    variant === "primary"
      ? colors.onLeaf
      : variant === "danger"
        ? colors.danger
        : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && { backgroundColor: colors.dangerSoft },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={small ? 16 : 18}
          color={variant === "secondary" ? colors.leaf : fg}
        />
      ) : null}
      <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.leaf,
  size = 20,
  filled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  /** Soft round background, for steppers and the like. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        filled && { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.line },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Field({
  label,
  style,
  ...rest
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6, flexGrow: 1 }}>
      {label ? <Mono>{label}</Mono> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkFaint}
        {...rest}
        style={[styles.input, rest.multiline && styles.inputMultiline, style]}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.leaf,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Fill colour when selected; the text stays dark. */
  color?: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: !!selected }}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { borderColor: color, backgroundColor: `${color}3D` },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={colors.inkSoft} /> : null}
      <Text
        style={[
          styles.chipText,
          selected && { color: colors.ink, fontFamily: fonts.bold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Bottom sheet on phones, centred dialog on wide screens. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 720;
  return (
    <Modal
      visible={visible}
      transparent
      animationType={wide ? "fade" : "slide"}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheetRoot, wide && { justifyContent: "center" }]}
      >
        <Pressable
          accessibilityLabel="Fechar"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { maxHeight: height * 0.9, paddingBottom: space.lg + insets.bottom },
            wide && styles.sheetWide,
          ]}
        >
          <View style={styles.grabber}>
            <Eyelet />
            <View style={styles.grabberLace} />
            <Eyelet />
          </View>
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle} numberOfLines={2}>
              {title}
            </Text>
            <IconButton
              icon="close"
              label="Fechar"
              onPress={onClose}
              color={colors.inkSoft}
              filled
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: space.lg, paddingBottom: space.sm }}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Empty({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBadge}>
        <Text style={{ fontSize: 34 }}>{emoji}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <AppText style={{ color: colors.inkSoft, textAlign: "center", maxWidth: 360 }}>
        {body}
      </AppText>
      {action}
    </View>
  );
}

/** Screen frame: small crumb, serif title with a bit of lace, actions. */
export function ScreenHeader({
  crumb,
  title,
  actions,
}: {
  crumb: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
        <Mono style={{ color: colors.inkFaint }} numberOfLines={1}>
          {crumb}
        </Mono>
        <Title>{title}</Title>
        <LaceDivider />
      </View>
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
        {actions}
      </View>
    </View>
  );
}

export function Screen({
  crumb,
  title,
  actions,
  children,
}: {
  crumb: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.screenBody}
      >
        <ScreenHeader crumb={crumb} title={title} actions={actions} />
        {children}
      </ScrollView>
    </View>
  );
}

// ---------- toast ----------

let toastMessage: string | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastListeners = new Set<() => void>();
export function toast(message: string) {
  toastMessage = message;
  toastListeners.forEach((l) => l());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage = undefined;
    toastListeners.forEach((l) => l());
  }, 3200);
}

export function Toast() {
  const message = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toastMessage,
    () => toastMessage,
  );
  useEffect(() => () => clearTimeout(toastTimer), []);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <View accessibilityLiveRegion="polite" style={styles.toast}>
        <Text style={{ fontSize: 16 }}>🌱</Text>
        <AppText style={{ flexShrink: 1, color: colors.paper }}>{message}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  mono: {
    color: colors.inkSoft,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 40,
  },
  eyelet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.brass,
    backgroundColor: colors.ink,
  },
  paper: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
    overflow: "hidden",
    ...paperShadow,
  },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8 },
  paperEyelet: { position: "absolute", top: 7, left: "50%", marginLeft: -7 },
  button: {
    minHeight: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: space.lg },
  buttonPrimary: {
    backgroundColor: colors.leaf,
    shadowColor: colors.leaf,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.field,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 140, textAlignVertical: "top", lineHeight: 23 },
  chip: {
    minHeight: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingTop: space.md,
    gap: space.md,
  },
  sheetWide: { borderRadius: radius.xl },
  grabber: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  grabberLace: {
    width: 44,
    height: 5,
    marginHorizontal: -3,
    borderRadius: 3,
    backgroundColor: colors.orange,
    zIndex: -1,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
  sheetTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 27,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: space.sm,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderStyle: "dashed",
  },
  empty: {
    alignItems: "center",
    gap: space.md,
    padding: space.xxl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgAlt,
  },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 20,
    textAlign: "center",
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    flexWrap: "wrap",
    marginBottom: space.lg,
  },
  screenBody: {
    padding: space.lg,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 92,
    alignItems: "center",
    paddingHorizontal: space.lg,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    maxWidth: 520,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    ...paperShadow,
  },
});
