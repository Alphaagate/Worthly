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
  conditionDescription?: string;
  visibleText?: string[];
  accessories?: string[];
  identifyingDetails?: string[];
  confidence?: number;
  estimatedValue?: EstimatedValue;
}

interface Listing {
  title: string;
  description: string;
  suggestedPrice: number;
  priceReasoning: string;
  condition: string;
  category: string;
  keywords: string[];
}

export default function ImageAnalyzer() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  // AI item analysis loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Marketplace listing generation loading state
  const [generatingListing, setGeneratingListing] = useState<boolean>(false);

  // AI analysis result
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Generated marketplace listing
  const [listing, setListing] = useState<Listing | null>(null);

  // Scanner animation
  const scanLinePos = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      scanLinePos.value = withRepeat(
        withTiming(275, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
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

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

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

  // --------------------------------------------------
  // GALLERY
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ANALYZE IMAGE
  // --------------------------------------------------

  const analyzeImage = async (base64Data: string) => {
    setLoading(true);

    // Clear previous results
    setResult(null);
    setListing(null);
    setGeneratingListing(false);

    try {
      // ==============================================
      // STEP 1
      // Analyze the image
      // ==============================================

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

      console.log("================================");
      console.log("AI ANALYSIS RESULT:");
      console.log(JSON.stringify(analysis, null, 2));
      console.log("================================");

      // Display analysis immediately
      setResult(analysis);

      // ==============================================
      // STEP 2
      // Generate marketplace listing
      // ==============================================

      setGeneratingListing(true);

      try {
        const { data: listingData, error: listingError } =
          await supabase.functions.invoke("generate-listing", {
            body: {
              // IMPORTANT:
              // Never send undefined for itemName.
              itemName: analysis.name || "Unknown item",

              brand: analysis.brand || "Unknown",

              model: analysis.model || "Unknown",

              description: analysis.conditionDescription || "",

              conditionDescription: analysis.conditionDescription || "",

              estimatedValue: analysis.estimatedValue || null,

              visibleText: analysis.visibleText || [],

              accessories: analysis.accessories || [],

              identifyingDetails: analysis.identifyingDetails || [],
            },
          });

        if (listingError) {
          throw new Error(listingError.message);
        }

        if (!listingData || !listingData.success || !listingData.listing) {
          console.error("Invalid listing response:", listingData);

          throw new Error("The listing generator returned no listing.");
        }

        console.log("================================");
        console.log("GENERATED LISTING:");
        console.log(JSON.stringify(listingData.listing, null, 2));
        console.log("================================");

        // Display generated listing
        setListing(listingData.listing);
      } catch (listingError: any) {
        console.error("================================");
        console.error("LISTING GENERATION FAILED:", listingError);
        console.error("================================");

        Alert.alert(
          "Listing Generation Failed",
          listingError?.message ||
            "The item was analyzed successfully, but the marketplace listing could not be generated.",
        );
      } finally {
        setGeneratingListing(false);
      }
    } catch (err: any) {
      console.error("Image analysis failed:", err);

      Alert.alert(
        "Scan Failed",
        err?.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VISION OS</Text>
        </View>

        <Text style={styles.headerTitle}>WORTHLY</Text>

        <Text style={styles.headerSubtitle}>
          Market intelligence, distilled.
        </Text>
      </Animated.View>

      {/* IMAGE / VIEWFINDER */}

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

      {/* CAMERA BUTTON */}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={openCamera}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={20} color="#000000" />

        <Text style={styles.btnTextBlack}>OPEN CAMERA</Text>
      </TouchableOpacity>

      {/* GALLERY BUTTON */}

      <TouchableOpacity style={styles.galleryLink} onPress={openGallery}>
        <Text style={styles.galleryLinkText}>Select from Camera Roll</Text>
      </TouchableOpacity>

      {/* ANALYSIS LOADING */}

      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#FFFFFF" />

          <Text style={styles.loadingText}>Processing telemetry...</Text>
        </View>
      )}

      {/* ANALYSIS RESULTS */}

      {/* IMPORTANT:
          This is intentionally just `result`,
          NOT `result && !loading`.
          The analysis can display while the
          marketplace listing is being generated.
      */}

      {result && (
        <Animated.View
          entering={FadeInUp.duration(600)}
          style={styles.resultsContainer}
        >
          {/* ESTIMATED VALUE */}

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

          {/* ITEM DETAILS */}

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
              <Text style={styles.detailLabel}>Category</Text>

              <Text style={styles.detailValue}>
                {result.category || "Unknown"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Visual Condition</Text>

              <Text style={styles.detailValueHighlight}>
                {result.condition || "Unknown"}
              </Text>
            </View>

            {result.confidence !== undefined && (
              <>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>AI Confidence</Text>

                  <Text style={styles.detailValueHighlight}>
                    {Math.round(
                      result.confidence <= 1
                        ? result.confidence * 100
                        : result.confidence,
                    )}
                    %
                  </Text>
                </View>
              </>
            )}

            {result.conditionDescription && (
              <>
                <View style={styles.divider} />

                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Condition Notes</Text>

                  <Text style={styles.descriptionText}>
                    {result.conditionDescription}
                  </Text>
                </View>
              </>
            )}

            {result.identifyingDetails &&
              result.identifyingDetails.length > 0 && (
                <>
                  <View style={styles.divider} />

                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Identifying Details</Text>

                    {result.identifyingDetails.map((detail, index) => (
                      <Text key={index} style={styles.listItem}>
                        • {detail}
                      </Text>
                    ))}
                  </View>
                </>
              )}

            {result.visibleText && result.visibleText.length > 0 && (
              <>
                <View style={styles.divider} />

                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Visible Text</Text>

                  {result.visibleText.map((text, index) => (
                    <Text key={index} style={styles.listItem}>
                      • {text}
                    </Text>
                  ))}
                </View>
              </>
            )}

            {result.accessories && result.accessories.length > 0 && (
              <>
                <View style={styles.divider} />

                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Accessories</Text>

                  {result.accessories.map((accessory, index) => (
                    <Text key={index} style={styles.listItem}>
                      • {accessory}
                    </Text>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* ========================================
              LISTING GENERATION
              ======================================== */}

          {generatingListing && (
            <Animated.View
              entering={FadeInUp.duration(500)}
              style={styles.listingLoadingCard}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.listingLoadingTitle}>
                Creating your listing...
              </Text>

              <Text style={styles.listingLoadingSubtitle}>
                Worthly is writing a marketplace listing based on the analysis.
              </Text>
            </Animated.View>
          )}

          {/* GENERATED LISTING */}

          {listing && !generatingListing && (
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={styles.listingContainer}
            >
              <View style={styles.listingHeader}>
                <View>
                  <Text style={styles.listingEyebrow}>MARKETPLACE</Text>

                  <Text style={styles.listingTitle}>YOUR LISTING</Text>
                </View>

                <Ionicons name="create-outline" size={26} color="#FFFFFF" />
              </View>

              {/* TITLE */}

              <View style={styles.listingField}>
                <Text style={styles.listingLabel}>TITLE</Text>

                <Text style={styles.listingValueLarge}>{listing.title}</Text>
              </View>

              {/* DESCRIPTION */}

              <View style={styles.listingField}>
                <Text style={styles.listingLabel}>DESCRIPTION</Text>

                <Text style={styles.listingDescription}>
                  {listing.description}
                </Text>
              </View>

              {/* PRICE */}

              <View style={styles.listingPriceCard}>
                <Text style={styles.listingLabel}>SUGGESTED ASKING PRICE</Text>

                <Text style={styles.listingPrice}>
                  ${listing.suggestedPrice}
                </Text>
              </View>

              {/* CONDITION */}

              <View style={styles.listingField}>
                <Text style={styles.listingLabel}>CONDITION</Text>

                <Text style={styles.listingValue}>{listing.condition}</Text>
              </View>

              {/* CATEGORY */}

              <View style={styles.listingField}>
                <Text style={styles.listingLabel}>CATEGORY</Text>

                <Text style={styles.listingValue}>{listing.category}</Text>
              </View>

              {/* KEYWORDS */}

              {listing.keywords && listing.keywords.length > 0 && (
                <View style={styles.listingField}>
                  <Text style={styles.listingLabel}>KEYWORDS</Text>

                  <View style={styles.keywordContainer}>
                    {listing.keywords.map((keyword, index) => (
                      <View key={index} style={styles.keyword}>
                        <Text style={styles.keywordText}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* PRICE REASONING */}

              {listing.priceReasoning && (
                <View style={styles.reasoningCard}>
                  <Text style={styles.listingLabel}>PRICE REASONING</Text>

                  <Text style={styles.reasoningText}>
                    {listing.priceReasoning}
                  </Text>
                </View>
              )}

              {/* EDIT BUTTON */}

              <TouchableOpacity
                style={styles.editListingButton}
                activeOpacity={0.85}
                onPress={() => {
                  Alert.alert(
                    "Edit Listing",
                    "Listing editing will be added next.",
                  );
                }}
              >
                <Ionicons name="create-outline" size={20} color="#000000" />

                <Text style={styles.editListingText}>EDIT LISTING</Text>
              </TouchableOpacity>

              {/* SELL BUTTON */}

              <TouchableOpacity
                style={styles.sellButton}
                activeOpacity={0.85}
                onPress={() => {
                  Alert.alert(
                    "Sell Item",
                    "Marketplace integration will be added next.",
                  );
                }}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={22}
                  color="#FFFFFF"
                />

                <Text style={styles.sellButtonText}>SELL THIS ITEM</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ======================================================
// STYLES
// ======================================================

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

  detailColumn: {
    paddingVertical: 14,
  },

  detailLabel: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "500",
    marginBottom: 8,
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

  descriptionText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 21,
  },

  listItem: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
  },

  // ====================================================
  // LISTING UI
  // ====================================================

  listingLoadingCard: {
    width: "100%",
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
  },

  listingLoadingTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },

  listingLoadingSubtitle: {
    color: "#777777",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },

  listingContainer: {
    width: "100%",
    marginTop: 16,
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333333",
    padding: 24,
  },

  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  listingEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 5,
  },

  listingTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },

  listingField: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },

  listingLabel: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  listingValueLarge: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
  },

  listingValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  listingDescription: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 22,
  },

  listingPriceCard: {
    marginVertical: 8,
    padding: 20,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
  },

  listingPrice: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "800",
  },

  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  keyword: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  keywordText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  reasoningCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
  },

  reasoningText: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 20,
  },

  editListingButton: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  editListingText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 8,
  },

  sellButton: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444444",
  },

  sellButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 8,
  },
});
