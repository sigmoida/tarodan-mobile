// TANI/WORKAROUND (gecici): screens 4.16 + New Architecture tab bar'i bozuk
// ciziyor; native ekranlari kapatinca duz RN view ile dogru cizilir.
import { enableScreens } from "react-native-screens";
enableScreens(false);

import { useEffect, useState } from "react";
import { logger, safeError } from "@/services/logger";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { useBrandFontSession } from "@/hooks/useBrandFontSession";
// Noto Sans (web ile aynı aile ve ağırlıklar). Alt yoldan import: paket kökü 18 dosyanın
// hepsini paketlerdi; yalnız kullanılan 4 ağırlık bundle'a girer.
import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { NotoSans_500Medium } from "@expo-google-fonts/noto-sans/500Medium";
import { NotoSans_600SemiBold } from "@expo-google-fonts/noto-sans/600SemiBold";
import { NotoSans_700Bold } from "@expo-google-fonts/noto-sans/700Bold";
import { theme, AlertDialogHost, BrandFontProvider, ToastHost } from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { useCartMergeOnLogin } from '@/hooks/useServerCart';
import { useMembershipLimits } from '@/hooks/useMembershipLimits';
import { useMessagingSocket } from "@/hooks/messaging";
// Paylaşılan QueryClient — logout'ta resetUserStores aynı örneği temizler.
import { queryClient } from "@/lib/queryClient";
import {
  registerForPushNotifications,
  setupPushNotificationRouting,
} from "@/services/push";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { initSentry } from "@/services/sentry";
import AnimatedSplash from "@/components/AnimatedSplash";
import BusinessMembershipGuard from "@/components/BusinessMembershipGuard";
import ForceUpdateGate from "@/components/ForceUpdateGate";
import RequiredStepsGate from "@/components/required-steps/RequiredStepsGate";
import { useFullScreenGateShown } from "@/components/common/FullScreenGate";
import { ErrorBoundary, RouteTracker } from "@/components/ErrorBoundary";

const { colors } = theme;

// Initialize Sentry as early as possible. No-ops in Expo Go or when
// EXPO_PUBLIC_SENTRY_DSN is unset (see services/sentry.ts guard); real
// reporting requires a dev/production build with a DSN configured.
initSentry();

// Conditionally import notifications - only in development builds, not Expo Go
let Notifications: any = null;
const isExpoGo = Constants.executionEnvironment === "storeClient";

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.log("⚠️ expo-notifications not available");
  }
}

// Prevent splash screen from hiding
SplashScreen.preventAutoHideAsync();

// Configure notifications (only in development builds, not Expo Go)
if (!isExpoGo && Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log("⚠️ Notification handler setup failed (normal in Expo Go)");
  }
}

/** QueryClientProvider'ın altında çalışması gereken global mesaj socket köprüsü (#77). */
function MessagingSocketBridge() {
  useMessagingSocket();
  return null;
}

/** Misafirken eklenen sepet satırlarını giriş sonrası sunucu sepetine taşır. */
function CartMergeBridge() {
  useCartMergeOnLogin();
  useMembershipLimits();
  return null;
}

export default function RootLayout() {
  const { loadToken, isAuthenticated } = useAuthStore();
  // appReady: hazırlık bitti. splashDone: animasyonlu splash çıkışını tamamladı.
  // Native splash'i AnimatedSplash kapatır (onLayout) → beyaz parlama olmaz.
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  // Tam ekran kapı (zorunlu güncelleme / zorunlu adım) açıkken temalı uyarı
  // ertelenir: kapının üstüne binmesin, iOS'ta modal üstüne modal kilitlenmesin.
  const gateShown = useFullScreenGateShown();
  // Marka fontu. Yüklenene kadar splash kalır (appReady'ye katılır). Hata olursa sistem
  // fontuyla devam edilir: BrandFontProvider `false` kalır, hiçbir metin kayıtsız aile adı
  // almaz. Anahtar adları `brandFontFiles` (src/theme/typography.ts) ile aynı olmalı.
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  });
  // Emniyet: yükleme hiç sonuçlanmazsa splash sonsuza dek kalmasın — süre dolunca sistem
  // fontuyla açılır ve bu OTURUM sistem fontunda kalır (sonradan geçiş tüm metni kaydırırdı).
  const { settled: fontsSettled, enabled: brandFontEnabled } = useBrandFontSession(
    fontsLoaded,
    fontError,
  );
  useEffect(() => {
    if (fontError) logger.warn("Brand font load failed", { err: safeError(fontError) });
  }, [fontError]);

  useEffect(() => {
    async function prepare() {
      try {
        await loadToken();
        // Only register for push notifications in development builds, not Expo Go
        if (isAuthenticated && !isExpoGo) {
          try {
            await registerForPushNotifications();
          } catch (e) {
            logger.debug(
              "Push notification registration skipped (normal in Expo Go)",
            );
          }
        }
      } catch (e) {
        logger.warn('App bootstrap failed', { err: safeError(e) });
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  // Token kaydını isAuthenticated değişimine de bağla: kullanıcı uygulamayı
  // çıkışlı açıp SONRA login olursa (isAuthenticated mount'tan sonra true olur),
  // yukarıdaki []-bağımlı prepare() tekrar çalışmaz ve token hiç kaydolmazdı.
  // registerToken upsert olduğu için açılışta + login'de çift çağrı zararsız.
  useEffect(() => {
    if (isAuthenticated && !isExpoGo) {
      registerForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);

  // Global mesaj socket köprüsü (#77) QueryClientProvider'ın ALTINDA çalışmalı
  // (useQueryClient) → <MessagingSocketBridge/> olarak provider içinde render edilir.

  // Wire push notification deep-link routing (tap + foreground-received).
  // Safe in Expo Go (no-op when expo-notifications isn't available).
  useEffect(() => {
    const teardown = setupPushNotificationRouting();
    return () => {
      teardown();
    };
  }, []);

  // Universal link + custom scheme yönlendirmesi burada DEĞİL: app/+native-intent.ts
  // (`redirectSystemPath`) expo-router'ın rotalamasından ÖNCE çalışır. Burada bir
  // router.push daha yapılırsa aynı ekran iki kez açılır.

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
        <BrandFontProvider ready={brandFontEnabled}>
          {/* Yığın ekranları beyaz üst bar: koyu içerik. Turuncu marka barlı sekme kökleri (AppShell)
              odaktayken açık içeriğe çevirir. */}
          <StatusBar style="dark" />
          <RouteTracker />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary[600]! },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: "bold" },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
          {/* Global mesaj socket köprüsü (#77) — provider altında setQueryData için. */}
          <MessagingSocketBridge />
          <CartMergeBridge />
          {/* Kurumsal hesap business üyelik yoksa üyelik sayfasına yönlendirir (web ile aynı). */}
          <BusinessMembershipGuard />
          {/* Native Alert.alert yerine temalı dialog — appAlert() bu host'u kullanır.
              Host HEP bağlı: kapı açıkken yalnız askıya alınır (alert'ler kuyrukta bekler, kapı
              kapanınca çıkar). Eskiden kapıya bağlı koşullu bağlanıyordu; söküm, kapanma
              zamanlayıcısını temizleyip basılan düğmenin `onPress`'ini kaybettiriyordu. */}
          <AlertDialogHost suspended={gateShown} />
          {/* Global toast (web react-hot-toast karşılığı): toast.success / toast.error / toast(). */}
          <ToastHost />
          {/* Zorunlu adımlar (bekleyen sözleşme onayı): girişte + ön plana gelişte kapatılamaz ekran. */}
          {/* Kapılar native Modal: soğuk açılışta splash bitmeden gösterilmez (ready). */}
          <RequiredStepsGate ready={splashDone} />
          {/* Min desteklenen sürümün altındaki build'leri tam ekran bloklar (#233). */}
          <ForceUpdateGate ready={splashDone} />
          {!splashDone && (
            <AnimatedSplash
              appReady={appReady && fontsSettled}
              onFinish={() => setSplashDone(true)}
            />
          )}
        </BrandFontProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
