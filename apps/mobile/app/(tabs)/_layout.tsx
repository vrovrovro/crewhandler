import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Jobs" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
