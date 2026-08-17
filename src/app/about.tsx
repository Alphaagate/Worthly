import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>About Worthly</Text>

        <View style={{ width: 25 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.logo}>
          <Ionicons name="cube-outline" size={42} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>Worthly</Text>

        <Text style={styles.version}>Version 1.0.0</Text>

        <Text style={styles.description}>
          Worthly uses AI to identify items, estimate their value, and help you
          understand what your belongings are worth.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>APP</Text>
          <Text style={styles.infoValue}>Worthly</Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>VERSION</Text>
          <Text style={styles.infoValue}>1.0.0</Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>POWERED BY</Text>
          <Text style={styles.infoValue}>AI + Worthly</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090A0F",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 20,
    alignItems: "center",
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: "#11131A",
    borderWidth: 1,
    borderColor: "#292B35",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 18,
  },

  version: {
    color: "#666666",
    fontSize: 13,
    marginTop: 5,
  },

  description: {
    color: "#888888",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 25,
    maxWidth: 340,
  },

  infoCard: {
    width: "100%",
    backgroundColor: "#11131A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#20222B",
    padding: 20,
    marginTop: 30,
  },

  infoLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#20222B",
    marginVertical: 15,
  },
});
