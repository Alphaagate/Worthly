import { StatusBar, StyleSheet, View } from "react-native";
import ImageAnalyzer from "../components/ImageAnalyzer";

export default function SellScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0F" />

      <ImageAnalyzer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090A0F",
  },
});
