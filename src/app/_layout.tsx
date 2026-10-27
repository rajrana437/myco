
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock data only — this screen is not connected to your Raspberry Pi.
const GROW = {
  species: "Blue oyster",
  stage: "Fruiting",
  day: 12,
  temperature: 21.8,
  humidity: 86,
  humidifierOn: false,
  fanOn: true,
  lastUpdated: "Just now",
};

const HISTORY = [52, 61, 57, 70, 65, 77, 72, 86, 80, 74, 90, 83];

const themes = {
  dark: {
    bg: "#080D0B",
    surface: "#111A15",
    surfaceAlt: "#17231B",
    border: "#263A2B",
    text: "#F0F8F1",
    muted: "#91A497",
    green: "#9BFF9B",
    greenDark: "#244E32",
    glow: "#52FF85",
    track: "#25372A",
    pill: "#1D3826",
  },
  light: {
    bg: "#F4F8F2",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF3E7",
    border: "#D8E5D4",
    text: "#17271C",
    muted: "#627568",
    green: "#247B3D",
    greenDark: "#D9EEDB",
    glow: "#31A952",
    track: "#DFEADF",
    pill: "#E2F2E3",
  },
};

type Palette = (typeof themes)["dark"];

function GlowDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: color,
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.65, 1],
        }),
        transform: [
          {
            scale: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1.2],
            }),
          },
        ],
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 9,
        elevation: 4,
      }}
    />
  );
}

function SectionTitle({
  title,
  trailing,
  palette,
}: {
  title: string;
  trailing?: string;
  palette: Palette;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionHeading, { color: palette.text }]}>
        {title}
      </Text>
      {trailing ? (
        <Text style={[styles.smallLabel, { color: palette.muted }]}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  palette,
  history,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  icon: string;
  palette: Palette;
  history?: number[];
}) {
  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.metricTop}>
        <Text style={[styles.metricIcon, { color: palette.green }]}>
          {icon}
        </Text>
        <Text style={[styles.smallLabel, { color: palette.muted }]}>
          {title.toUpperCase()}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.metricValue, { color: palette.text }]}>
          {value}
        </Text>
        <Text style={[styles.metricUnit, { color: palette.muted }]}>
          {unit}
        </Text>
      </View>

      <Text style={[styles.metricSubtitle, { color: palette.muted }]}>
        {subtitle}
      </Text>

      {history ? (
        <View style={styles.chart}>
          {history.map((height, index) => (
            <View
              key={index}
              style={[
                styles.chartBar,
                {
                  height: `${height}%`,
                  backgroundColor:
                    index === history.length - 1
                      ? palette.glow
                      : palette.greenDark,
                  opacity: index === history.length - 1 ? 1 : 0.85,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {history ? (
        <View style={styles.chartLabels}>
          <Text style={[styles.tinyLabel, { color: palette.muted }]}>
            24h ago
          </Text>
          <Text style={[styles.tinyLabel, { color: palette.muted }]}>
            NOW
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DeviceCard({
  title,
  description,
  icon,
  active,
  palette,
}: {
  title: string;
  description: string;
  icon: string;
  active: boolean;
  palette: Palette;
}) {
  return (
    <View
      style={[
        styles.deviceCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View
        style={[
          styles.deviceIconBox,
          { backgroundColor: active ? palette.pill : palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.deviceIcon, { color: palette.green }]}>
          {icon}
        </Text>
      </View>

      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceTitle, { color: palette.text }]}>
          {title}
        </Text>
        <Text style={[styles.smallLabel, { color: palette.muted }]}>
          {description}
        </Text>
      </View>

      <View
        style={[
          styles.statusPill,
          { backgroundColor: active ? palette.pill : palette.surfaceAlt },
        ]}
      >
        {active ? <GlowDot color={palette.glow} /> : null}
        <Text
          style={[
            styles.statusText,
            { color: active ? palette.green : palette.muted },
          ]}
        >
          {active ? "ON" : "OFF"}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const systemScheme = useColorScheme();
  const palette: Palette =
    systemScheme === "light" ? themes.light : themes.dark;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bg }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={systemScheme === "light" ? "dark-content" : "light-content"}
        backgroundColor={palette.bg}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.green }]}>
              MYCO / GROW 01
            </Text>
            <Text style={[styles.brand, { color: palette.text }]}>
              little{" "}
              <Text style={{ color: palette.green }}>wonders.</Text>
            </Text>
          </View>

          <View
            style={[
              styles.connectionPill,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <GlowDot color={palette.glow} />
            <Text style={[styles.connectionText, { color: palette.text }]}>
              DEMO
            </Text>
          </View>
        </View>

        {/* Grow hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
          ]}
        >
          <View style={styles.heroOrb} />
          <Text style={[styles.eyebrow, { color: palette.green }]}>
            CURRENT GROW · DAY {GROW.day}
          </Text>

          <Text style={[styles.heroTitle, { color: palette.text }]}>
            {GROW.species}
          </Text>

          <View style={styles.heroBottom}>
            <View>
              <Text style={[styles.smallLabel, { color: palette.muted }]}>
                GROW STAGE
              </Text>
              <Text style={[styles.stage, { color: palette.green }]}>
                {GROW.stage}
              </Text>
            </View>

            <View
              style={[
                styles.stageBadge,
                { backgroundColor: palette.pill },
              ]}
            >
              <Text style={[styles.stageBadgeText, { color: palette.green }]}>
                ✳ Growing
              </Text>
            </View>
          </View>
        </View>

        {/* Environment */}
        <SectionTitle title="The environment" trailing="MOCK DATA" palette={palette} />

        <View style={styles.metricsRow}>
          <MetricCard
            title="Temperature"
            value={GROW.temperature.toFixed(1)}
            unit="°C"
            subtitle="Inside your tent"
            icon="☼"
            palette={palette}
            history={[48, 52, 49, 56, 62, 59, 68, 65, 70, 73, 67, 71]}
          />

          <MetricCard
            title="Humidity"
            value={String(GROW.humidity)}
            unit="%"
            subtitle="Relative humidity"
            icon="≈"
            palette={palette}
            history={HISTORY}
          />
        </View>

        {/* Hardware */}
        <SectionTitle title="Your little ecosystem" palette={palette} />

        <View style={styles.deviceList}>
          <DeviceCard
            title="Humidifier"
            description="Humidity control"
            icon="≋"
            active={GROW.humidifierOn}
            palette={palette}
          />
          <DeviceCard
            title="Fresh air"
            description="Inline duct fan"
            icon="↗"
            active={GROW.fanOn}
            palette={palette}
          />
        </View>

        {/* Footer */}
        <View
          style={[
            styles.footerCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={styles.footerIcon}>
            <Text style={{ fontSize: 22 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.footerTitle, { color: palette.text }]}>
              Small changes. New life.
            </Text>
            <Text style={[styles.smallLabel, { color: palette.muted }]}>
              Last updated {GROW.lastUpdated}
            </Text>
          </View>
        </View>

        <Text style={[styles.disclaimer, { color: palette.muted }]}>
          Preview mode · Readings are illustrative, not live sensor data.
        </Text>
      </ScrollView>

      {/* Minimal bottom navigation preview */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: palette.bg, borderTopColor: palette.border },
        ]}
      >
        {[
          ["◉", "GROW", true],
          ["✳", "JOURNAL", false],
          ["◌", "MOMENTS", false],
          ["⌘", "SETUP", false],
        ].map(([icon, label, selected]) => (
          <Pressable
            key={String(label)}
            accessibilityRole="button"
            accessibilityLabel={String(label)}
            onPress={() => {
              // Navigation will be wired up in a later step.
            }}
            style={styles.navItem}
          >
            <Text
              style={[
                styles.navIcon,
                { color: selected ? palette.green : palette.muted },
              ]}
            >
              {icon}
            </Text>
            <Text
              style={[
                styles.navLabel,
                { color: selected ? palette.green : palette.muted },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 7,
  },
  brand: { fontSize: 27, fontWeight: "800", letterSpacing: -1.2 },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 30,
  },
  connectionText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },

  hero: {
    minHeight: 190,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    justifyContent: "space-between",
    overflow: "hidden",
    marginBottom: 27,
  },
  heroOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -65,
    top: -70,
    backgroundColor: "#39A95D",
    opacity: 0.09,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
    marginVertical: 14,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  stage: { fontSize: 17, fontWeight: "700", marginTop: 5 },
  stageBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  stageBadgeText: { fontSize: 11, fontWeight: "700" },

  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
    marginTop: 2,
  },
  sectionHeading: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  smallLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  metricsRow: { flexDirection: "row", gap: 12, marginBottom: 27 },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: 13,
    borderWidth: 1,
    borderRadius: 20,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 17,
  },
  metricIcon: { fontSize: 20, fontWeight: "600" },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  metricValue: { fontSize: 29, fontWeight: "700", letterSpacing: -1.2 },
  metricUnit: { fontSize: 12, fontWeight: "600" },
  metricSubtitle: { fontSize: 10, marginTop: 5, minHeight: 25 },
  chart: {
    height: 37,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    marginTop: 10,
  },
  chartBar: { flex: 1, borderRadius: 3, minHeight: 3 },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  tinyLabel: { fontSize: 8, letterSpacing: 0.3 },

  deviceList: { gap: 10, marginBottom: 24 },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 18,
    gap: 12,
  },
  deviceIconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceIcon: { fontSize: 22, fontWeight: "600" },
  deviceInfo: { flex: 1, gap: 5 },
  deviceTitle: { fontSize: 14, fontWeight: "700" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: { fontSize: 10, fontWeight: "800" },

  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderWidth: 1,
    borderRadius: 18,
  },
  footerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#193E27",
    alignItems: "center",
    justifyContent: "center",
  },
  footerTitle: { fontSize: 13, fontWeight: "700", marginBottom: 5 },
  disclaimer: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 6,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 11,
    paddingBottom: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navItem: { alignItems: "center", gap: 4, minWidth: 58, paddingVertical: 3 },
  navIcon: { fontSize: 19 },
  navLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.7 },
});
