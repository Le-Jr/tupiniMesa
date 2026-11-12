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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "../theme/tokens";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.text, style]} />;
}

/** Terminal-style small caps label. */
export function Mono({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.mono, style]} />;
}

/** Pixel display title, used sparingly (screen titles only). */
export function PixelTitle({ style, ...rest }: TextProps) {
  return <Text accessibilityRole="header" {...rest} style={[styles.pixel, style]} />;
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
      ? colors.onPrimary
      : variant === "danger"
        ? colors.danger
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === "primary" && { backgroundColor: colors.primary },
        variant === "secondary" && { borderColor: colors.secondary, borderWidth: 1 },
        variant === "danger" && { borderColor: colors.danger, borderWidth: 1 },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
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
  color = colors.primary,
  size = 20,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}
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
      <Mono>{label}</Mono>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.subtle}
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
  color = colors.primary,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
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
        { borderColor: selected ? color : colors.lineStrong },
        selected && { backgroundColor: `${color}26` },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? color : colors.muted} />
      ) : null}
      <Text style={[styles.chipText, { color: selected ? color : colors.muted }]}>
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
          <View style={styles.sheetHeader}>
            <Mono style={{ color: colors.primary }}>{">_"}</Mono>
            <Text accessibilityRole="header" style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <IconButton icon="close" label="Fechar" onPress={onClose} color={colors.muted} />
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
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.secondary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <AppText style={{ color: colors.muted, textAlign: "center", maxWidth: 360 }}>
        {body}
      </AppText>
      {action}
    </View>
  );
}

/** Screen frame: terminal breadcrumb, pixel title, optional actions. */
export function Screen({
  crumb,
  title,
  actions,
  children,
  scroll = true,
}: {
  crumb: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const header = (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1, gap: 4 }}>
        <Mono style={{ color: colors.secondary }}>{`>_ TUPINIMESA / ${crumb}`}</Mono>
        <PixelTitle>{title}</PixelTitle>
      </View>
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
        {actions}
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.screenBody}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <>
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>{header}</View>
          {children}
        </>
      )}
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
        <Mono style={{ color: colors.primary }}>{">"}</Mono>
        <AppText style={{ flexShrink: 1 }}>{message}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.ivory, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  mono: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pixel: {
    color: colors.ivory,
    fontFamily: fonts.pixel,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: space.md },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    color: colors.ivory,
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
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: space.lg,
    gap: space.md,
  },
  sheetWide: { borderRadius: radius.xl },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
  sheetTitle: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: space.sm,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  empty: {
    alignItems: "center",
    gap: space.md,
    padding: space.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
  },
  emptyTitle: {
    color: colors.ivory,
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: "center",
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
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
    bottom: 84,
    alignItems: "center",
    paddingHorizontal: space.lg,
  },
  toast: {
    flexDirection: "row",
    gap: space.sm,
    maxWidth: 520,
    backgroundColor: colors.forest,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
