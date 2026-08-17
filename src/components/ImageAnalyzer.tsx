import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useTheme } from "../context/ThemeContext";

// ======================================================
// TYPES
// ======================================================

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

// ======================================================
// COMPONENT
// ======================================================

export default function ImageAnalyzer() {
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors, isDark);

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [generatingListing, setGeneratingListing] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  const [editVisible, setEditVisible] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  const scanLinePos = useSharedValue(0);

  // ======================================================
  // SCANNER ANIMATION
  // ======================================================

  useEffect(() => {
    if (loading) {
      scanLinePos.value = withRepeat(
        withTiming(270, {
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

  // ======================================================
  // CAMERA
  // ======================================================

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
      } else {
        Alert.alert(
          "Image Error",
          "Worthly could not read the selected image.",
        );
      }
    }
  };

  // ======================================================
  // GALLERY
  // ======================================================

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Photo Access Needed",
        "Please allow photo access so Worthly can analyze your item.",
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
      } else {
        Alert.alert(
          "Image Error",
          "Worthly could not read the selected image.",
        );
      }
    }
  };

  // ============================================================
  // SAVE SCAN TO HISTORY
  // ============================================================

  const saveScanToHistory = async (
    analysis: AnalysisResult,
    generatedListing: Listing | null,
  ) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        console.log(
          "No authenticated user. Scan will not be saved to history.",
        );
        return;
      }

      const { error } = await supabase.from("scan_history").insert({
        user_id: user.id,

        item_name: analysis.name || null,
        brand: analysis.brand || null,
        model: analysis.model || null,
        category: analysis.category || null,
        condition: analysis.condition || null,
        condition_description: analysis.conditionDescription || null,

        visible_text: analysis.visibleText || [],
        accessories: analysis.accessories || [],
        identifying_details: analysis.identifyingDetails || [],
        confidence: analysis.confidence ?? null,

        estimated_min: analysis.estimatedValue?.min ?? null,
        estimated_max: analysis.estimatedValue?.max ?? null,
        estimated_average: analysis.estimatedValue?.average ?? null,
        currency: analysis.estimatedValue?.currency || "USD",

        listing_title: generatedListing?.title || null,
        listing_description: generatedListing?.description || null,
        suggested_price: generatedListing?.suggestedPrice ?? null,
        price_reasoning: generatedListing?.priceReasoning || null,
        listing_condition: generatedListing?.condition || null,
        listing_category: generatedListing?.category || null,
        listing_keywords: generatedListing?.keywords || [],
      });

      if (error) {
        throw error;
      }

      console.log("================================");
      console.log("SCAN SAVED TO HISTORY");
      console.log("================================");
    } catch (error) {
      console.error("Failed to save scan history:", error);
    }
  };

  // ======================================================
  // ANALYZE IMAGE
  // ======================================================

  const analyzeImage = async (base64Data: string) => {
    setLoading(true);

    setResult(null);
    setListing(null);
    setGeneratingListing(false);

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

      console.log("================================");
      console.log("AI ANALYSIS RESULT:");
      console.log(JSON.stringify(analysis, null, 2));
      console.log("================================");

      setResult(analysis);

      setGeneratingListing(true);

      let generatedListing: Listing | null = null;

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
          console.error("Invalid listing response:", listingData);
          throw new Error("The listing generator returned no listing.");
        }

        console.log("================================");
        console.log("GENERATED LISTING:");
        console.log(JSON.stringify(listingData.listing, null, 2));
        console.log("================================");

        generatedListing = listingData.listing;

        setListing(generatedListing);
      } catch (listingError: any) {
        console.error("LISTING GENERATION FAILED:", listingError);

        Alert.alert(
          "Listing Generation Failed",
          listingError?.message ||
            "The item was analyzed successfully, but the marketplace listing could not be generated.",
        );
      } finally {
        setGeneratingListing(false);
      }

      await saveScanToHistory(analysis, generatedListing);
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

  // ======================================================
  // OPEN EDIT LISTING
  // ======================================================

  const openEditListing = () => {
    if (!listing) return;

    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditPrice(String(listing.suggestedPrice));
    setEditCondition(listing.condition);
    setEditCategory(listing.category);
    setEditKeywords(listing.keywords.join(", "));

    setEditVisible(true);
  };

  // ======================================================
  // SAVE EDITED LISTING
  // ======================================================

  const saveListingChanges = () => {
    if (!listing) return;

    const numericPrice = Number(editPrice.replace(/[^0-9.]/g, ""));

    if (!editTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your listing.");
      return;
    }

    if (!editDescription.trim()) {
      Alert.alert(
        "Missing Description",
        "Please enter a description for your listing.",
      );
      return;
    }

    if (!numericPrice || numericPrice <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid asking price.");
      return;
    }

    const keywords = editKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    setListing({
      ...listing,
      title: editTitle.trim(),
      description: editDescription.trim(),
      suggestedPrice: numericPrice,
      condition: editCondition.trim() || "Used",
      category: editCategory.trim() || "Other",
      keywords,
    });

    setEditVisible(false);

    Alert.alert("Listing Updated", "Your changes have been saved.");
  };

  // ======================================================
  // RESET
  // ======================================================

  const resetScan = () => {
    setImageUri(null);
    setResult(null);
    setListing(null);
    setLoading(false);
    setGeneratingListing(false);
  };

  // ======================================================
  // CONFIDENCE
  // ======================================================

  const confidencePercent =
    result?.confidence !== undefined
      ? Math.round(
          result.confidence <= 1 ? result.confidence * 100 : result.confidence,
        )
      : null;

  // ======================================================
  // UI
  // ======================================================

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brandText}>WORTHLY</Text>

              <Text style={styles.headerTitle}>Sell smarter.</Text>

              <Text style={styles.headerSubtitle}>
                Scan an item and discover what it's worth.
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={20} color={colors.text} />
            </View>
          </View>
        </Animated.View>

        {/* SCAN AREA */}

        <Animated.View
          entering={FadeInUp.duration(600)}
          style={styles.scanSection}
        >
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{
                  uri: imageUri,
                }}
                style={styles.previewImage}
              />

              <View style={styles.imageOverlay} />

              {loading && (
                <Animated.View style={[styles.scanLine, animatedScanStyle]} />
              )}

              {loading && (
                <View style={styles.scanningBadge}>
                  <ActivityIndicator size="small" color="#FFFFFF" />

                  <Text style={styles.scanningText}>ANALYZING</Text>
                </View>
              )}

              {!loading && (
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={openCamera}
                >
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />

                  <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyScanner}
              onPress={openCamera}
              activeOpacity={0.9}
            >
              <View style={styles.scanIconCircle}>
                <Ionicons name="scan-outline" size={34} color={colors.text} />
              </View>

              <Text style={styles.scanTitle}>Scan an item</Text>

              <Text style={styles.scanSubtitle}>
                Take a clear photo of anything you want to sell.
              </Text>

              <View style={styles.scanHint}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={colors.secondaryText}
                />

                <Text style={styles.scanHintText}>
                  AI-powered identification
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ACTION BUTTONS */}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={openCamera}
            activeOpacity={0.85}
          >
            <Ionicons
              name="camera"
              size={20}
              color={isDark ? "#000000" : "#FFFFFF"}
            />

            <Text style={styles.cameraButtonText}>TAKE PHOTO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={openGallery}
            activeOpacity={0.85}
          >
            <Ionicons name="images-outline" size={20} color={colors.text} />

            <Text style={styles.galleryButtonText}>GALLERY</Text>
          </TouchableOpacity>
        </View>

        {/* LOADING */}

        {loading && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.loadingCard}
          >
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>

            <View style={styles.loadingContent}>
              <Text style={styles.loadingTitle}>
                Worthly is analyzing your item
              </Text>

              <Text style={styles.loadingSubtitle}>
                Identifying the item, condition and market value...
              </Text>
            </View>
          </Animated.View>
        )}

        {/* RESULTS */}

        {result && (
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.resultsContainer}
          >
            {/* VALUE CARD */}

            {result.estimatedValue && (
              <View style={styles.valueCard}>
                <View style={styles.valueHeader}>
                  <View>
                    <Text style={styles.valueEyebrow}>ESTIMATED VALUE</Text>

                    <Text style={styles.valueCaption}>
                      Based on visible condition & details
                    </Text>
                  </View>

                  <View style={styles.valueSparkle}>
                    <Ionicons name="sparkles" size={17} color={colors.text} />
                  </View>
                </View>

                <Text style={styles.averagePrice}>
                  ${result.estimatedValue.average}
                </Text>

                <Text style={styles.currencyText}>
                  {result.estimatedValue.currency}
                </Text>

                <View style={styles.priceRangeRow}>
                  <View style={styles.rangeItem}>
                    <Text style={styles.rangeLabel}>LOW</Text>

                    <Text style={styles.rangeValue}>
                      ${result.estimatedValue.min}
                    </Text>
                  </View>

                  <View style={styles.rangeDivider} />

                  <View style={styles.rangeItem}>
                    <Text style={styles.rangeLabel}>LIKELY</Text>

                    <Text style={styles.rangeValue}>
                      ${result.estimatedValue.average}
                    </Text>
                  </View>

                  <View style={styles.rangeDivider} />

                  <View style={styles.rangeItem}>
                    <Text style={styles.rangeLabel}>HIGH</Text>

                    <Text style={styles.rangeValue}>
                      ${result.estimatedValue.max}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ITEM CARD */}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>AI IDENTIFICATION</Text>

                  <Text style={styles.itemName}>
                    {result.name || "Unknown item"}
                  </Text>
                </View>

                {confidencePercent !== null && (
                  <View style={styles.confidenceBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={colors.text}
                    />

                    <Text style={styles.confidenceText}>
                      {confidencePercent}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoGrid}>
                <InfoBox label="BRAND" value={result.brand || "Unknown"} />

                <InfoBox label="MODEL" value={result.model || "Unknown"} />

                <InfoBox
                  label="CATEGORY"
                  value={result.category || "Unknown"}
                />

                <InfoBox
                  label="CONDITION"
                  value={result.condition || "Unknown"}
                />
              </View>

              {result.conditionDescription && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.smallLabel}>CONDITION NOTES</Text>

                  <Text style={styles.bodyText}>
                    {result.conditionDescription}
                  </Text>
                </View>
              )}

              {result.identifyingDetails &&
                result.identifyingDetails.length > 0 && (
                  <DetailList
                    title="IDENTIFYING DETAILS"
                    items={result.identifyingDetails}
                  />
                )}

              {result.accessories && result.accessories.length > 0 && (
                <DetailList title="ACCESSORIES" items={result.accessories} />
              )}

              {result.visibleText && result.visibleText.length > 0 && (
                <DetailList title="VISIBLE TEXT" items={result.visibleText} />
              )}
            </View>

            {/* LISTING GENERATION */}

            {generatingListing && (
              <Animated.View
                entering={FadeInUp.duration(400)}
                style={styles.generatingCard}
              >
                <View style={styles.generatingIcon}>
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={colors.text}
                  />
                </View>

                <Text style={styles.generatingTitle}>
                  Creating your listing
                </Text>

                <Text style={styles.generatingSubtitle}>
                  Writing a title, description and pricing recommendation...
                </Text>

                <ActivityIndicator
                  style={{
                    marginTop: 16,
                  }}
                  size="small"
                  color={colors.text}
                />
              </Animated.View>
            )}

            {/* LISTING */}

            {listing && !generatingListing && (
              <Animated.View
                entering={FadeInUp.duration(500)}
                style={styles.listingCard}
              >
                <View style={styles.listingHeader}>
                  <View>
                    <Text style={styles.cardEyebrow}>MARKETPLACE</Text>

                    <Text style={styles.listingHeading}>Ready to sell</Text>
                  </View>

                  <View style={styles.listingIcon}>
                    <Ionicons name="pricetag" size={20} color={colors.text} />
                  </View>
                </View>

                <View style={styles.listingSection}>
                  <Text style={styles.smallLabel}>TITLE</Text>

                  <Text style={styles.listingTitleText}>{listing.title}</Text>
                </View>

                <View style={styles.askingPriceCard}>
                  <View>
                    <Text style={styles.smallLabel}>
                      SUGGESTED ASKING PRICE
                    </Text>

                    <Text style={styles.askingPrice}>
                      ${listing.suggestedPrice}
                    </Text>
                  </View>

                  <View style={styles.priceSuggestionIcon}>
                    <Ionicons
                      name="trending-up"
                      size={20}
                      color={colors.text}
                    />
                  </View>
                </View>

                <View style={styles.listingSection}>
                  <Text style={styles.smallLabel}>DESCRIPTION</Text>

                  <Text style={styles.listingDescription}>
                    {listing.description}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>CONDITION</Text>

                    <Text style={styles.metaValue}>{listing.condition}</Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>CATEGORY</Text>

                    <Text style={styles.metaValue}>{listing.category}</Text>
                  </View>
                </View>

                {listing.keywords && listing.keywords.length > 0 && (
                  <View style={styles.listingSection}>
                    <Text style={styles.smallLabel}>SEARCH KEYWORDS</Text>

                    <View style={styles.keywordContainer}>
                      {listing.keywords.map((keyword, index) => (
                        <View key={index} style={styles.keyword}>
                          <Text style={styles.keywordText}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {listing.priceReasoning && (
                  <View style={styles.reasoningBox}>
                    <View style={styles.reasoningHeader}>
                      <Ionicons
                        name="bulb-outline"
                        size={17}
                        color={colors.text}
                      />

                      <Text style={styles.reasoningTitle}>Why this price?</Text>
                    </View>

                    <Text style={styles.reasoningText}>
                      {listing.priceReasoning}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={openEditListing}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color={isDark ? "#000000" : "#FFFFFF"}
                  />

                  <Text style={styles.editButtonText}>EDIT LISTING</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sellButton}
                  onPress={() =>
                    Alert.alert(
                      "Coming Next",
                      "Marketplace posting will be connected after the MVP listing flow is finished.",
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={21}
                    color={colors.text}
                  />

                  <Text style={styles.sellButtonText}>SELL THIS ITEM</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* SCAN ANOTHER */}

            <TouchableOpacity
              style={styles.scanAnotherButton}
              onPress={resetScan}
              activeOpacity={0.8}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.secondaryText}
              />

              <Text style={styles.scanAnotherText}>SCAN ANOTHER ITEM</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* EDIT LISTING MODAL */}

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>MARKETPLACE</Text>

              <Text style={styles.modalTitle}>Edit Listing</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditVisible(false)}
            >
              <Ionicons name="close" size={23} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <EditField
              label="TITLE"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter a listing title"
            />

            <EditField
              label="ASKING PRICE"
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="700"
              keyboardType="decimal-pad"
            />

            <EditField
              label="DESCRIPTION"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Describe the item..."
              multiline
              minHeight={150}
            />

            <EditField
              label="CONDITION"
              value={editCondition}
              onChangeText={setEditCondition}
              placeholder="Used"
            />

            <EditField
              label="CATEGORY"
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Laptops"
            />

            <EditField
              label="KEYWORDS"
              value={editKeywords}
              onChangeText={setEditKeywords}
              placeholder="ThinkPad, Lenovo, laptop, AMD"
              multiline
            />

            <Text style={styles.keywordHelp}>
              Separate keywords with commas.
            </Text>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveListingChanges}
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color={isDark ? "#000000" : "#FFFFFF"}
              />

              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ======================================================
// INFO BOX
// ======================================================

function InfoBox({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors, colors.background === "#000000");

  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ======================================================
// DETAIL LIST
// ======================================================

function DetailList({ title, items }: { title: string; items: string[] }) {
  const { colors } = useTheme();
  const styles = createStyles(colors, colors.background === "#000000");

  return (
    <View style={styles.detailList}>
      <Text style={styles.smallLabel}>{title}</Text>

      {items.map((item, index) => (
        <View key={index} style={styles.detailItem}>
          <View style={styles.detailDot} />

          <Text style={styles.detailItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ======================================================
// EDIT FIELD
// ======================================================

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  minHeight,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad" | "numeric";
  minHeight?: number;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors, colors.background === "#000000");

  return (
    <View style={styles.editFieldContainer}>
      <Text style={styles.editFieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.editInput,
          multiline && styles.editInputMultiline,
          minHeight ? { minHeight } : null,
        ]}
      />
    </View>
  );
}

// ======================================================
// THEME-AWARE STYLES
// ======================================================

function createStyles(
  colors: ReturnType<typeof useTheme>["colors"],
  isDark: boolean,
) {
  const dark = isDark;

  const muted = dark ? "#777777" : "#666666";
  const subtle = dark ? "#555555" : "#888888";
  const faint = dark ? "#686868" : "#777777";
  const divider = dark ? "#222329" : "#E5E5E5";
  const cardBorder = dark ? "#25262C" : "#E0E0E0";
  const surfaceDark = dark ? "#111217" : "#F5F5F5";
  const deeperSurface = dark ? "#0C0D11" : "#FFFFFF";
  const inputBackground = dark ? "#111217" : "#F5F5F5";

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flexGrow: 1,
      paddingHorizontal: 18,
      paddingTop: 18,
    },

    bottomSpace: {
      height: 50,
    },

    header: {
      marginBottom: 22,
    },

    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    brandText: {
      color: muted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 3,
      marginBottom: 6,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 31,
      fontWeight: "800",
      letterSpacing: -1,
    },

    headerSubtitle: {
      color: colors.secondaryText,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 280,
    },

    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    scanSection: {
      width: "100%",
      marginBottom: 12,
    },

    emptyScanner: {
      height: 300,
      width: "100%",
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 30,
    },

    scanIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
    },

    scanTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
    },

    scanSubtitle: {
      color: colors.secondaryText,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      marginTop: 7,
      maxWidth: 280,
    },

    scanHint: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.card,
    },

    scanHintText: {
      color: colors.secondaryText,
      fontSize: 11,
      marginLeft: 6,
      fontWeight: "600",
    },

    imageWrapper: {
      width: "100%",
      height: 300,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    previewImage: {
      width: "100%",
      height: "100%",
    },

    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.08)",
    },

    scanLine: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 2,
      backgroundColor: "#FFFFFF",
      opacity: 0.9,
    },

    scanningBadge: {
      position: "absolute",
      top: 15,
      left: 15,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.72)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
    },

    scanningText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginLeft: 7,
    },

    changePhotoButton: {
      position: "absolute",
      right: 14,
      bottom: 14,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.75)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
    },

    changePhotoText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
      marginLeft: 6,
      letterSpacing: 0.8,
    },

    actionRow: {
      flexDirection: "row",
      width: "100%",
      gap: 10,
      marginBottom: 18,
    },

    cameraButton: {
      flex: 1,
      height: 54,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },

    cameraButtonText: {
      color: isDark ? "#000000" : "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.7,
      marginLeft: 7,
    },

    galleryButton: {
      flex: 1,
      height: 54,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },

    galleryButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.7,
      marginLeft: 7,
    },

    loadingCard: {
      width: "100%",
      padding: 17,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    loadingIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },

    loadingContent: {
      flex: 1,
      marginLeft: 12,
    },

    loadingTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },

    loadingSubtitle: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    resultsContainer: {
      width: "100%",
    },

    valueCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      marginBottom: 14,
    },

    valueHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    valueEyebrow: {
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.7,
    },

    valueCaption: {
      color: subtle,
      fontSize: 10,
      marginTop: 4,
    },

    valueSparkle: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },

    averagePrice: {
      color: colors.text,
      fontSize: 54,
      fontWeight: "800",
      letterSpacing: -2,
      marginTop: 18,
    },

    currencyText: {
      color: colors.secondaryText,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.5,
      marginTop: -4,
    },

    priceRangeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 22,
      paddingTop: 17,
      borderTopWidth: 1,
      borderTopColor: divider,
    },

    rangeItem: {
      flex: 1,
    },

    rangeLabel: {
      color: subtle,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    rangeValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      marginTop: 4,
    },

    rangeDivider: {
      width: 1,
      height: 30,
      backgroundColor: divider,
      marginHorizontal: 10,
    },

    card: {
      width: "100%",
      backgroundColor: deeperSurface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 20,
      marginBottom: 14,
    },

    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },

    cardEyebrow: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.6,
    },

    itemName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 26,
      marginTop: 5,
      maxWidth: 245,
    },

    confidenceBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },

    confidenceText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      marginLeft: 5,
    },

    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
    },

    infoBox: {
      width: "50%",
      paddingHorizontal: 4,
      marginBottom: 15,
    },

    infoLabel: {
      color: subtle,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    infoValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 5,
    },

    descriptionBox: {
      borderTopWidth: 1,
      borderTopColor: divider,
      paddingTop: 17,
      marginTop: 2,
    },

    smallLabel: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: 8,
    },

    bodyText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },

    detailList: {
      borderTopWidth: 1,
      borderTopColor: divider,
      marginTop: 17,
      paddingTop: 17,
    },

    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },

    detailDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.secondaryText,
      marginTop: 7,
      marginRight: 9,
    },

    detailItemText: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
    },

    generatingCard: {
      width: "100%",
      backgroundColor: deeperSurface,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      marginBottom: 14,
    },

    generatingIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },

    generatingTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginTop: 14,
    },

    generatingSubtitle: {
      color: colors.secondaryText,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 270,
    },

    listingCard: {
      width: "100%",
      backgroundColor: deeperSurface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: cardBorder,
      padding: 20,
      marginBottom: 14,
    },

    listingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 22,
    },

    listingHeading: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
      marginTop: 4,
    },

    listingIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },

    listingSection: {
      borderTopWidth: 1,
      borderTopColor: divider,
      paddingTop: 17,
      marginTop: 2,
      marginBottom: 17,
    },

    listingTitleText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 25,
    },

    listingDescription: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 21,
    },

    askingPriceCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      padding: 17,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },

    askingPrice: {
      color: colors.text,
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1,
    },

    priceSuggestionIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },

    metaRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 4,
    },

    metaPill: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 13,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },

    metaLabel: {
      color: subtle,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1,
    },

    metaValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 5,
    },

    keywordContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    keyword: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 16,
    },

    keywordText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "600",
    },

    reasoningBox: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      marginBottom: 4,
    },

    reasoningHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    reasoningTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      marginLeft: 7,
    },

    reasoningText: {
      color: colors.secondaryText,
      fontSize: 12,
      lineHeight: 19,
    },

    editButton: {
      width: "100%",
      height: 53,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginTop: 18,
    },

    editButtonText: {
      color: isDark ? "#000000" : "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginLeft: 7,
    },

    sellButton: {
      width: "100%",
      height: 53,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginTop: 10,
    },

    sellButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginLeft: 7,
    },

    scanAnotherButton: {
      height: 50,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 20,
    },

    scanAnotherText: {
      color: colors.secondaryText,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      marginLeft: 7,
    },

    modalScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    modalHeader: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    modalEyebrow: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    modalTitle: {
      color: colors.text,
      fontSize: 25,
      fontWeight: "800",
      marginTop: 3,
    },

    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },

    modalContent: {
      padding: 20,
      paddingBottom: 50,
    },

    editFieldContainer: {
      marginBottom: 20,
    },

    editFieldLabel: {
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.3,
      marginBottom: 8,
    },

    editInput: {
      width: "100%",
      minHeight: 53,
      backgroundColor: inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 14,
    },

    editInputMultiline: {
      paddingTop: 14,
      paddingBottom: 14,
      lineHeight: 20,
    },

    keywordHelp: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: -12,
      marginBottom: 22,
    },

    saveButton: {
      width: "100%",
      height: 55,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },

    saveButtonText: {
      color: isDark ? "#000000" : "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginLeft: 7,
    },

    cancelButton: {
      width: "100%",
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
    },

    cancelButtonText: {
      color: colors.secondaryText,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
