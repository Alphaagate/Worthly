import { SafeAreaView, StyleSheet } from "react-native";

// Imports your component from src/components/ImageAnalyzer.tsx
import ImageAnalyzer from "../components/ImageAnalyzer";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ImageAnalyzer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
