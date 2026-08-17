import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

interface ScanHistory {
  id: string;

  item_name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  condition_description: string | null;

  visible_text: string[];
  accessories: string[];
  identifying_details: string[];

  confidence: number | null;

  estimated_min: number | null;
  estimated_max: number | null;
  estimated_average: number | null;
  currency: string | null;

  listing_title: string | null;
  listing_description: string | null;
  suggested_price: number | null;
  price_reasoning: string | null;
  listing_condition: string | null;
  listing_category: string | null;
  listing_keywords: string[];

  created_at: string;
}

export default function ExploreScreen() {
  const isFocused = useIsFocused();
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors);

  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ScanHistory | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setHistory((data || []) as ScanHistory[]);
    } catch (error: any) {
      console.error("Failed to load scan history:", error);

      Alert.alert(
        "History Error",
        error?.message || "Could not load your scan history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadHistory();

    setRefreshing(false);
  };

  const deleteScan = (scan: ScanHistory) => {
    Alert.alert(
      "Delete Scan",
      `Delete "${scan.item_name || "this item"}" from your history?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("scan_history")
                .delete()
                .eq("id", scan.id);

              if (error) {
                throw error;
              }

              setSelectedItem(null);

              setHistory((current) =>
                current.filter((item) => item.id !== scan.id),
              );
            } catch (error: any) {
              console.error("Delete history error:", error);

              Alert.alert(
                "Delete Failed",
                error?.message || "Could not delete this scan.",
              );
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (selectedItem) {
    const item = selectedItem;

    return (
      <View style={styles.screen}>
        {isFocused && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.animatedContainer}
          >
            <ScrollView
              style={styles.screen}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedItem(null)}
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />

                <Text style={styles.backText}>HISTORY</Text>
              </TouchableOpacity>

              <View style={styles.detailHeader}>
                <View style={styles.historyIconLarge}>
                  <Ionicons name="cube-outline" size={30} color={colors.text} />
                </View>

                <Text style={styles.detailTitle}>
                  {item.item_name || "Unknown Item"}
                </Text>

                <Text style={styles.detailDate}>
                  {formatDate(item.created_at)} • {formatTime(item.created_at)}
                </Text>
              </View>

              {item.estimated_average !== null && (
                <View style={styles.valueCard}>
                  <Text style={styles.valueLabel}>ESTIMATED MARKET VALUE</Text>

                  <Text style={styles.valueMain}>
                    ${item.estimated_average}
                  </Text>

                  <Text style={styles.valueCurrency}>
                    {item.currency || "USD"}
                  </Text>

                  {item.estimated_min !== null &&
                    item.estimated_max !== null && (
                      <Text style={styles.valueRange}>
                        ${item.estimated_min} – ${item.estimated_max}
                      </Text>
                    )}
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>ASSET DETAILS</Text>

                <DetailRow
                  label="Brand"
                  value={item.brand || "Unknown"}
                  colors={colors}
                />

                <Divider colors={colors} />

                <DetailRow
                  label="Model"
                  value={item.model || "Unknown"}
                  colors={colors}
                />

                <Divider colors={colors} />

                <DetailRow
                  label="Category"
                  value={item.category || "Unknown"}
                  colors={colors}
                />

                <Divider colors={colors} />

                <DetailRow
                  label="Condition"
                  value={item.condition || "Unknown"}
                  colors={colors}
                />

                {item.confidence !== null && (
                  <>
                    <Divider colors={colors} />

                    <DetailRow
                      label="AI Confidence"
                      value={`${Math.round(
                        item.confidence <= 1
                          ? item.confidence * 100
                          : item.confidence,
                      )}%`}
                      colors={colors}
                    />
                  </>
                )}
              </View>

              {item.condition_description && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>CONDITION NOTES</Text>

                  <Text style={styles.bodyText}>
                    {item.condition_description}
                  </Text>
                </View>
              )}

              {item.identifying_details?.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>IDENTIFYING DETAILS</Text>

                  {item.identifying_details.map((detail, index) => (
                    <Text key={index} style={styles.listItem}>
                      • {detail}
                    </Text>
                  ))}
                </View>
              )}

              {item.visible_text?.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>VISIBLE TEXT</Text>

                  {item.visible_text.map((text, index) => (
                    <Text key={index} style={styles.listItem}>
                      • {text}
                    </Text>
                  ))}
                </View>
              )}

              {item.accessories?.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>ACCESSORIES</Text>

                  {item.accessories.map((accessory, index) => (
                    <Text key={index} style={styles.listItem}>
                      • {accessory}
                    </Text>
                  ))}
                </View>
              )}

              {item.listing_title && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>MARKETPLACE LISTING</Text>

                  <Text style={styles.fieldLabel}>TITLE</Text>

                  <Text style={styles.listingTitle}>{item.listing_title}</Text>

                  {item.listing_description && (
                    <>
                      <Text style={styles.fieldLabel}>DESCRIPTION</Text>

                      <Text style={styles.bodyText}>
                        {item.listing_description}
                      </Text>
                    </>
                  )}

                  {item.suggested_price !== null && (
                    <View style={styles.suggestedPrice}>
                      <Text style={styles.fieldLabel}>SUGGESTED PRICE</Text>

                      <Text style={styles.suggestedPriceText}>
                        ${item.suggested_price}
                      </Text>
                    </View>
                  )}

                  {item.price_reasoning && (
                    <>
                      <Text style={styles.fieldLabel}>PRICE REASONING</Text>

                      <Text style={styles.bodyText}>
                        {item.price_reasoning}
                      </Text>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteScan(item)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.text} />

                <Text style={styles.deleteText}>DELETE SCAN</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isFocused && (
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.animatedContainer}
        >
          <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.text}
              />
            }
          >
            <View style={styles.header}>
              <Text style={styles.eyebrow}>WORTHLY</Text>

              <Text style={styles.title}>Scan History</Text>

              <Text style={styles.subtitle}>Every item you've analyzed.</Text>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text} />

                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            )}

            {!loading && history.length === 0 && (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="time-outline" size={42} color={colors.text} />
                </View>

                <Text style={styles.emptyTitle}>No scans yet</Text>

                <Text style={styles.emptyText}>
                  Items you analyze with Worthly will appear here.
                </Text>
              </View>
            )}

            {!loading &&
              history.map((scan) => (
                <TouchableOpacity
                  key={scan.id}
                  style={styles.historyCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedItem(scan)}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons
                      name="cube-outline"
                      size={25}
                      color={colors.text}
                    />
                  </View>

                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName} numberOfLines={1}>
                      {scan.item_name || "Unknown Item"}
                    </Text>

                    <Text style={styles.historyMeta}>
                      {scan.brand || "Unknown brand"}
                      {scan.model ? ` • ${scan.model}` : ""}
                    </Text>

                    <Text style={styles.historyDate}>
                      {formatDate(scan.created_at)}
                    </Text>
                  </View>

                  <View style={styles.historyPrice}>
                    {scan.estimated_average !== null ? (
                      <>
                        <Text style={styles.historyPriceText}>
                          ${scan.estimated_average}
                        </Text>

                        <Text style={styles.historyCurrency}>
                          {scan.currency || "USD"}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.noPrice}>N/A</Text>
                    )}

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.secondaryText}
                    />
                  </View>
                </TouchableOpacity>
              ))}

            {!loading && history.length > 0 && (
              <Text style={styles.scanCount}>
                {history.length} {history.length === 1 ? "scan" : "scans"}
              </Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 11,
      }}
    >
      <Text
        style={{
          color: colors.secondaryText,
          fontSize: 13,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: "600",
          maxWidth: "60%",
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
      }}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    animatedContainer: {
      flex: 1,
    },

    container: {
      padding: 20,
      paddingTop: 55,
    },

    header: {
      marginBottom: 28,
    },

    eyebrow: {
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 8,
    },

    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: "800",
      letterSpacing: -1,
    },

    subtitle: {
      color: colors.secondaryText,
      fontSize: 14,
      marginTop: 7,
    },

    loadingContainer: {
      alignItems: "center",
      paddingVertical: 60,
    },

    loadingText: {
      color: colors.secondaryText,
      marginTop: 14,
      fontSize: 13,
    },

    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 35,
      alignItems: "center",
    },

    emptyIcon: {
      width: 75,
      height: 75,
      borderRadius: 40,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },

    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
    },

    historyCard: {
      width: "100%",
      minHeight: 95,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      marginBottom: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    historyIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    historyInfo: {
      flex: 1,
      marginLeft: 14,
      marginRight: 10,
    },

    historyName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },

    historyMeta: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 5,
    },

    historyDate: {
      color: colors.secondaryText,
      fontSize: 10,
      marginTop: 6,
    },

    historyPrice: {
      alignItems: "flex-end",
    },

    historyPriceText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },

    historyCurrency: {
      color: colors.secondaryText,
      fontSize: 9,
      marginTop: 2,
      marginBottom: 4,
    },

    noPrice: {
      color: colors.secondaryText,
      fontSize: 13,
      marginBottom: 7,
    },

    scanCount: {
      color: colors.secondaryText,
      textAlign: "center",
      fontSize: 11,
      marginTop: 10,
    },

    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 30,
    },

    backText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginLeft: 9,
    },

    detailHeader: {
      alignItems: "center",
      marginBottom: 25,
    },

    historyIconLarge: {
      width: 70,
      height: 70,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },

    detailTitle: {
      color: colors.text,
      fontSize: 27,
      fontWeight: "800",
      textAlign: "center",
    },

    detailDate: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 7,
    },

    valueCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 25,
      alignItems: "center",
      marginBottom: 14,
    },

    valueLabel: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.8,
    },

    valueMain: {
      color: colors.text,
      fontSize: 46,
      fontWeight: "800",
      marginTop: 6,
    },

    valueCurrency: {
      color: colors.secondaryText,
      fontSize: 12,
      fontWeight: "700",
      marginTop: -5,
    },

    valueRange: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 8,
    },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
    },

    sectionTitle: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.8,
      marginBottom: 15,
    },

    bodyText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },

    listItem: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 21,
      marginBottom: 5,
    },

    fieldLabel: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginTop: 13,
      marginBottom: 7,
    },

    listingTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      lineHeight: 24,
    },

    suggestedPrice: {
      marginTop: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
    },

    suggestedPriceText: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "800",
    },

    deleteButton: {
      height: 54,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginTop: 5,
    },

    deleteText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1,
      marginLeft: 8,
    },
  });
}
