import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ExploreScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={48} color="#007AFF" />
        <Text style={styles.title}>Valuation History</Text>
        <Text style={styles.subtitle}>
          Your previously scanned items and market estimates will appear here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F2F2F7",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1C1C1E",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },
});
