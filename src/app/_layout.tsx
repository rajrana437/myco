import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import AuthProvider from "@/providers/auth-provider";
import { useAuth } from "@/hooks/use-auth";

function NavigationGate() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    const onLoginScreen = pathname === "/login";
    if (!session && !onLoginScreen) router.replace("/login");
    if (session && onLoginScreen) router.replace("/");
  }, [isLoading, pathname, router, session]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A100D", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#8CE6A0" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGate />
    </AuthProvider>
  );
}
