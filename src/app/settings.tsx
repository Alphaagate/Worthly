import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const { isDark } = useTheme();

  const background = isDark ? "#090A0F" : "#F5F5F7";
  const text = isDark ? "#FFFFFF" : "#111111";
  const secondary = isDark ? "#666666" : "#777777";
  const card = isDark ? "#11131A" : "#FFFFFF";
  const border = isDark ? "#20222B" : "#DDDDDD";
  const iconBackground = isDark ? "#1A1C25" : "#EEEEF2";

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color={text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: text }]}>Settings</Text>

        <View style={{ width: 25 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: secondary }]}>
          PREFERENCES
        </Text>

        <TouchableOpacity
          style={[
            styles.option,
            {
              backgroundColor: card,
              borderColor: border,
            },
          ]}
          onPress={() => router.push("/appearance")}
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor: iconBackground,
              },
            ]}
          >
            <Ionicons name="moon-outline" size={22} color={text} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, { color: text }]}>
              Appearance
            </Text>

            <Text style={[styles.optionSubtitle, { color: secondary }]}>
              Choose your app theme
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={secondary} />
        </TouchableOpacity>

        <Text
          style={[
            styles.sectionTitle,
            {
              marginTop: 30,
              color: secondary,
            },
          ]}
        >
          ABOUT
        </Text>

        <TouchableOpacity
          style={[
            styles.option,
            {
              backgroundColor: card,
              borderColor: border,
            },
          ]}
          onPress={() => router.push("/about")}
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor: iconBackground,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={text}
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, { color: text }]}>
              About Worthly
            </Text>

            <Text style={[styles.optionSubtitle, { color: secondary }]}>
              App information and version
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  textContainer: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  optionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
});
