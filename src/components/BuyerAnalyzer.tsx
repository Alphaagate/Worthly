import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
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
  conditionDescription?: string;
  visibleText?: string[];
  accessories?: string[];
  identifyingDetails?: string[];
  confidence?: number;
  estimatedValue?: EstimatedValue;
}

type DealStatus = "GOOD" | "FAIR" | "BAD";

export default function BuyerAnalyzer() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [askingPrice, setAskingPrice] = useState("");

  const [dealStatus, setDealStatus] = useState<DealStatus | null>(null);

  const [priceDifference, setPriceDifference] = useState<number | null>(null);

  const analyzeDeal = (priceText: string, analysis: AnalysisResult | null) => {
    if (!analysis?.estimatedValue) {
      setDealStatus(null);
      setPriceDifference(null);
      return;
    }

    const price = Number(priceText);

    if (!priceText || Number.isNaN(price) || price <= 0) {
      setDealStatus(null);
      setPriceDifference(null);
      return;
    }

    const average = analysis.estimatedValue.average;

    const difference = average - price;

    setPriceDifference(difference);

    /*
      Deal thresholds:

      15%+ below estimated value = GOOD DEAL
      Between -15% and +15% = FAIR
      15%+ above estimated value = OVERPRICED
    */

    const percentageDifference = (price - average) / average;

    if (percentageDifference <= -0.15) {
      setDealStatus("GOOD");
    } else if (percentageDifference <= 0.15) {
      setDealStatus("FAIR");
    } else {
      setDealStatus("BAD");
    }
  };

  const handleAskingPriceChange = (text: string) => {
    // Only allow numbers and decimal point.
    const cleaned = text.replace(/[^0-9.]/g, "");

    setAskingPrice(cleaned);

    analyzeDeal(cleaned, result);
  };

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

      if (asset.base64) {
        analyzeImage(asset.base64);
      }
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

      if (asset.base64) {
        analyzeImage(asset.base64);
      }
    }
  };

  const analyzeImage = async (base64Data: string) => {
    setLoading(true);

    setResult(null);
    setAskingPrice("");
    setDealStatus(null);
    setPriceDifference(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-item", {
        body: {
          image: base64Data,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.success || !data.result) {
        throw new Error("The AI analysis returned no result.");
      }

      const analysis: AnalysisResult = data.result;

      console.log("===============================");
      console.log("BUYER AI ANALYSIS:");
      console.log(JSON.stringify(analysis, null, 2));
      console.log("===============================");

      setResult(analysis);
    } catch (error: any) {
      console.error("Buyer analysis failed:", error);

      Alert.alert(
        "Scan Failed",
        error?.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getDealTitle = () => {
    if (dealStatus === "GOOD") {
      return "GOOD DEAL";
    }

    if (dealStatus === "FAIR") {
      return "FAIR PRICE";
    }

    if (dealStatus === "BAD") {
      return "OVERPRICED";
    }

    return "";
  };

  const getDealExplanation = () => {
    if (!result?.estimatedValue || !askingPrice) {
      return "";
    }

    const price = Number(askingPrice);
    const average = result.estimatedValue.average;

    const percentage = Math.abs(((price - average) / average) * 100);

    if (dealStatus === "GOOD") {
      return `This item is listed approximately ${Math.round(
        percentage,
      )}% below Worthly's estimated market value.`;
    }

    if (dealStatus === "FAIR") {
      return `The asking price is reasonably close to Worthly's estimated market value.`;
    }

    if (dealStatus === "BAD") {
      return `This item is listed approximately ${Math.round(
        percentage,
      )}% above Worthly's estimated market value.`;
    }

    return "";
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BUYER MODE</Text>
          </View>

          <Text style={styles.headerTitle}>WORTHLY</Text>

          <Text style={styles.headerSubtitle}>Know what you're buying.</Text>
        </View>

        {/* IMAGE */}

        <View style={styles.imageContainer}>
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />

              {loading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />

                  <Text style={styles.imageLoadingText}>ANALYZING ITEM</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.placeholderBox}
              onPress={openCamera}
              activeOpacity={0.9}
            >
              <Ionicons name="scan-outline" size={48} color="#FFFFFF" />

              <Text style={styles.placeholderText}>SCAN AN ITEM</Text>

              <Text style={styles.placeholderSub}>
                Worthly will estimate its value
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CAMERA */}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openCamera}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={20} color="#000000" />

          <Text style={styles.primaryButtonText}>SCAN ITEM</Text>
        </TouchableOpacity>

        {/* GALLERY */}

        <TouchableOpacity style={styles.galleryButton} onPress={openGallery}>
          <Text style={styles.galleryText}>Select from Camera Roll</Text>
        </TouchableOpacity>

        {/* LOADING */}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#FFFFFF" />

            <Text style={styles.loadingText}>
              Worthly is analyzing the item...
            </Text>
          </View>
        )}

        {/* RESULTS */}

        {result && !loading && (
          <View style={styles.resultsContainer}>
            {/* ITEM */}

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>ITEM IDENTIFIED</Text>

              <Text style={styles.itemName}>
                {result.name || "Unknown Item"}
              </Text>

              <Text style={styles.itemSubtext}>
                {result.brand || "Unknown Brand"}
                {result.model ? ` • ${result.model}` : ""}
              </Text>
            </View>

            {/* ESTIMATED VALUE */}

            {result.estimatedValue && (
              <View style={styles.valueCard}>
                <Text style={styles.valueLabel}>ESTIMATED MARKET VALUE</Text>

                <Text style={styles.valueMain}>
                  ${result.estimatedValue.average}
                  <Text style={styles.valueCurrency}>
                    {" "}
                    {result.estimatedValue.currency}
                  </Text>
                </Text>

                <Text style={styles.valueRange}>
                  Typical range: ${result.estimatedValue.min} – $
                  {result.estimatedValue.max}
                </Text>
              </View>
            )}

            {/* ASKING PRICE */}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>WHAT IS THE SELLER ASKING?</Text>

              <View style={styles.priceInputContainer}>
                <Text style={styles.dollarSign}>$</Text>

                <TextInput
                  value={askingPrice}
                  onChangeText={handleAskingPriceChange}
                  placeholder="0.00"
                  placeholderTextColor="#555555"
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                />
              </View>

              <Text style={styles.inputHint}>
                Enter the seller's asking price to see if it's a good deal.
              </Text>
            </View>

            {/* DEAL RESULT */}

            {dealStatus && (
              <View
                style={[
                  styles.dealCard,
                  dealStatus === "GOOD" && styles.goodDealCard,
                  dealStatus === "FAIR" && styles.fairDealCard,
                  dealStatus === "BAD" && styles.badDealCard,
                ]}
              >
                <Ionicons
                  name={
                    dealStatus === "GOOD"
                      ? "checkmark-circle"
                      : dealStatus === "FAIR"
                        ? "remove-circle"
                        : "alert-circle"
                  }
                  size={42}
                  color="#FFFFFF"
                />

                <Text style={styles.dealTitle}>{getDealTitle()}</Text>

                {priceDifference !== null && (
                  <Text style={styles.dealDifference}>
                    {priceDifference >= 0
                      ? `$${Math.round(priceDifference)} below`
                      : `$${Math.round(Math.abs(priceDifference))} above`}{" "}
                    estimated value
                  </Text>
                )}

                <Text style={styles.dealExplanation}>
                  {getDealExplanation()}
                </Text>
              </View>
            )}

            {/* CONDITION */}

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>ITEM CONDITION</Text>

              <Text style={styles.conditionText}>
                {result.condition || "Unknown"}
              </Text>

              {result.conditionDescription && (
                <Text style={styles.conditionDescription}>
                  {result.conditionDescription}
                </Text>
              )}
            </View>

            {/* CONFIDENCE */}

            {result.confidence !== undefined && (
              <View style={styles.confidenceCard}>
                <Text style={styles.confidenceLabel}>AI CONFIDENCE</Text>

                <Text style={styles.confidenceValue}>
                  {Math.round(
                    result.confidence <= 1
                      ? result.confidence * 100
                      : result.confidence,
                  )}
                  %
                </Text>
              </View>
            )}

            {/* DISCLAIMER */}

            <View style={styles.disclaimerCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#777777"
              />

              <Text style={styles.disclaimerText}>
                Worthly's valuation is an estimate based on the information
                visible in the image. Actual prices can vary depending on
                condition, demand, location, and seller.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#090A0F",
  },

  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: "#090A0F",
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
  },

  imageContainer: {
    width: "100%",
    marginBottom: 20,
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

  imageLoadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },

  imageLoadingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 12,
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
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  placeholderSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#666666",
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  primaryButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
    letterSpacing: 1,
  },

  galleryButton: {
    marginTop: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },

  galleryText: {
    color: "#AAAAAA",
    fontSize: 13,
    paddingBottom: 2,
  },

  loadingCard: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    marginLeft: 12,
    fontSize: 13,
  },

  resultsContainer: {
    width: "100%",
    marginTop: 4,
  },

  card: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
  },

  cardEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 14,
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 29,
  },

  itemSubtext: {
    color: "#888888",
    fontSize: 13,
    marginTop: 6,
  },

  valueCard: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },

  valueLabel: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },

  valueMain: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "800",
    marginTop: 8,
  },

  valueCurrency: {
    color: "#777777",
    fontSize: 18,
  },

  valueRange: {
    color: "#666666",
    fontSize: 13,
    marginTop: 6,
  },

  priceInputContainer: {
    width: "100%",
    height: 64,
    borderWidth: 1,
    borderColor: "#444444",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#050505",
  },

  dollarSign: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },

  priceInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginLeft: 8,
  },

  inputHint: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  dealCard: {
    width: "100%",
    borderRadius: 16,
    padding: 26,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
  },

  goodDealCard: {
    backgroundColor: "#12351F",
    borderColor: "#245C35",
  },

  fairDealCard: {
    backgroundColor: "#302B12",
    borderColor: "#5A501F",
  },

  badDealCard: {
    backgroundColor: "#351515",
    borderColor: "#642525",
  },

  dealTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 12,
  },

  dealDifference: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },

  dealExplanation: {
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },

  conditionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  conditionDescription: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  confidenceCard: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  confidenceLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  confidenceValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  disclaimerCard: {
    width: "100%",
    flexDirection: "row",
    padding: 18,
    marginTop: 4,
    marginBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },

  disclaimerText: {
    flex: 1,
    color: "#666666",
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 10,
  },
});
