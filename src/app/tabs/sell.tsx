import { useIsFocused } from "@react-navigation/native";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import ImageAnalyzer from "../../components/ImageAnalyzer";

export default function SellScreen() {
  const isFocused = useIsFocused();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0F" />

      {isFocused && (
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.animatedContainer}
        >
          <ImageAnalyzer />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090A0F",
  },

  animatedContainer: {
    flex: 1,
  },
});
