import { useIsFocused } from "@react-navigation/native";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import BuyerAnalyzer from "../../components/BuyerAnalyzer";
import { useTheme } from "../../context/ThemeContext";

export default function BuyScreen() {
  const isFocused = useIsFocused();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {isFocused && (
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.animatedContainer}
        >
          <BuyerAnalyzer />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  animatedContainer: {
    flex: 1,
  },
});
