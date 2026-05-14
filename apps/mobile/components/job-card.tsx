import { Pressable, StyleSheet, Text, View } from "react-native";

export function JobCard({
  title,
  subtitle,
  status,
  onPress,
}: {
  title: string;
  subtitle: string;
  status: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{status}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748b",
  },
  pill: {
    borderRadius: 999,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
