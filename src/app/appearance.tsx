import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
export default function AppearanceScreen() {
  const { theme, isDark, setTheme } = useTheme();

  const colors = {
    background: isDark ? "#090A0F" : "#F5F5F5",
    card: isDark ? "#11131A" : "#FFFFFF",
    border: isDark ? "#20222B" : "#DDDDDD",
    text: isDark ? "#FFFFFF" : "#111111",
    secondary: isDark ? "#666666" : "#777777",
    iconBackground: isDark ? "#1A1C25" : "#EEEEEE",
    icon: isDark ? "#FFFFFF" : "#111111",
    unselected: isDark ? "#444444" : "#BBBBBB",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Appearance
        </Text>

        <View style={{ width: 25 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
          THEME
        </Text>

        <ThemeOption
          title="Dark"
          subtitle="Use Worthly's dark theme"
          icon="moon-outline"
          selected={theme === "dark"}
          onPress={() => setTheme("dark")}
          colors={colors}
        />

        <ThemeOption
          title="Light"
          subtitle="Use a light theme"
          icon="sunny-outline"
          selected={theme === "light"}
          onPress={() => setTheme("light")}
          colors={colors}
        />

        <ThemeOption
          title="System"
          subtitle="Follow your device settings"
          icon="phone-portrait-outline"
          selected={theme === "system"}
          onPress={() => setTheme("system")}
          colors={colors}
        />
      </View>
    </View>
  );
}

function ThemeOption({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  colors: {
    card: string;
    border: string;
    text: string;
    secondary: string;
    iconBackground: string;
    icon: string;
    unselected: string;
  };
}) {
  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: colors.iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.icon} />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>
          {title}
        </Text>

        <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? colors.text : colors.unselected}
      />
    </TouchableOpacity>
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
