import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const slots = [
  "08:30 HVAC tune-up",
  "10:00 Refrigeration inspection",
  "13:30 Emergency boiler reset",
  "16:00 Preventive maintenance",
];

export default function ScheduleScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Today&apos;s schedule</Text>
        <Text style={styles.description}>
          Mobile schedule view aligned with the web dispatch board.
        </Text>
        <View style={styles.list}>
          {slots.map((slot) => (
            <View key={slot} style={styles.card}>
              <Text style={styles.cardText}>{slot}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f4" },
  container: { padding: 20 },
  heading: { fontSize: 30, fontWeight: "700", color: "#0f172a" },
  description: { marginTop: 8, fontSize: 16, color: "#64748b" },
  list: { marginTop: 24, gap: 12 },
  card: { borderRadius: 28, backgroundColor: "#ffffff", padding: 20 },
  cardText: { fontSize: 16, fontWeight: "500", color: "#1e293b" },
});
