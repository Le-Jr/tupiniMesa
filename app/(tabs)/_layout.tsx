import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../src/theme/tokens";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Cardápio", tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="recipes" options={{ title: "Receitas", tabBarIcon: icon("book") }} />
      <Tabs.Screen name="stock" options={{ title: "Estoque", tabBarIcon: icon("basket") }} />
      <Tabs.Screen name="home" options={{ title: "Casa", tabBarIcon: icon("home") }} />
    </Tabs>
  );
}
