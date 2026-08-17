import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

const NOTIFICATIONS_KEY = "@worthly_notifications_enabled";

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadSetting();
  }, []);

  async function loadSetting() {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATIONS_KEY);

      if (saved !== null) {
        setEnabled(saved === "true");
      }
    } catch (error) {
      console.error("Failed to load notification setting:", error);
    }
  }

  async function toggleNotifications(value: boolean) {
    setEnabled(value);

    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? "true" : "false");
    } catch (error) {
      console.error("Failed to save notification setting:", error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={{ width: 25 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.option}>
          <View style={styles.icon}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>Notifications</Text>

            <Text style={styles.optionSubtitle}>
              {enabled
                ? "Notifications are enabled"
                : "Notifications are disabled"}
            </Text>
          </View>

          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            trackColor={{
              false: "#333333",
              true: "#666666",
            }}
            thumbColor="#FFFFFF"
          />
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
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#11131A",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#20222B",
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1A1C25",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  textContainer: {
    flex: 1,
  },

  optionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  optionSubtitle: {
    color: "#666666",
    fontSize: 12,
    marginTop: 4,
  },
});
