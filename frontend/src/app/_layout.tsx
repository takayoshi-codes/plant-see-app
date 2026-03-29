import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#F8FBF8" },
        headerTitleStyle: { color: "#1D3A2A", fontWeight: "700" },
        tabBarActiveTintColor: "#1D9E75",
        tabBarInactiveTintColor: "#aaa",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#eee" },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            index: focused ? "camera" : "camera-outline",
            plants: focused ? "leaf" : "leaf-outline",
            account: focused ? "person" : "person-outline",
          }
          return <Ionicons name={(icons[route.name] ?? "ellipse") as any} size={size} color={color} />
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "\u8a3a\u65ad" }} />
      <Tabs.Screen name="plants" options={{ title: "\u30de\u30a4\u690d\u7269" }} />
      <Tabs.Screen name="account" options={{ title: "\u30a2\u30ab\u30a6\u30f3\u30c8" }} />
    </Tabs>
  )
}