import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { supabase } from "../../../lib/supabase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const isFocused = useIsFocused();
  const { colors, isDark } = useTheme();

  const styles = createStyles(colors);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const displayName =
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Worthly User";

        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            display_name: displayName,
          })
          .select("id, display_name, username, avatar_url")
          .single();

        if (insertError) {
          throw insertError;
        }

        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);

      Alert.alert(
        "Profile Error",
        "We couldn't load your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Error", "Could not log out. Please try again.");
      return;
    }

    router.replace("/auth");
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
        }}
      />

      {isFocused && (
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.animatedContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.profileSection}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={42}
                    color={colors.secondaryText}
                  />
                </View>
              )}

              <Text style={styles.displayName}>
                {profile?.display_name || "Worthly User"}
              </Text>

              {profile?.username ? (
                <Text style={styles.username}>@{profile.username}</Text>
              ) : (
                <Text style={styles.username}>Set your username</Text>
              )}

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push("/edit-profile")}
              >
                <Ionicons name="create-outline" size={18} color={colors.text} />

                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACCOUNT</Text>

              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  router.push("/tabs/explore");
                }}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="time-outline" size={22} color={colors.text} />
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Scan History</Text>

                  <Text style={styles.optionSubtitle}>
                    View your previous Worthly scans
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => router.push("/settings")}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color={colors.text}
                  />
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Settings</Text>

                  <Text style={styles.optionSubtitle}>
                    Manage your Worthly preferences
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={22} color="#FF5555" />

              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    animatedContainer: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 40,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      color: colors.secondaryText,
      marginTop: 12,
      fontSize: 14,
    },

    header: {
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 20,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "800",
    },

    profileSection: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingBottom: 35,
    },

    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 16,
    },

    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },

    displayName: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
    },

    username: {
      color: colors.secondaryText,
      fontSize: 15,
      marginTop: 5,
    },

    editButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 18,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    editButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },

    section: {
      paddingHorizontal: 20,
    },

    sectionTitle: {
      color: colors.secondaryText,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 10,
    },

    option: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    optionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    optionTextContainer: {
      flex: 1,
    },

    optionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },

    optionSubtitle: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 4,
    },

    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 20,
      marginTop: 25,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: isLightRedBackground(colors) ? "#FFF5F5" : "#171114",
      borderWidth: 1,
      borderColor: isLightRedBackground(colors) ? "#FFD6D6" : "#302025",
      gap: 8,
    },

    logoutText: {
      color: "#FF5555",
      fontSize: 15,
      fontWeight: "700",
    },
  });
}

function isLightRedBackground(colors: ThemeColors) {
  return colors.background === "#FFFFFF";
}
