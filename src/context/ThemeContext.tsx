import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";

const THEME_KEY = "@worthly_theme";

export type Theme = "dark" | "light" | "system";

const lightColors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  card: "#FFFFFF",
  text: "#111111",
  secondaryText: "#666666",
  border: "#E5E5E5",
  primary: "#111111",
  tabBar: "#FFFFFF",
};

const darkColors = {
  background: "#000000",
  surface: "#090A0F",
  card: "#15161C",
  text: "#FFFFFF",
  secondaryText: "#666666",
  border: "#222222",
  primary: "#FFFFFF",
  tabBar: "#090A0F",
};

export type ThemeColors = typeof lightColors;

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();

  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);

      if (
        savedTheme === "dark" ||
        savedTheme === "light" ||
        savedTheme === "system"
      ) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  }

  async function setTheme(value: Theme) {
    setThemeState(value);

    try {
      await AsyncStorage.setItem(THEME_KEY, value);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }

  const isDark =
    theme === "dark" || (theme === "system" && systemColorScheme !== "light");

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
