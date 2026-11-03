import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";

// CHANGE THIS to your Raspberry Pi's actual Wi-Fi IP address.
const API_URL = "http://10.0.0.198:8765/api/status";

type TentStatus = {
  temperature: number | null;
  humidity: number | null;
  humidifier_on: boolean;
  fan_on: boolean;
  low_humidity: number;
  high_humidity: number;
  fan_interval_seconds: number;
  fan_runtime_seconds: number;
  sensor_ok: boolean;
  last_sensor_success: string | null;
  updated_at: string | null;
  error?: string;
};

const EMPTY_STATUS: TentStatus = {
  temperature: null,
  humidity: null,
  humidifier_on: false,
  fan_on: false,
  low_humidity: 85,
  high_humidity: 90,
  fan_interval_seconds: 900,
  fan_runtime_seconds: 120,
  sensor_ok: false,
  last_sensor_success: null,
  updated_at: null,
};

function formatTime(value: string | null) {
  if (!value) return "Waiting for data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  description,
}: {
  label: string;
  value: string;
  unit: string;
  icon: string;
  description: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>

      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>

      <Text style={styles.metricDescription}>{description}</Text>
    </View>
  );
}

function DeviceCard({
  title,
  icon,
  isOn,
  detail,
}: {
  title: string;
  icon: string;
  isOn: boolean;
  detail: string;
}) {
  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceTop}>
        <View style={styles.deviceIconBox}>
          <Text style={styles.deviceIcon}>{icon}</Text>
        </View>

        <View
          style={[
            styles.stateBadge,
            isOn ? styles.stateBadgeOn : styles.stateBadgeOff,
          ]}
        >
          <View
            style={[
              styles.stateDot,
              isOn ? styles.dotOn : styles.dotOff,
            ]}
          />
          <Text
            style={[
              styles.stateText,
              isOn ? styles.stateTextOn : styles.stateTextOff,
            ]}
          >
            {isOn ? "RUNNING" : "IDLE"}
          </Text>
        </View>
      </View>

      <Text style={styles.deviceTitle}>{title}</Text>
      <Text style={styles.deviceDetail}>{detail}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [status, setStatus] = useState<TentStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContact, setLastContact] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Pi API returned HTTP ${response.status}`);
      }

      const data: TentStatus = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus(data);
      setLastContact(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the Raspberry Pi."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Refresh live readings every five seconds.
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatus();
  }, [fetchStatus]);

  const humidity = status.humidity;
  const humidityProgress =
    humidity === null ? 0 : Math.max(0, Math.min(100, humidity));

  const sensorConnected = !error && status.sensor_ok;
  const piConnected = !error && lastContact !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A100D" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A5F3B4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandEmoji}>🍄</Text>
            </View>

            <View>
              <Text style={styles.brandName}>myco</Text>
              <Text style={styles.brandSubtitle}>GROW WITH NATURE</Text>
            </View>
          </View>

          <View
            style={[
              styles.connectionBadge,
              piConnected
                ? styles.connectionOnline
                : styles.connectionOffline,
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                piConnected
                  ? styles.dotOn
                  : styles.dotOff,
              ]}
            />
            <Text style={styles.connectionText}>
              {piConnected ? "PI CONNECTED" : "PI OFFLINE"}
            </Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR GROW SPACE</Text>
          <Text style={styles.heroTitle}>A little closer{"\n"}to nature.</Text>
          <Text style={styles.heroDescription}>
            Your mushroom tent, monitored in real time.
          </Text>
        </View>

        {/* Sensor status */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live environment</Text>
          <Text style={styles.liveLabel}>
            <Text style={styles.liveDot}>● </Text>
            LIVE
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="TEMPERATURE"
            value={
              status.temperature === null
                ? "--"
                : status.temperature.toFixed(1)
            }
            unit="°C"
            icon="◉"
            description="Inside your tent"
          />

          <MetricCard
            label="HUMIDITY"
            value={
              humidity === null ? "--" : humidity.toFixed(1)
            }
            unit="%"
            icon="♧"
            description="Relative humidity"
          />
        </View>

        {/* Humidity target */}
        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <View>
              <Text style={styles.targetTitle}>Humidity target</Text>
              <Text style={styles.targetSubtitle}>
                Current controller settings
              </Text>
            </View>

            <Text style={styles.targetRange}>
              {status.low_humidity}–{status.high_humidity}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${humidityProgress}%` },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>0%</Text>
            <Text style={styles.progressLabel}>100%</Text>
          </View>

          <View style={styles.sensorFooter}>
            <View
              style={[
                styles.sensorIndicator,
                sensorConnected
                  ? styles.sensorIndicatorOn
                  : styles.sensorIndicatorOff,
              ]}
            />
            <Text style={styles.sensorFooterText}>
              {loading
                ? "Connecting to your tent..."
                : sensorConnected
                ? "Sensor readings available"
                : "Sensor reading unavailable"}
            </Text>
          </View>
        </View>

        {/* Devices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your equipment</Text>
          <Text style={styles.automaticLabel}>AUTOMATIC</Text>
        </View>

        <View style={styles.devicesGrid}>
          <DeviceCard
            title="Humidifier"
            icon="♨"
            isOn={status.humidifier_on}
            detail={
              status.humidifier_on
                ? "Adding moisture"
                : "Humidity control"
            }
          />

          <DeviceCard
            title="Fresh air fan"
            icon="✳"
            isOn={status.fan_on}
            detail={
              status.fan_on
                ? "Ventilating tent"
                : `Every ${Math.round(
                    status.fan_interval_seconds / 60
                  )} minutes`
            }
          />
        </View>

        {/* Connection / errors */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Can't reach your Pi</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.errorHint}>
              Check that the Pi and your phone are on the same Wi-Fi,
              the API is running, and API_URL contains the correct Pi IP.
            </Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>GROWING, SIMPLIFIED.</Text>
          <Text style={styles.footerText}>
            Last API contact: {formatTime(lastContact)}
          </Text>
          <Text style={styles.footerText}>
            Last sensor reading: {formatTime(status.last_sensor_success)}
          </Text>
          <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOutButton}>
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
          <Text style={styles.footerVersion}>MYCO · LOCAL TEST</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A100D",
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#18291D",
    alignItems: "center",
    justifyContent: "center",
  },
  brandEmoji: {
    fontSize: 25,
  },
  brandName: {
    color: "#F1F7F0",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -1,
  },
  brandSubtitle: {
    color: "#7E9B83",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 1,
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  connectionOnline: {
    backgroundColor: "#14251A",
    borderColor: "#294B31",
  },
  connectionOffline: {
    backgroundColor: "#291A19",
    borderColor: "#5B302B",
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: "#75E69A",
  },
  dotOff: {
    backgroundColor: "#F28B82",
  },
  connectionText: {
    color: "#B6CBB9",
    fontSize: 9,
    fontWeight: "700",
  },
  hero: {
    marginBottom: 32,
  },
  eyebrow: {
    color: "#8DD9A0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  heroTitle: {
    color: "#F3F7F1",
    fontSize: 43,
    fontWeight: "800",
    letterSpacing: -1.8,
    lineHeight: 47,
  },
  heroDescription: {
    color: "#92A397",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#EAF1EA",
    fontSize: 17,
    fontWeight: "700",
  },
  liveLabel: {
    color: "#A5DDB0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  liveDot: {
    color: "#76E39B",
  },
  automaticLabel: {
    color: "#8FA992",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#121C16",
    borderColor: "#24362A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    minHeight: 145,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metricIcon: {
    color: "#8FE7A5",
    fontSize: 17,
  },
  metricLabel: {
    color: "#A4B5A7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 19,
  },
  metricValue: {
    color: "#F0F7F0",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1.3,
  },
  metricUnit: {
    color: "#A4B5A7",
    fontSize: 15,
    marginLeft: 4,
  },
  metricDescription: {
    color: "#718477",
    fontSize: 11,
    marginTop: 7,
  },
  targetCard: {
    backgroundColor: "#121C16",
    borderColor: "#24362A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginBottom: 31,
  },
  targetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  targetTitle: {
    color: "#ECF3EC",
    fontSize: 14,
    fontWeight: "700",
  },
  targetSubtitle: {
    color: "#7F9384",
    fontSize: 11,
    marginTop: 5,
  },
  targetRange: {
    color: "#9CE9AC",
    fontSize: 15,
    fontWeight: "700",
  },
  progressTrack: {
    height: 7,
    backgroundColor: "#27382B",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 21,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8CE6A0",
    borderRadius: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabel: {
    color: "#718477",
    fontSize: 10,
  },
  sensorFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#26362A",
  },
  sensorIndicator: {
    width: 7,
    height: 7,
    borderRadius: 5,
  },
  sensorIndicatorOn: {
    backgroundColor: "#78E49A",
  },
  sensorIndicatorOff: {
    backgroundColor: "#F28B82",
  },
  sensorFooterText: {
    color: "#8FA393",
    fontSize: 11,
  },
  devicesGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  deviceCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#121C16",
    borderColor: "#24362A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    minHeight: 150,
  },
  deviceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  deviceIconBox: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#203326",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceIcon: {
    color: "#A5E9B1",
    fontSize: 22,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stateBadgeOn: {
    backgroundColor: "#1D3825",
  },
  stateBadgeOff: {
    backgroundColor: "#263029",
  },
  stateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  stateText: {
    fontSize: 8,
    fontWeight: "800",
  },
  stateTextOn: {
    color: "#8DE6A2",
  },
  stateTextOff: {
    color: "#A0ADA2",
  },
  deviceTitle: {
    color: "#EEF4EE",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 18,
  },
  deviceDetail: {
    color: "#849889",
    fontSize: 11,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: "#291A19",
    borderColor: "#65362F",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  errorTitle: {
    color: "#FFC2B9",
    fontSize: 14,
    fontWeight: "700",
  },
  errorMessage: {
    color: "#E8B5AE",
    fontSize: 12,
    marginTop: 8,
  },
  errorHint: {
    color: "#C9A19B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#223027",
  },
  footerTitle: {
    color: "#8EC99B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 13,
  },
  footerText: {
    color: "#718477",
    fontSize: 10,
    marginBottom: 5,
  },
  signOutButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#294332",
  },
  signOutText: {
    color: "#A5DDB0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  footerVersion: {
    color: "#46594A",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 12,
  },
});
