import React, { Component, ReactNode } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { theme, RawText, Icon } from "@/ui";
import { logger } from "../services/logger";
import { SHOW_DIAGNOSTICS } from "@/config/diagnostics";

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
  /** Ham teşhisi göster (varsayılan: ortam — `SHOW_DIAGNOSTICS`). */
  showDiagnostics?: boolean;
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
        showDiagnostics={this.props.showDiagnostics ?? SHOW_DIAGNOSTICS}
      />
    );
  }
}

function FallbackScreen({
  error,
  componentStack,
  onRetry,
  showDiagnostics,
}: {
  error: Error | null;
  componentStack: string | null;
  onRetry: () => void;
  showDiagnostics: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Icon
        name="exclamation-triangle"
        size={64}
        color={theme.colors.danger[500]}
      />
      <RawText style={styles.title}>{t("mobile.errorSomethingWrong")}</RawText>
      <RawText style={styles.subtitle}>
        {t("mobile.errorBoundaryDescription")}
      </RawText>
      {/* TANI: gerçek hatayı ekranda göster — YALNIZ geliştirme/staging
          (`SHOW_DIAGNOSTICS`). Production'da kullanıcı ve App Review ham
          console/route dökümü görmez; hata Sentry'ye gider. */}
      {showDiagnostics && error && (
        <ScrollView style={styles.errorBox}>
          <RawText style={styles.errorText}>
            {"### CONSOLE (Check the render method of ...) ###\n"}
            {capturedLogs.filter((l) => /invalid|render method|got:|undefined/i.test(l)).join("\n---\n") || "(ilgili log yok)"}
            {"\n\n### ROUTE: " + lastRouteRef.current + "\n\n"}
            {error.message}
          </RawText>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <RawText style={styles.buttonText}>{t("mobile.errorRetry")}</RawText>
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.gray[900],
    marginTop: theme.spacing[4],
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray[600],
    textAlign: "center",
    marginTop: theme.spacing[2],
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
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
    fontSize: theme.typography.fontSize.xs,
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
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.base,
  },
});
