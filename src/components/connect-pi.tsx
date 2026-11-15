import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

type CreatedDevice = {
  tent: { id: string; name: string; species: string | null };
  device_token: string;
};

const INSTALL_COMMANDS =
  "curl -fsSLO https://raw.githubusercontent.com/rajrana437/myco/feature/supabase-cloud-foundation/pi/install.sh\nbash install.sh";

export default function ConnectPi() {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("My Mushroom Tent");
  const [species, setSpecies] = useState("Blue Oyster");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedDevice | null>(null);

  async function register() {
    setBusy(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "create-tent-device",
        { body: { name: name.trim(), species: species.trim() } }
      );
      if (invokeError) throw invokeError;
      if (!data?.ok || !data?.device_token || !data?.tent) {
        throw new Error(data?.error || "Could not connect this Raspberry Pi.");
      }
      setCreated(data as CreatedDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register your tent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>REMOTE MONITORING</Text>
      <Text style={styles.title}>Connect your Raspberry Pi</Text>
      <Text style={styles.description}>
        Create a tent and securely link its Pi to your Myco account. Your existing
        humidity controller keeps running independently.
      </Text>

      {!expanded && !created ? (
        <Pressable style={styles.primary} onPress={() => setExpanded(true)}>
          <Text style={styles.primaryText}>＋  Connect a tent</Text>
        </Pressable>
      ) : null}

      {expanded && !created ? (
        <View style={styles.form}>
          <Text style={styles.label}>TENT NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Basement Martha"
            placeholderTextColor="#718477"
            maxLength={60}
          />
          <Text style={styles.label}>MUSHROOM SPECIES (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={species}
            onChangeText={setSpecies}
            placeholder="e.g. Blue Oyster"
            placeholderTextColor="#718477"
            maxLength={80}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.primary, (busy || !name.trim()) && styles.disabled]}
            onPress={register}
            disabled={busy || !name.trim()}
          >
            {busy ? <ActivityIndicator color="#0A100D" /> : <Text style={styles.primaryText}>Create tent & generate secure token</Text>}
          </Pressable>
          <Pressable style={styles.cancel} onPress={() => { setExpanded(false); setError(""); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {created ? (
        <View style={styles.success}>
          <Text style={styles.successTitle}>Your tent is registered</Text>
          <Text style={styles.description}>
            {created.tent.name} is ready. Copy this one-time token now and paste
            it into the installer on your Raspberry Pi. Myco stores only its hash.
          </Text>
          <Text style={styles.label}>ONE-TIME DEVICE TOKEN · KEEP PRIVATE</Text>
          <Text selectable style={styles.token}>{created.device_token}</Text>
          <Text style={styles.help}>Press and hold the token above, then choose Copy.</Text>
          <Text style={styles.label}>ON YOUR RASPBERRY PI — RUN THESE TWO COMMANDS</Text>
          <Text selectable style={styles.commands}>{INSTALL_COMMANDS}</Text>
          <Text style={styles.help}>
            The installer asks for your token without displaying it, then starts
            the cloud uploader. Do not share the token or commit it to GitHub.
          </Text>
          <Pressable style={styles.secondary} onPress={() => { setCreated(null); setExpanded(false); }}>
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#121C16", borderColor: "#294332", borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 26 },
  eyebrow: { color: "#8DD9A0", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginBottom: 9 },
  title: { color: "#EEF4EE", fontSize: 18, fontWeight: "800" },
  description: { color: "#92A397", fontSize: 12, lineHeight: 18, marginTop: 9 },
  primary: { backgroundColor: "#8CE6A0", borderRadius: 13, padding: 14, alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: 16 },
  primaryText: { color: "#0A100D", fontSize: 12, fontWeight: "800", textAlign: "center" },
  form: { marginTop: 18 },
  label: { color: "#9BB5A0", fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 13, marginBottom: 7 },
  input: { color: "#F0F7F0", backgroundColor: "#0A100D", borderColor: "#294332", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13 },
  disabled: { opacity: 0.55 },
  error: { color: "#FFC2B9", fontSize: 12, marginTop: 10 },
  cancel: { alignItems: "center", padding: 12 },
  cancelText: { color: "#A5DDB0", fontSize: 12, fontWeight: "700" },
  success: { marginTop: 16 },
  successTitle: { color: "#9CE9AC", fontSize: 16, fontWeight: "800" },
  token: { color: "#D8F4DC", backgroundColor: "#0A100D", borderColor: "#35553C", borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 19, overflow: "hidden" },
  help: { color: "#829687", fontSize: 11, lineHeight: 17, marginTop: 8 },
  commands: { color: "#D8F4DC", backgroundColor: "#0A100D", borderColor: "#35553C", borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 11, lineHeight: 18, overflow: "hidden" },
  secondary: { borderWidth: 1, borderColor: "#35553C", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 18 },
  secondaryText: { color: "#A5DDB0", fontWeight: "800", fontSize: 12 },
});
