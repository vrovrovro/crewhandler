import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.name}>Theo Technician</Text>
        <Text style={styles.role}>Role: Technician</Text>
        <Text style={styles.kicker}>Offline-ready note</Text>
        <Text style={styles.description}>
          Queue status updates and photo uploads locally, then sync when connectivity returns.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f4", padding: 20 },
  card: { borderRadius: 32, backgroundColor: "#ffffff", padding: 24 },
  name: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  role: { marginTop: 8, fontSize: 16, color: "#64748b" },
  kicker: {
    marginTop: 24,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: "#94a3b8",
  },
  description: { marginTop: 8, fontSize: 16, color: "#475569" },
});
