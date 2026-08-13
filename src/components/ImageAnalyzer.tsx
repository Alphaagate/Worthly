import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");

interface EstimatedValue {
  min: number;
  max: number;
  average: number;
  currency: string;
}

interface AnalysisResult {
  name?: string;
  brand?: string;
  model?: string;
  category?: string;
  condition?: string;
  estimatedValue?: EstimatedValue;
}

export default function ImageAnalyzer() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Sleek, smooth animated scanner sweep
  const scanLinePos = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      scanLinePos.value = withRepeat(
        withTiming(275, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      scanLinePos.value = 0;
    }
  }, [loading]);

  const animatedScanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePos.value }],
  }));

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to scan items.",
      );
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);
      if (asset.base64) analyzeImage(asset.base64);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);
      if (asset.base64) analyzeImage(asset.base64);
    }
  };

  const analyzeImage = async (base64Data: string) => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-item", {
        body: { image: base64Data },
      });

      if (error) throw new Error(error.message);

      if (data && data.success) {
        setResult(data.result);
      } else {
        Alert.alert("Error", "Could not analyze the image.");
      }
    } catch (err: any) {
      Alert.alert(
        "Scan Failed",
        err.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Minimalist Brutalist Header */}
      <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VISION OS</Text>
        </View>
        <Text style={styles.headerTitle}>WORTHLY</Text>
        <Text style={styles.headerSubtitle}>
          Market intelligence, distilled.
        </Text>
      </Animated.View>

      {/* Viewfinder / Sensor Area */}
      <Animated.View
        entering={FadeInUp.duration(800)}
        style={styles.imageContainer}
      >
        {imageUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            {loading && (
              <Animated.View style={[styles.scanLine, animatedScanStyle]} />
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.placeholderBox}
            onPress={openCamera}
            activeOpacity={0.9}
          >
            <Ionicons name="scan-outline" size={48} color="#FFFFFF" />
            <Text style={styles.placeholderText}>ACTIVATE SENSOR</Text>
            <Text style={styles.placeholderSub}>
              Tap to open the camera module
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* High-Contrast Action Button */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={openCamera}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={20} color="#000000" />
        <Text style={styles.btnTextBlack}>OPEN CAMERA</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.galleryLink} onPress={openGallery}>
        <Text style={styles.galleryLinkText}>Select from Camera Roll</Text>
      </TouchableOpacity>

      {/* Monochromatic Loading State */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>Processing telemetry...</Text>
        </View>
      )}

      {/* Refined Results HUD */}
      {result && !loading && (
        <Animated.View
          entering={FadeInUp.duration(600)}
          style={styles.resultsContainer}
        >
          {result.estimatedValue && (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>ESTIMATED MARKET VALUE</Text>
              <Text style={styles.priceMain}>
                ${result.estimatedValue.average}
                <Text style={styles.currency}>
                  {" "}
                  {result.estimatedValue.currency}
                </Text>
              </Text>
              <Text style={styles.priceRange}>
                Range: ${result.estimatedValue.min} – $
                {result.estimatedValue.max}
              </Text>
            </View>
          )}

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>ASSET DETAILS</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Identity</Text>
              <Text style={styles.detailValue}>{result.name || "Unknown"}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Manufacturer</Text>
              <Text style={styles.detailValue}>
                {result.brand || "Unknown"}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Model Series</Text>
              <Text style={styles.detailValue}>
                {result.model || "Unknown"}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Visual Condition</Text>
              <Text style={styles.detailValueHighlight}>
                {result.condition || "Unknown"}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#000000",
    alignItems: "center",
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#111111",
    borderColor: "#333333",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#888888",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  imageWrapper: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#0A0A0A",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 0px 8px rgba(255, 255, 255, 0.8)",
  },
  placeholderBox: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  placeholderSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#666666",
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTextBlack: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
    letterSpacing: 1,
  },
  galleryLink: {
    marginTop: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },
  galleryLinkText: {
    color: "#AAAAAA",
    fontSize: 13,
    fontWeight: "500",
    paddingBottom: 2,
  },
  loadingCard: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    flexDirection: "row",
    justifyContent: "center",
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  resultsContainer: {
    width: "100%",
    paddingBottom: 40,
    marginTop: 10,
  },
  priceCard: {
    backgroundColor: "#0A0A0A",
    borderColor: "#333333",
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  priceLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  priceMain: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  currency: {
    fontSize: 20,
    color: "#888888",
    fontWeight: "600",
  },
  priceRange: {
    marginTop: 8,
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },
  detailsCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#222222",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 2,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  detailValueHighlight: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
  },
});
