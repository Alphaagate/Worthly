import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export interface ListingData {
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  keywords?: string[];
}

interface ListingEditorProps {
  listing: ListingData;
  onSave: (listing: ListingData) => void;
  onCancel?: () => void;
}

export default function ListingEditor({
  listing,
  onSave,
  onCancel,
}: ListingEditorProps) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(String(listing.price));
  const [condition, setCondition] = useState(listing.condition);
  const [category, setCategory] = useState(listing.category);

  const [showConditionOptions, setShowConditionOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

  const categories = [
    "Electronics",
    "Smartphones",
    "Computers",
    "Gaming",
    "Collectibles",
    "Home & Garden",
    "Clothing",
    "Other",
  ];

  const handleSave = () => {
    const numericPrice = Number(price.replace(/[^0-9.]/g, ""));

    onSave({
      title: title.trim(),
      description: description.trim(),
      price: Number.isNaN(numericPrice) ? 0 : numericPrice,
      condition,
      category,
      keywords: listing.keywords || [],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="create-outline" size={13} color="#FFFFFF" />

            <Text style={styles.badgeText}>LISTING EDITOR</Text>
          </View>

          <Text style={styles.title}>MAKE IT YOURS</Text>

          <Text style={styles.subtitle}>
            Worthly created this listing for you. Review and edit anything
            before you sell.
          </Text>
        </View>

        {/* TITLE */}

        <View style={styles.card}>
          <Text style={styles.label}>TITLE</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Listing title"
            placeholderTextColor="#555555"
            style={styles.input}
            maxLength={100}
          />

          <Text style={styles.characterCount}>{title.length}/100</Text>
        </View>

        {/* DESCRIPTION */}

        <View style={styles.card}>
          <Text style={styles.label}>DESCRIPTION</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item..."
            placeholderTextColor="#555555"
            style={[styles.input, styles.descriptionInput]}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          <Text style={styles.characterCount}>{description.length}/2000</Text>
        </View>

        {/* PRICE */}

        <View style={styles.card}>
          <Text style={styles.label}>PRICE</Text>

          <View style={styles.priceInputContainer}>
            <Text style={styles.dollarSign}>$</Text>

            <TextInput
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              placeholderTextColor="#555555"
              keyboardType="decimal-pad"
              style={styles.priceInput}
            />
          </View>

          <Text style={styles.helperText}>
            You can change Worthly's suggested price before publishing.
          </Text>
        </View>

        {/* CONDITION */}

        <View style={styles.card}>
          <Text style={styles.label}>CONDITION</Text>

          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowConditionOptions(!showConditionOptions)}
          >
            <Text style={styles.selectorText}>{condition}</Text>

            <Ionicons
              name={showConditionOptions ? "chevron-up" : "chevron-down"}
              size={20}
              color="#777777"
            />
          </TouchableOpacity>

          {showConditionOptions && (
            <View style={styles.optionsContainer}>
              {conditions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.option}
                  onPress={() => {
                    setCondition(item);
                    setShowConditionOptions(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item === condition && styles.selectedOptionText,
                    ]}
                  >
                    {item}
                  </Text>

                  {item === condition && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* CATEGORY */}

        <View style={styles.card}>
          <Text style={styles.label}>CATEGORY</Text>

          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCategoryOptions(!showCategoryOptions)}
          >
            <Text style={styles.selectorText}>{category}</Text>

            <Ionicons
              name={showCategoryOptions ? "chevron-up" : "chevron-down"}
              size={20}
              color="#777777"
            />
          </TouchableOpacity>

          {showCategoryOptions && (
            <View style={styles.optionsContainer}>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.option}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryOptions(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item === category && styles.selectedOptionText,
                    ]}
                  >
                    {item}
                  </Text>

                  {item === category && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* AI NOTICE */}

        <View style={styles.notice}>
          <Ionicons name="sparkles-outline" size={19} color="#AAAAAA" />

          <Text style={styles.noticeText}>
            AI generated this listing from your item analysis. Always review the
            information before selling.
          </Text>
        </View>

        {/* SAVE */}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={21} color="#000000" />

          <Text style={styles.saveButtonText}>SAVE LISTING</Text>
        </TouchableOpacity>

        {/* CANCEL */}

        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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

  scrollView: {
    flex: 1,
  },

  container: {
    padding: 24,
    paddingBottom: 60,
  },

  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 26,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#111216",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  subtitle: {
    color: "#777777",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#0D0E13",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },

  label: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  input: {
    color: "#FFFFFF",
    fontSize: 16,
    backgroundColor: "#050609",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 11,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  descriptionInput: {
    height: 170,
    lineHeight: 21,
  },

  characterCount: {
    color: "#555555",
    fontSize: 10,
    textAlign: "right",
    marginTop: 7,
  },

  priceInputContainer: {
    height: 62,
    backgroundColor: "#050609",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  dollarSign: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },

  priceInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
    marginLeft: 8,
  },

  helperText: {
    color: "#666666",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },

  selector: {
    height: 56,
    backgroundColor: "#050609",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 11,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectorText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  optionsContainer: {
    marginTop: 8,
    backgroundColor: "#050609",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#333333",
    overflow: "hidden",
  },

  option: {
    minHeight: 48,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F24",
  },

  optionText: {
    color: "#AAAAAA",
    fontSize: 14,
  },

  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  notice: {
    flexDirection: "row",
    backgroundColor: "#0D0E13",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 16,
    marginTop: 2,
    marginBottom: 18,
  },

  noticeText: {
    flex: 1,
    color: "#777777",
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 10,
  },

  saveButton: {
    height: 58,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 8,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  cancelText: {
    color: "#777777",
    fontSize: 13,
  },
});
