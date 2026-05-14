import { router } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { JobCard } from "../../components/job-card";

const jobs = [
  {
    id: "cmdemojob000000000000000001",
    title: "Quarterly refrigeration inspection",
    subtitle: "Northwind Bakery • Today 10:00",
    status: "Scheduled",
  },
  {
    id: "cmdemojob000000000000000002",
    title: "Emergency boiler reset",
    subtitle: "Summit Lofts • Today 13:30",
    status: "In Progress",
  },
];

export default function JobsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Technician queue</Text>
          <Text style={styles.heading}>Assigned interventions</Text>
          <Text style={styles.description}>
            Update status, capture notes, and complete work with a field-first flow.
          </Text>
        </View>

        {jobs.map((job) => (
          <JobCard
            key={job.id}
            title={job.title}
            subtitle={job.subtitle}
            status={job.status}
            onPress={() => router.push(`/job/${job.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f4" },
  container: { padding: 20 },
  hero: {
    marginBottom: 24,
    borderRadius: 32,
    backgroundColor: "#0f172a",
    padding: 24,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: "#94a3b8",
  },
  heading: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: "700",
    color: "#ffffff",
  },
  description: {
    marginTop: 8,
    fontSize: 16,
    color: "#cbd5e1",
  },
});
