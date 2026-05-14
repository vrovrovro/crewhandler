import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const statusPills = ["SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"];

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Intervention</Text>
          <Text style={styles.heading}>Quarterly refrigeration inspection</Text>
          <Text style={styles.reference}>Reference: {id}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status update</Text>
          <View style={styles.pills}>
            {statusPills.map((status) => (
              <View key={status} style={styles.pill}>
                <Text style={styles.pillText}>{status}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.notesTitle]}>Work notes</Text>
          <TextInput
            multiline
            numberOfLines={5}
            placeholder="Describe the work performed, findings, and follow-up actions."
            style={styles.textArea}
          />

          <View style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Upload photo evidence</Text>
          </View>

          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Mark intervention complete</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f4" },
  container: { padding: 20 },
  hero: { borderRadius: 32, backgroundColor: "#0f172a", padding: 24 },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: "#94a3b8",
  },
  heading: { marginTop: 12, fontSize: 30, fontWeight: "700", color: "#ffffff" },
  reference: { marginTop: 8, fontSize: 16, color: "#cbd5e1" },
  card: { marginTop: 16, borderRadius: 32, backgroundColor: "#ffffff", padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  pills: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "#047857" },
  notesTitle: { marginTop: 24 },
  textArea: {
    marginTop: 12,
    minHeight: 120,
    borderRadius: 24,
    backgroundColor: "#f5f5f4",
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
  },
  secondaryButton: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  primaryButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
