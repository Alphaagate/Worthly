import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function EditProfileScreen() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setDisplayName(data?.display_name || "");
      setUsername(data?.username || "");
    } catch (error: any) {
      console.error("Error loading profile:", error);

      Alert.alert("Error", error?.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    const cleanDisplayName = displayName.trim();

    // Remove @ if the user typed @username
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();

    if (!cleanDisplayName) {
      Alert.alert("Missing Name", "Please enter a display name.");
      return;
    }

    if (cleanUsername && !/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      Alert.alert(
        "Invalid Username",
        "Username must be 3–20 characters and can only contain letters, numbers, and underscores.",
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/auth");
        return;
      }

      // Check whether another account already uses this username
      if (cleanUsername) {
        const { data: existingProfile, error: usernameError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", user.id)
          .maybeSingle();

        if (usernameError) throw usernameError;

        if (existingProfile) {
          Alert.alert(
            "Username Taken",
            "That username is already being used. Please choose another one.",
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: cleanDisplayName,
          username: cleanUsername || null,
        })
        .eq("id", user.id)
        .select("id, display_name, username, avatar_url")
        .single();

      if (error) throw error;

      // Confirm the database actually returned the updated values
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");

      Alert.alert("Profile Saved", "Your profile has been updated.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error saving profile:", error);

      Alert.alert(
        "Save Failed",
        error?.message || "Could not update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={{ width: 25 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>DISPLAY NAME</Text>

        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor="#555555"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>USERNAME</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor="#555555"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />

        <Text style={styles.usernameHint}>
          3–20 characters. Letters, numbers, and underscores only.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#090A0F" />
          ) : (
            <Text style={styles.saveText}>SAVE CHANGES</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090A0F",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#090A0F",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#888888",
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 20,
  },

  label: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 8,
  },

  input: {
    height: 52,
    backgroundColor: "#11131A",
    borderWidth: 1,
    borderColor: "#20222B",
    borderRadius: 12,
    paddingHorizontal: 15,
    color: "#FFFFFF",
    fontSize: 15,
  },

  usernameHint: {
    color: "#555555",
    fontSize: 11,
    marginTop: 7,
  },

  saveButton: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: "#090A0F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
