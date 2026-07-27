import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { theme } from "@/ui";
import { logger } from "../services/logger";

const { colors } = theme;

// TANI (geçici): çöken route'u yakalamak için son gidilen path'i modül
// seviyesinde tutar. <RouteTracker/> router içinde render edilir; ErrorBoundary
// (router dışında) bu ref'ten okur. Kök neden bulununca geri alınacak.
export const lastRouteRef = { current: "(bilinmiyor)" };

// TANI (geçici): React, "Element type is invalid" fırlatmadan önce console.error
// ile "Check the render method of `X`" uyarısı basar (X = gerçek bileşen adı).
// Bunu yakalayıp ErrorBoundary'de gösteriyoruz. Kök neden bulununca geri alınacak.
export const capturedLogs: string[] = [];
if (!(console as unknown as { __patched?: boolean }).__patched) {
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const msg = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
      capturedLogs.push(msg.slice(0, 600));
      if (capturedLogs.length > 8) capturedLogs.shift();
    } catch {}
    orig(...args);
  };
  (console as unknown as { __patched?: boolean }).__patched = true;
}

export function RouteTracker() {
  const pathname = usePathname();
  lastRouteRef.current = pathname; // render-time yazım (tanı amaçlı)
  return null;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * Uygulama içinde herhangi bir render-time crash'i yakalar:
 *   - React tree'sini beyaz ekrana bırakmaz, friendly bir "tekrar dene"
 *     ekranı gösterir (i18n ile çevrilir).
 *   - Hatayı Sentry'ye gönderir (paketleme sonrası gerçekten gönderir;
 *     dev'de ve Expo Go'da no-op).
 *
 * Class component → hook kullanılamaz; fallback UI ayrı bir functional
 * component (FallbackScreen) ve useTranslation orada çağrılır.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    this.setState({ componentStack: errorInfo.componentStack ?? null });
    logger.captureException(error, {
      level: "error",
      tags: { boundary: "app-root" },
      componentStack: errorInfo.componentStack ?? "n/a",
    });
  }

  reset = () => this.setState({ hasError: false, error: null, componentStack: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <FallbackScreen
        error={this.state.error}
        componentStack={this.state.componentStack}
        onRetry={this.reset}
      />
    );
  }
}

function FallbackScreen({
  error,
  componentStack,
  onRetry,
}: {
  error: Error | null;
  componentStack: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="warning-outline"
        size={64}
        color={theme.colors.danger[500]}
      />
      <Text style={styles.title}>Bir şeyler ters gitti</Text>
      <Text style={styles.subtitle}>
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </Text>
      {/* TANI (geçici): staging'de gerçek hatayı ekranda göster — OTA ile teşhis.
          Kök neden bulununca geri alınacak (__DEV__ guard'ı geri gelecek). */}
      {error && (
        <ScrollView style={styles.errorBox}>
          <Text style={styles.errorText}>
            {"### CONSOLE (Check the render method of ...) ###\n"}
            {capturedLogs.filter((l) => /invalid|render method|got:|undefined/i.test(l)).join("\n---\n") || "(ilgili log yok)"}
            {"\n\n### ROUTE: " + lastRouteRef.current + "\n\n"}
            {error.message}
          </Text>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[6],
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.gray[900],
    marginTop: theme.spacing[4],
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.gray[600],
    textAlign: "center",
    marginTop: theme.spacing[2],
    lineHeight: 20,
  },
  errorBox: {
    maxHeight: 200,
    marginTop: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: colors.danger[50],
    borderRadius: theme.radius.xl,
    width: "100%",
  },
  errorText: {
    fontFamily: "Courier",
    fontSize: 11,
    color: colors.danger[800],
  },
  button: {
    marginTop: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[8],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.xl,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});
