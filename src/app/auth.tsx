import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!password) {
      Alert.alert("Missing Password", "Please enter your password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password Too Short",
        "Your password must be at least 6 characters.",
      );
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          Alert.alert(
            "Account Created",
            "Your Worthly account has been created.",
          );
        } else {
          Alert.alert(
            "Check Your Email",
            "We sent you a confirmation email. Confirm your email address before signing in.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);

      Alert.alert(
        isSignUp ? "Sign Up Failed" : "Sign In Failed",
        error?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* BRAND */}

        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="pricetag" size={28} color="#000000" />
          </View>

          <Text style={styles.logo}>WORTHLY</Text>

          <Text style={styles.tagline}>
            Know what it's worth.
            {"\n"}
            Know how to sell it.
          </Text>
        </View>

        {/* CARD */}

        <View style={styles.card}>
          <Text style={styles.title}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>

          <Text style={styles.subtitle}>
            {isSignUp
              ? "Create your Worthly account to save your scans, listings, and selling history."
              : "Sign in to access your Worthly history and listings."}
          </Text>

          {/* EMAIL */}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={19} color="#666666" />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#555555"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
          </View>

          {/* PASSWORD */}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={19} color="#666666" />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#555555"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          </View>

          {/* EMAIL BUTTON */}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Ionicons
                  name={isSignUp ? "person-add-outline" : "log-in-outline"}
                  size={20}
                  color="#000000"
                />

                <Text style={styles.primaryButtonText}>
                  {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* DIVIDER */}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />

            <Text style={styles.dividerText}>OR</Text>

            <View style={styles.divider} />
          </View>

          {/* FACEBOOK */}

          <TouchableOpacity
            style={styles.facebookButton}
            activeOpacity={0.85}
            onPress={() => {
              Alert.alert(
                "Facebook",
                "Facebook login will be connected after email authentication is working.",
              );
            }}
          >
            <Ionicons name="logo-facebook" size={21} color="#FFFFFF" />

            <Text style={styles.facebookText}>CONTINUE WITH FACEBOOK</Text>
          </TouchableOpacity>

          {/* MODE SWITCH */}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}

              <Text style={styles.switchTextBold}>
                {isSignUp ? "Sign in" : "Create one"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}

        <Text style={styles.footer}>
          Your Worthly account keeps your scans, valuations, listings, and
          selling history together.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 50,
    justifyContent: "center",
  },

  brandSection: {
    alignItems: "center",
    marginBottom: 36,
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 4,
  },

  tagline: {
    color: "#777777",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },

  card: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 24,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    color: "#777777",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 26,
  },

  inputGroup: {
    marginBottom: 18,
  },

  inputLabel: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  inputWrapper: {
    height: 54,
    backgroundColor: "#111111",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#292929",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    marginLeft: 11,
  },

  primaryButton: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 9,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#222222",
  },

  dividerText: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "700",
    marginHorizontal: 12,
  },

  facebookButton: {
    height: 54,
    backgroundColor: "#1877F2",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  facebookText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginLeft: 9,
  },

  switchButton: {
    alignItems: "center",
    marginTop: 24,
  },

  switchText: {
    color: "#777777",
    fontSize: 13,
  },

  switchTextBold: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  footer: {
    color: "#444444",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 25,
    paddingHorizontal: 20,
  },
});
