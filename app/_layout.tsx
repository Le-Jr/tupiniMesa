import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { PixelifySans_700Bold } from "@expo-google-fonts/pixelify-sans/700Bold";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { init, useStore } from "../src/data/store";
import { Onboarding } from "../src/features/Onboarding";
import { Toast } from "../src/components/ui";
import { colors } from "../src/theme/tokens";

export { ErrorBoundary } from "expo-router";

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.meta.onboarded);
  useEffect(() => {
    void init();
  }, []);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <ActivityIndicator color={colors.leaf} />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {onboarded ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      ) : (
        <Onboarding />
      )}
      <Toast />
    </View>
  );
}

// Web only: dark, thin scrollbars instead of the browser's white ones.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `* { scrollbar-width: thin; scrollbar-color: ${colors.lineStrong} transparent; }`;
  document.head.appendChild(style);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterBold: Inter_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
    Pixel: PixelifySans_700Bold,
    Fraunces: Fraunces_600SemiBold,
  });
  if (!loaded && !error)
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Shell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
