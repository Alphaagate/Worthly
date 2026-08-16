import { StatusBar, StyleSheet, View } from "react-native";
import BuyerAnalyzer from "../components/BuyerAnalyzer";

export default function BuyScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090A0F" />

      <BuyerAnalyzer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090A0F",
  },
});
