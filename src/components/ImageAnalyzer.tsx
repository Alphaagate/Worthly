import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

// 1. We import the 'bridge' you built in Step 2 to talk to Supabase
import { supabase } from "../../lib/supabase";

export default function ImageAnalyzer() {
  // 2. These 'useState' variables are the memory of our component.
  // When these change, the screen automatically updates.
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  // 3. This function handles asking for camera permission and taking the photo
  const pickImage = async (useCamera: boolean = false) => {
    // Request permission from the user's phone
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required.");
        return;
      }
    }

    // Open the camera (or gallery) and format the result as a Base64 string
    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true, // This is crucial: it turns the image into text our AI can read
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);

      if (asset.base64) {
        analyzeImage(asset.base64);
      }
    }
  };

  // 4. This function sends the Base64 image to your Supabase Edge Function
  const analyzeImage = async (base64Data: string) => {
    setLoading(true); // Turn on the loading spinner
    setResult(null); // Clear any old results

    try {
      // Here is where we actually call your deployed 'analyze-item' function!
      const { data, error } = await supabase.functions.invoke("analyze-item", {
        body: { image: base64Data },
      });

      if (error) throw new Error(error.message);

      if (data && data.success) {
        setResult(data.result); // Save the AI's response to memory to show on screen
      } else {
        Alert.alert("Analysis Error", "Failed to analyze image.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An error occurred.");
    } finally {
      setLoading(false); // Turn off the loading spinner
    }
  };

  // 5. Everything inside 'return' is the actual UI you see on the phone screen
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Worthly Item Identifier</Text>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button title="Take Photo" onPress={() => pickImage(true)} />
        <View style={{ width: 10 }} />
        <Button title="Pick from Gallery" onPress={() => pickImage(false)} />
      </View>

      {/* Show the image if one was selected */}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      )}

      {/* Show a loading spinner while waiting for Gemini */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Analyzing item with AI...</Text>
        </View>
      )}

      {/* Show the final JSON results from Gemini */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>Analysis Results</Text>
          <Text style={styles.resultItem}>
            <Text style={styles.bold}>Name: </Text>
            {result.name}
          </Text>
          <Text style={styles.resultItem}>
            <Text style={styles.bold}>Brand: </Text>
            {result.brand}
          </Text>
          <Text style={styles.resultItem}>
            <Text style={styles.bold}>Model: </Text>
            {result.model}
          </Text>
          <Text style={styles.resultItem}>
            <Text style={styles.bold}>Category: </Text>
            {result.category}
          </Text>
          <Text style={styles.resultItem}>
            <Text style={styles.bold}>Condition: </Text>
            {result.condition}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// 6. This acts like CSS to make the app look nice
const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  buttonContainer: { flexDirection: "row", marginBottom: 20 },
  previewImage: { width: 250, height: 250, borderRadius: 12, marginBottom: 20 },
  loadingContainer: { marginVertical: 20, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  resultContainer: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginTop: 10,
  },
  resultHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  resultItem: { fontSize: 15, marginBottom: 6 },
  bold: { fontWeight: "bold" },
});
