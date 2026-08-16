import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const [loading, setLoading] = useState(false);
  const [generatingListing, setGeneratingListing] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  // EDIT LISTING
  const [editingListing, setEditingListing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editCategory, setEditCategory] = useState("");

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
        "Camera Access Needed",
        "Please allow camera access so Worthly can scan your item.",
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
      Alert.alert(
        "Photo Access Needed",
        "Please allow photo access so Worthly can analyze an item.",
      );
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
  // ANALYZE
  // --------------------------------------------------

  const analyzeImage = async (base64Data: string) => {
    setLoading(true);

    setResult(null);
    setListing(null);
    setGeneratingListing(false);

    try {
      // STEP 1 — ANALYZE ITEM

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

      console.log("AI ANALYSIS:");
      console.log(JSON.stringify(analysis, null, 2));

      setResult(analysis);

      // STEP 2 — GENERATE LISTING

      setGeneratingListing(true);

      try {
        const { data: listingData, error: listingError } =
          await supabase.functions.invoke("generate-listing", {
            body: {
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
          throw new Error("The listing generator returned no listing.");
        }

        setListing(listingData.listing);
      } catch (listingError: any) {
        console.error("LISTING GENERATION FAILED:", listingError);

        Alert.alert(
          "Listing Couldn't Be Created",
          listingError?.message ||
            "Worthly analyzed your item, but couldn't create the listing.",
        );
      } finally {
        setGeneratingListing(false);
      }
    } catch (err: any) {
      console.error("IMAGE ANALYSIS FAILED:", err);

      Alert.alert(
        "Scan Failed",
        err?.message ||
          "Worthly couldn't analyze this image. Please try another photo.",
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // EDIT LISTING
  // --------------------------------------------------

  const openEditListing = () => {
    if (!listing) return;

    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditPrice(String(listing.suggestedPrice));
    setEditCondition(listing.condition);
    setEditCategory(listing.category);

    setEditingListing(true);
  };

  const saveEditedListing = () => {
    if (!listing) return;

    const cleanedPrice = Number(editPrice.replace(/[^0-9.]/g, ""));

    if (!editTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a listing title.");
      return;
    }

    if (!editPrice || Number.isNaN(cleanedPrice) || cleanedPrice <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid asking price.");
      return;
    }

    setListing({
      ...listing,
      title: editTitle.trim(),
      description: editDescription.trim(),
      suggestedPrice: cleanedPrice,
      condition: editCondition.trim(),
      category: editCategory.trim(),
    });

    setEditingListing(false);
  };

  // --------------------------------------------------
  // SELL
  // --------------------------------------------------

  const handleSell = () => {
    Alert.alert("Ready to Sell", "Marketplace connections will be added here.");
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.header}
        >
          <View style={styles.modeBadge}>
            <View style={styles.modeDot} />
            <Text style={styles.modeText}>SELLER MODE</Text>
          </View>

          <Text style={styles.headerTitle}>Worthly</Text>

          <Text style={styles.headerSubtitle}>
            Turn things you own into money.
          </Text>
        </Animated.View>

        {/* IMAGE */}

        <Animated.View
          entering={FadeInUp.duration(500)}
          style={styles.imageContainer}
        >
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />

              {loading && (
                <>
                  <View style={styles.scanOverlay} />

                  <Animated.View style={[styles.scanLine, animatedScanStyle]} />

                  <View style={styles.scanningBadge}>
                    <ActivityIndicator size="small" color="#FFFFFF" />

                    <Text style={styles.scanningText}>ANALYZING</Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.placeholderBox}
              onPress={openCamera}
              activeOpacity={0.9}
            >
              <View style={styles.scanIconCircle}>
                <Ionicons name="camera-outline" size={32} color="#FFFFFF" />
              </View>

              <Text style={styles.placeholderTitle}>Scan an item</Text>

              <Text style={styles.placeholderSub}>
                Take a photo to discover its value
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

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

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={openGallery}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={17} color="#AAAAAA" />

          <Text style={styles.galleryText}>Choose from Camera Roll</Text>
        </TouchableOpacity>

        {/* ANALYSIS LOADING */}

        {loading && (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>

            <View style={styles.loadingContent}>
              <Text style={styles.loadingTitle}>Finding the value</Text>

              <Text style={styles.loadingSubtitle}>
                Identifying your item and checking its market value.
              </Text>
            </View>
          </View>
        )}

        {/* RESULTS */}

        {result && (
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.resultsContainer}
          >
            {/* VALUE */}

            {result.estimatedValue && (
              <View style={styles.valueCard}>
                <View style={styles.valueTopRow}>
                  <View>
                    <Text style={styles.valueEyebrow}>ESTIMATED VALUE</Text>

                    <Text style={styles.valueTitle}>What it's worth</Text>
                  </View>

                  <View style={styles.valueIcon}>
                    <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.valueMain}>
                  ${result.estimatedValue.average}
                </Text>

                <Text style={styles.valueCurrency}>
                  {result.estimatedValue.currency} • typical market value
                </Text>

                <View style={styles.rangeRow}>
                  <Text style={styles.rangeText}>
                    ${result.estimatedValue.min}
                  </Text>

                  <View style={styles.rangeLine}>
                    <View style={styles.rangeLineFill} />
                  </View>

                  <Text style={styles.rangeText}>
                    ${result.estimatedValue.max}
                  </Text>
                </View>
              </View>
            )}

            {/* ITEM SUMMARY */}

            <View style={styles.summaryCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>IDENTIFIED ITEM</Text>

                  <Text style={styles.itemName}>
                    {result.name || "Unknown item"}
                  </Text>
                </View>

                {result.confidence !== undefined && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(
                        result.confidence <= 1
                          ? result.confidence * 100
                          : result.confidence,
                      )}
                      %
                    </Text>

                    <Text style={styles.confidenceLabel}>confidence</Text>
                  </View>
                )}
              </View>

              <Text style={styles.itemMeta}>
                {result.brand || "Unknown brand"}
                {result.model ? ` • ${result.model}` : ""}
              </Text>

              <View style={styles.tagRow}>
                {result.category && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{result.category}</Text>
                  </View>
                )}

                {result.condition && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{result.condition}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* DETAILS */}

            <View style={styles.detailsCard}>
              <Text style={styles.sectionEyebrow}>ITEM DETAILS</Text>

              {result.conditionDescription && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>CONDITION</Text>

                  <Text style={styles.detailText}>
                    {result.conditionDescription}
                  </Text>
                </View>
              )}

              {result.identifyingDetails &&
                result.identifyingDetails.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>IDENTIFYING DETAILS</Text>

                    {result.identifyingDetails.map((detail, index) => (
                      <View key={index} style={styles.bulletRow}>
                        <View style={styles.bullet} />

                        <Text style={styles.bulletText}>{detail}</Text>
                      </View>
                    ))}
                  </View>
                )}

              {result.accessories && result.accessories.length > 0 && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>INCLUDED ACCESSORIES</Text>

                  {result.accessories.map((accessory, index) => (
                    <View key={index} style={styles.bulletRow}>
                      <View style={styles.bullet} />

                      <Text style={styles.bulletText}>{accessory}</Text>
                    </View>
                  ))}
                </View>
              )}

              {result.visibleText && result.visibleText.length > 0 && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>TEXT FOUND</Text>

                  <Text style={styles.detailText}>
                    {result.visibleText.join(", ")}
                  </Text>
                </View>
              )}
            </View>

            {/* LISTING GENERATION */}

            {generatingListing && (
              <View style={styles.generatingCard}>
                <ActivityIndicator size="small" color="#FFFFFF" />

                <View style={styles.generatingContent}>
                  <Text style={styles.generatingTitle}>
                    Creating your listing
                  </Text>

                  <Text style={styles.generatingSubtitle}>
                    Writing a title, description and suggested price.
                  </Text>
                </View>
              </View>
            )}

            {/* LISTING */}

            {listing && !generatingListing && (
              <Animated.View
                entering={FadeInUp.duration(500)}
                style={styles.listingCard}
              >
                <View style={styles.listingHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>READY TO SELL</Text>

                    <Text style={styles.listingTitle}>Your listing</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={openEditListing}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* TITLE */}

                <View style={styles.listingField}>
                  <Text style={styles.fieldLabel}>TITLE</Text>

                  <Text style={styles.listingTitleText}>{listing.title}</Text>
                </View>

                {/* DESCRIPTION */}

                <View style={styles.listingField}>
                  <Text style={styles.fieldLabel}>DESCRIPTION</Text>

                  <Text style={styles.listingDescription}>
                    {listing.description}
                  </Text>
                </View>

                {/* PRICE */}

                <View style={styles.suggestedPriceCard}>
                  <View>
                    <Text style={styles.fieldLabel}>
                      SUGGESTED ASKING PRICE
                    </Text>

                    <Text style={styles.suggestedPrice}>
                      ${listing.suggestedPrice}
                    </Text>
                  </View>

                  <Ionicons name="pricetag-outline" size={25} color="#FFFFFF" />
                </View>

                {/* CONDITION / CATEGORY */}

                <View style={styles.twoColumnRow}>
                  <View style={styles.smallField}>
                    <Text style={styles.fieldLabel}>CONDITION</Text>

                    <Text style={styles.smallFieldValue}>
                      {listing.condition}
                    </Text>
                  </View>

                  <View style={styles.smallField}>
                    <Text style={styles.fieldLabel}>CATEGORY</Text>

                    <Text style={styles.smallFieldValue}>
                      {listing.category}
                    </Text>
                  </View>
                </View>

                {/* KEYWORDS */}

                {listing.keywords && listing.keywords.length > 0 && (
                  <View style={styles.listingField}>
                    <Text style={styles.fieldLabel}>SEARCH KEYWORDS</Text>

                    <View style={styles.keywordContainer}>
                      {listing.keywords.map((keyword, index) => (
                        <View key={index} style={styles.keyword}>
                          <Text style={styles.keywordText}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* REASONING */}

                {listing.priceReasoning && (
                  <View style={styles.reasoningCard}>
                    <Ionicons name="bulb-outline" size={18} color="#AAAAAA" />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.reasoningTitle}>Why this price?</Text>

                      <Text style={styles.reasoningText}>
                        {listing.priceReasoning}
                      </Text>
                    </View>
                  </View>
                )}

                {/* EDIT */}

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={openEditListing}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={19} color="#000000" />

                  <Text style={styles.editButtonText}>EDIT LISTING</Text>
                </TouchableOpacity>

                {/* SELL */}

                <TouchableOpacity
                  style={styles.sellButton}
                  onPress={handleSell}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-up-circle" size={21} color="#FFFFFF" />

                  <Text style={styles.sellButtonText}>CONTINUE TO SELL</Text>

                  <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* DISCLAIMER */}

        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color="#666666"
          />

          <Text style={styles.disclaimerText}>
            Worthly's valuation is an estimate. Actual selling prices may vary
            based on condition, demand, location and timing.
          </Text>
        </View>
      </ScrollView>

      {/* ==================================================
          EDIT LISTING MODAL
          ================================================== */}

      <Modal
        visible={editingListing}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingListing(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>LISTING</Text>

                <Text style={styles.modalTitle}>Edit listing</Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setEditingListing(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* TITLE */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TITLE</Text>

                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  style={styles.input}
                  placeholder="Listing title"
                  placeholderTextColor="#555555"
                  multiline
                />
              </View>

              {/* DESCRIPTION */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION</Text>

                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Describe the item..."
                  placeholderTextColor="#555555"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* PRICE */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ASKING PRICE</Text>

                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceSymbol}>$</Text>

                  <TextInput
                    value={editPrice}
                    onChangeText={(text) =>
                      setEditPrice(text.replace(/[^0-9.]/g, ""))
                    }
                    style={styles.priceInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#555555"
                  />
                </View>
              </View>

              {/* CONDITION */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONDITION</Text>

                <TextInput
                  value={editCondition}
                  onChangeText={setEditCondition}
                  style={styles.input}
                  placeholder="Condition"
                  placeholderTextColor="#555555"
                />
              </View>

              {/* CATEGORY */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CATEGORY</Text>

                <TextInput
                  value={editCategory}
                  onChangeText={setEditCategory}
                  style={styles.input}
                  placeholder="Category"
                  placeholderTextColor="#555555"
                />
              </View>

              {/* SAVE */}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveEditedListing}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={20} color="#000000" />

                <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingListing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
    backgroundColor: "#050505",
  },

  header: {
    alignItems: "center",
    marginBottom: 26,
  },

  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#252525",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },

  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 7,
  },

  modeText: {
    color: "#AAAAAA",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1.5,
  },

  headerSubtitle: {
    color: "#777777",
    fontSize: 14,
    marginTop: 6,
  },

  imageContainer: {
    width: "100%",
    marginBottom: 14,
  },

  imageWrapper: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#282828",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  placeholderBox: {
    height: 300,
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#252525",
    justifyContent: "center",
    alignItems: "center",
  },

  scanIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  placeholderTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  placeholderSub: {
    color: "#666666",
    fontSize: 13,
    marginTop: 7,
  },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFFFFF",
  },

  scanningBadge: {
    position: "absolute",
    top: 15,
    left: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  scanningText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginLeft: 8,
  },

  primaryButton: {
    height: 56,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginLeft: 9,
  },

  galleryButton: {
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  galleryText: {
    color: "#999999",
    fontSize: 13,
    marginLeft: 7,
  },

  loadingCard: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#0B0B0B",
    borderWidth: 1,
    borderColor: "#242424",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  loadingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContent: {
    flex: 1,
    marginLeft: 12,
  },

  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  loadingSubtitle: {
    color: "#666666",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  resultsContainer: {
    width: "100%",
  },

  valueCard: {
    backgroundColor: "#0D0D0D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#303030",
    padding: 22,
    marginBottom: 14,
  },

  valueTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  valueEyebrow: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  valueTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },

  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#191919",
    justifyContent: "center",
    alignItems: "center",
  },

  valueMain: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    marginTop: 15,
  },

  valueCurrency: {
    color: "#777777",
    fontSize: 12,
    marginTop: -3,
  },

  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  rangeText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },

  rangeLine: {
    flex: 1,
    height: 4,
    backgroundColor: "#252525",
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: "hidden",
  },

  rangeLineFill: {
    width: "65%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },

  summaryCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  sectionEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 7,
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    maxWidth: width * 0.62,
  },

  itemMeta: {
    color: "#888888",
    fontSize: 13,
    marginTop: 6,
  },

  confidenceBadge: {
    alignItems: "flex-end",
  },

  confidenceText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  confidenceLabel: {
    color: "#555555",
    fontSize: 9,
    marginTop: 2,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },

  tag: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 7,
    marginBottom: 5,
  },

  tagText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "600",
  },

  detailsCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
    marginBottom: 14,
  },

  detailBlock: {
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 16,
    marginTop: 16,
  },

  detailLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  detailText: {
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 20,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
  },

  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginTop: 7,
    marginRight: 9,
  },

  bulletText: {
    flex: 1,
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 19,
  },

  generatingCard: {
    width: "100%",
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#0B0B0B",
    borderWidth: 1,
    borderColor: "#292929",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  generatingContent: {
    flex: 1,
    marginLeft: 13,
  },

  generatingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  generatingSubtitle: {
    color: "#666666",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  listingCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333333",
    padding: 20,
    marginBottom: 20,
  },

  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  listingTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  editIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },

  listingField: {
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 16,
    marginTop: 16,
  },

  fieldLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  listingTitleText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
  },

  listingDescription: {
    color: "#BBBBBB",
    fontSize: 13,
    lineHeight: 21,
  },

  suggestedPriceCard: {
    backgroundColor: "#151515",
    borderRadius: 15,
    padding: 18,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#303030",
  },

  suggestedPrice: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },

  twoColumnRow: {
    flexDirection: "row",
    marginTop: 16,
  },

  smallField: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 16,
  },

  smallFieldValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  keyword: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 6,
    marginBottom: 6,
  },

  keywordText: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "600",
  },

  reasoningCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#121212",
    borderRadius: 14,
    padding: 15,
    marginTop: 16,
  },

  reasoningTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  reasoningText: {
    color: "#888888",
    fontSize: 11,
    lineHeight: 17,
  },

  editButton: {
    height: 53,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 20,
  },

  editButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 8,
  },

  sellButton: {
    height: 53,
    backgroundColor: "#000000",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 10,
  },

  sellButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginHorizontal: 8,
  },

  disclaimer: {
    flexDirection: "row",
    paddingHorizontal: 4,
    marginTop: 3,
  },

  disclaimerText: {
    flex: 1,
    color: "#555555",
    fontSize: 10,
    lineHeight: 16,
    marginLeft: 7,
  },

  // =====================================================
  // EDIT MODAL
  // =====================================================

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },

  modalCard: {
    maxHeight: "92%",
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "#333333",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },

  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#171717",
    justifyContent: "center",
    alignItems: "center",
  },

  inputGroup: {
    marginBottom: 17,
  },

  inputLabel: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: "#FFFFFF",
    fontSize: 14,
  },

  descriptionInput: {
    minHeight: 130,
  },

  priceInputWrapper: {
    height: 55,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  priceSymbol: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  priceInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 7,
  },

  saveButton: {
    height: 55,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
  },

  saveButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 8,
  },

  cancelButton: {
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#777777",
    fontSize: 13,
  },
});
