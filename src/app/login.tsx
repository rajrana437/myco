import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || password.length < 8) {
        throw new Error("Enter a valid email and a password with at least 8 characters.");
      }

      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        // Supabase may intentionally return a user with no identities for an
        // already-registered email when email confirmations are enabled.
        // Try signing in with the supplied password instead of showing a
        // misleading account-confirmation message.
        const alreadyRegistered =
          !authError &&
          !!data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0;

        if (alreadyRegistered || authError?.message.toLowerCase().includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!signInError) {
            setMessage("This account already exists. You're signed in.");
            return;
          }
          setMode("login");
          setError("An account with this email already exists. Sign in with your existing password.");
          return;
        }

        if (authError) throw authError;
        if (!data.session) {
          setMessage("Check your email to confirm your new account, then sign in.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View style={styles.content}>
            <View style={styles.logo}><Text style={styles.logoText}>🍄</Text></View>
            <Text style={styles.brand}>myco</Text>
            <Text style={styles.eyebrow}>GROW WITH NATURE</Text>
            <Text style={styles.heading}>{mode === "login" ? "Welcome back." : "Start growing."}</Text>
            <Text style={styles.subtitle}>Your grow space, wherever you are.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#728477"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ characters)"
              placeholderTextColor="#728477"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === "login" ? "password" : "newPassword"}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}
            <Pressable style={[styles.primary, busy && styles.disabled]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#0A100D" /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
              <Text style={styles.switchText}>{mode === "login" ? "New to Myco? Create an account" : "Already have an account? Sign in"}</Text>
            </Pressable>
            <Text style={styles.footer}>A LITTLE CLOSER TO NATURE.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A100D" },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 28 },
  content: { paddingHorizontal: 28, width: "100%", maxWidth: 460, alignSelf: "center" },
  logo: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#18291D", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { fontSize: 29 },
  brand: { color: "#F1F7F0", fontSize: 36, fontWeight: "800", letterSpacing: -1.5 },
  eyebrow: { color: "#7E9B83", fontSize: 9, fontWeight: "700", letterSpacing: 2.5, marginTop: 2, marginBottom: 48 },
  heading: { color: "#F3F7F1", fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: "#92A397", fontSize: 14, marginTop: 8, marginBottom: 28 },
  input: { color: "#F0F7F0", backgroundColor: "#121C16", borderColor: "#294332", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 12, fontSize: 15 },
  primary: { backgroundColor: "#8CE6A0", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8, minHeight: 54, justifyContent: "center" },
  disabled: { opacity: 0.65 },
  primaryText: { color: "#0A100D", fontSize: 15, fontWeight: "800" },
  switchText: { color: "#A5DDB0", textAlign: "center", marginTop: 22, fontSize: 13, fontWeight: "600" },
  error: { color: "#FFC2B9", marginBottom: 8, fontSize: 12 },
  message: { color: "#9CE9AC", marginBottom: 8, fontSize: 12 },
  footer: { color: "#536B59", textAlign: "center", fontSize: 9, letterSpacing: 2, marginTop: 54, fontWeight: "700" },
});
