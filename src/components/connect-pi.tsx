import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

type Tent = {
  id: string;
  name: string;
  species: string | null;
  created_at: string;
};

type DeviceToken = {
  tent: { id: string; name: string };
  device_token: string;
};

const INSTALL_COMMANDS =
  "read -rsp \"Paste replacement token: \" TOKEN; echo\nprintf '%s\\n' \"$TOKEN\" | sudo python3 -c 'import pathlib,sys; p=pathlib.Path(\"/etc/myco-cloud.env\"); s=p.read_text(); p.write_text(\"\\n\".join((\"MYCO_DEVICE_TOKEN=\"+sys.stdin.readline().strip()) if line.startswith(\"MYCO_DEVICE_TOKEN=\") else line for line in s.splitlines())+\"\\n\")'\nunset TOKEN\nsudo systemctl restart myco-cloud@$(whoami).service";

export default function ConnectPi() {
  const [tents, setTents] = useState<Tent[]>([]);
  const [loadingTents, setLoadingTents] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("My Mushroom Tent");
  const [species, setSpecies] = useState("Blue Oyster");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<DeviceToken | null>(null);
  const [rotated, setRotated] = useState<DeviceToken | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const loadTents = useCallback(async () => {
    setLoadingTents(true);
    const { data, error: queryError } = await supabase
      .from("tents")
      .select("id, name, species, created_at")
      .order("created_at", { ascending: true });
    if (queryError) {
      setError(queryError.message);
    } else {
      setTents((data ?? []) as Tent[]);
      setError("");
    }
    setLoadingTents(false);
  }, []);

  useEffect(() => {
    void loadTents();
  }, [loadTents]);

  async function register() {
    setBusy(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "create-tent-device",
        { body: { name: name.trim(), species: species.trim() || null } }
      );
      if (invokeError) throw invokeError;
      if (!data?.ok || !data?.device_token || !data?.tent) {
        throw new Error(data?.error || "Could not connect this Raspberry Pi.");
      }
      setCreated(data as DeviceToken);
      setExpanded(false);
      await loadTents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register your tent.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateToken(tent: Tent) {
    setActionBusy(tent.id);
    setError("");
    setRotated(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "rotate-tent-device-token",
        { body: { tent_id: tent.id } }
      );
      if (invokeError) throw invokeError;
      if (!data?.ok || !data?.device_token || !data?.tent) {
        throw new Error(data?.error || "Could not regenerate the device token.");
      }
      setRotated(data as DeviceToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate the device token.");
    } finally {
      setActionBusy(null);
    }
  }

  async function removeTent(tent: Tent) {
    setActionBusy(tent.id);
    setError("");
    const { error: deleteError } = await supabase
      .from("tents")
      .delete()
      .eq("id", tent.id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setTents((current) => current.filter((item) => item.id !== tent.id));
      setPendingDelete(null);
      if (rotated?.tent.id === tent.id) setRotated(null);
    }
    setActionBusy(null);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>YOUR GROW SPACES</Text>
      <Text style={styles.title}>Connected tents</Text>
      <Text style={styles.description}>
        Manage your registered mushroom tents and their Raspberry Pi devices.
      </Text>

      {loadingTents ? (
        <ActivityIndicator color="#8CE6A0" style={{ marginTop: 18 }} />
      ) : tents.length ? (
        <View style={styles.tentList}>
          {tents.map((tent) => (
            <View key={tent.id} style={styles.tentItem}>
              <View style={styles.tentHeading}>
                <View style={styles.tentIcon}>
                  <Text style={styles.tentEmoji}>🍄</Text>
                </View>
                <View style={styles.tentInfo}>
                  <Text style={styles.tentName}>{tent.name}</Text>
                  <Text style={styles.tentSpecies}>{tent.species || "Species not set"}</Text>
                </View>
                <View style={styles.registeredBadge}>
                  <View style={styles.registeredDot} />
                  <Text style={styles.registeredText}>REGISTERED</Text>
                </View>
              </View>

              {pendingDelete === tent.id ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    Remove {tent.name}? Its device registration and stored readings will also be deleted.
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeTent(tent)}
                      disabled={actionBusy === tent.id}
                    >
                      {actionBusy === tent.id ? <ActivityIndicator color="#FFD1CA" /> : <Text style={styles.removeButtonText}>Confirm remove</Text>}
                    </Pressable>
                    <Pressable style={styles.cancelSmall} onPress={() => setPendingDelete(null)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => regenerateToken(tent)}
                    disabled={actionBusy === tent.id}
                  >
                    {actionBusy === tent.id ? <ActivityIndicator color="#A5DDB0" /> : <Text style={styles.secondaryText}>↻  Regenerate token</Text>}
                  </Pressable>
                  <Pressable style={styles.removeLink} onPress={() => setPendingDelete(tent.id)}>
                    <Text style={styles.removeLinkText}>Remove</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No tents connected yet. Add your first grow space below.</Text>
      )}

      {rotated ? (
        <View style={styles.tokenPanel}>
          <Text style={styles.successTitle}>New device token generated</Text>
          <Text style={styles.description}>
            The previous token is now invalid. Copy this token and update the uploader on {rotated.tent.name}.
          </Text>
          <Text style={styles.label}>NEW TOKEN · SHOWN ONCE</Text>
          <Text selectable style={styles.token}>{rotated.device_token}</Text>
          <Text style={styles.label}>RUN ON THE RASPBERRY PI</Text>
          <Text selectable style={styles.commands}>{INSTALL_COMMANDS}</Text>
          <Pressable style={styles.cancelSmall} onPress={() => setRotated(null)}>
            <Text style={styles.cancelText}>Close token</Text>
          </Pressable>
        </View>
      ) : null}

      {created ? (
        <View style={styles.tokenPanel}>
          <Text style={styles.successTitle}>Your tent is registered</Text>
          <Text style={styles.description}>
            {created.tent.name} is ready. Copy this one-time token and paste it into the installer on your Raspberry Pi.
          </Text>
          <Text style={styles.label}>ONE-TIME DEVICE TOKEN · KEEP PRIVATE</Text>
          <Text selectable style={styles.token}>{created.device_token}</Text>
          <Text style={styles.help}>Press and hold the token above, then choose Copy.</Text>
          <Text style={styles.label}>ON YOUR RASPBERRY PI — RUN THESE COMMANDS</Text>
          <Text selectable style={styles.commands}>
            git clone --branch feature/supabase-cloud-foundation https://github.com/rajrana437/myco.git{"\n"}cd myco{"\n"}bash pi/install.sh
          </Text>
          <Text style={styles.help}>
            The installer asks for your token without displaying it. Do not share the token or commit it to GitHub.
          </Text>
          <Pressable style={styles.cancelSmall} onPress={() => setCreated(null)}>
            <Text style={styles.cancelText}>Close token</Text>
          </Pressable>
        </View>
      ) : null}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!expanded ? (
        <Pressable style={styles.primary} onPress={() => { setExpanded(true); setError(""); }}>
          <Text style={styles.primaryText}>＋  Add another tent</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add a grow space</Text>
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
          <Pressable
            style={[styles.primary, (busy || !name.trim()) && styles.disabled]}
            onPress={register}
            disabled={busy || !name.trim()}
          >
            {busy ? <ActivityIndicator color="#0A100D" /> : <Text style={styles.primaryText}>Create tent & generate secure token</Text>}
          </Pressable>
          <Pressable style={styles.cancelSmall} onPress={() => { setExpanded(false); setError(""); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#121C16", borderColor: "#294332", borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 26 },
  eyebrow: { color: "#8DD9A0", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginBottom: 9 },
  title: { color: "#EEF4EE", fontSize: 18, fontWeight: "800" },
  description: { color: "#92A397", fontSize: 12, lineHeight: 18, marginTop: 9 },
  tentList: { marginTop: 16, gap: 10 },
  tentItem: { backgroundColor: "#0D1711", borderColor: "#294332", borderWidth: 1, borderRadius: 15, padding: 13 },
  tentHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  tentIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#203326", alignItems: "center", justifyContent: "center" },
  tentEmoji: { fontSize: 20 },
  tentInfo: { flex: 1, minWidth: 0 },
  tentName: { color: "#EEF4EE", fontSize: 14, fontWeight: "800" },
  tentSpecies: { color: "#849889", fontSize: 11, marginTop: 4 },
  registeredBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10, backgroundColor: "#173020" },
  registeredDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#75E69A" },
  registeredText: { color: "#9CE9AC", fontSize: 8, fontWeight: "800" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 13 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: "#35553C", borderRadius: 10, padding: 10, alignItems: "center", justifyContent: "center", minHeight: 38 },
  secondaryText: { color: "#A5DDB0", fontSize: 10, fontWeight: "800" },
  removeLink: { padding: 10 },
  removeLinkText: { color: "#D99A91", fontSize: 10, fontWeight: "700" },
  confirmBox: { marginTop: 13, padding: 11, borderRadius: 10, backgroundColor: "#291A19", borderColor: "#65362F", borderWidth: 1 },
  confirmText: { color: "#E8B5AE", fontSize: 11, lineHeight: 16 },
  removeButton: { flex: 1, backgroundColor: "#512923", borderRadius: 9, padding: 10, alignItems: "center", minHeight: 38, justifyContent: "center" },
  removeButtonText: { color: "#FFD1CA", fontSize: 10, fontWeight: "800" },
  cancelSmall: { alignItems: "center", padding: 10 },
  cancelText: { color: "#A5DDB0", fontSize: 11, fontWeight: "700" },
  emptyText: { color: "#849889", fontSize: 12, lineHeight: 18, marginTop: 15 },
  primary: { backgroundColor: "#8CE6A0", borderRadius: 13, padding: 14, alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: 16 },
  primaryText: { color: "#0A100D", fontSize: 12, fontWeight: "800", textAlign: "center" },
  form: { marginTop: 17 },
  formTitle: { color: "#EAF1EA", fontSize: 14, fontWeight: "800" },
  label: { color: "#9BB5A0", fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 13, marginBottom: 7 },
  input: { color: "#F0F7F0", backgroundColor: "#0A100D", borderColor: "#294332", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13 },
  disabled: { opacity: 0.55 },
  error: { color: "#FFC2B9", fontSize: 12, marginTop: 12 },
  tokenPanel: { marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#294332" },
  successTitle: { color: "#9CE9AC", fontSize: 15, fontWeight: "800" },
  token: { color: "#D8F4DC", backgroundColor: "#0A100D", borderColor: "#35553C", borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 19, overflow: "hidden" },
  help: { color: "#829687", fontSize: 11, lineHeight: 17, marginTop: 8 },
  commands: { color: "#D8F4DC", backgroundColor: "#0A100D", borderColor: "#35553C", borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 10, lineHeight: 17, overflow: "hidden" },
});
