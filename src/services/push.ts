import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { theme } from '@/ui';
import { api } from '@/lib/api';
import i18n from '@/i18n/config';
import { notificationRoute } from '../utils/notificationRoute';
import { withTimeout } from '@/utils/withTimeout';

/** Push token alımı için üst sınır — çıkış akışı bundan uzun bekleyemez. */
const PUSH_TOKEN_TIMEOUT_MS = 5000;

const { colors } = theme;

// Conditionally import notifications - only in development builds, not Expo Go
let Notifications: any = null;
const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Uygulama ön planda (açık) iken gelen bildirimin nasıl sunulacağı.
    // Bu olmadan Expo, foreground bildirimini varsayılan olarak göstermez.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('⚠️ expo-notifications not available');
  }
}

/**
 * EAS projectId çözümü. `eas init` değeri app.json → extra.eas.projectId'ye
 * yazar; lokalde EXPO_PUBLIC_PROJECT_ID env ile override edilebilir. Placeholder
 * ("REPLACE_WITH_...") geçersiz sayılır. projectId yoksa Expo push token alınamaz.
 */
function resolveProjectId(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_PROJECT_ID;
  const fromConfig = (Constants.expoConfig?.extra as any)?.eas?.projectId;
  const id = fromEnv || fromConfig;
  if (!id || typeof id !== 'string' || id.startsWith('REPLACE_WITH')) {
    return null;
  }
  return id;
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Skip in Expo Go - push notifications not supported
  if (isExpoGo || !Notifications) {
    console.log('⚠️ Push notifications not available in Expo Go');
    return null;
  }

  let token: string | null = null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }
  } catch (e) {
    console.log('⚠️ Push notification permissions unavailable');
    return null;
  }

  // Get Expo push token
  try {
    // Skip push token in Expo Go (development) - it requires projectId
    // Push notifications will work in production builds with EAS
    const projectId = resolveProjectId();

    if (!projectId) {
      console.log('⚠️ Push notifications skipped (no projectId - normal in Expo Go)');
      return null;
    }
    
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = tokenResponse.data;

    // Register token with backend (POST /notifications/push-token)
    await api.post('/notifications/push-token', {
      token,
      platform: Platform.OS,
      deviceId: Device.modelName ?? 'unknown',
    }).catch((err: any) => {
      console.log('Failed to register push token with backend:', err.message);
    });

    console.log('Push token registered:', token);
  } catch (error: any) {
    // Don't show error in development - this is expected in Expo Go
    console.log('⚠️ Push notifications unavailable:', error.message);
  }

  // Configure notification channel for Android
  // Kanal adları Android sistem ayarlarında kullanıcıya gösterilir — React
  // dışı bir modülüz, `paytrDirectForm.ts` ile aynı desen: global `i18n`'den
  // ÇAĞRI ANINDA (registerForPushNotifications her çalıştığında) okunur.
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: i18n.t('common.default'),
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.danger[500],
      });

      await Notifications.setNotificationChannelAsync('trades', {
        name: i18n.t('nav.trades'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.success[500],
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: i18n.t('message.messages'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.info[500],
      });

      await Notifications.setNotificationChannelAsync('orders', {
        name: i18n.t('notification.filterOrders'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.warning[500],
      });
    } catch (e) {
      console.log('⚠️ Notification channel setup failed');
    }
  }

  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }
  try {
    const projectId = resolveProjectId();
    if (!projectId) {
      return;
    }
    // ⏱ Süre sınırı: `getExpoPushTokenAsync` APNs kaydını bekler ve Expo'nun
    // push servisine ağ isteği atar; kendi zaman aşımı YOKTUR. Gerçek cihazda
    // asılı kaldığında çıkış akışını, o da response interceptor'ı bloklar
    // (31 Ağu 2026, Apple girişi sonsuz spinner). Token alınamazsa sunucuya
    // haber veremeyiz — kabul edilebilir: çıkış yerel tarafta zaten tamamlanır.
    // `Notifications` gevşek tipli (any) — jenerik açıkça verilir.
    const tokenResponse = await withTimeout<{ data: string }>(
      Notifications.getExpoPushTokenAsync({ projectId }),
      PUSH_TOKEN_TIMEOUT_MS,
    );
    if (!tokenResponse) return;
    // Aynı endpoint'e revoke:true ile gidiyoruz; backend bu token'ı
    // push_tokens tablosunda isActive=false yapar (notification.service.ts).
    await api.post('/notifications/push-token', {
      token: tokenResponse.data,
      revoke: true,
    }).catch(() => null);
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Push payload'unu (`notification.request.content.data`) rotaya çevirip gezinir.
 * Karar TEK katmanda (`@/utils/notificationRoute`) — uygulama içi liste de aynı
 * fonksiyonu çağırır. Burada ikinci bir sıralama tutmak, push tap ile liste
 * tap'inin aynı bildirimde farklı ekranlara gitmesine yol açıyordu (2026-08-11
 * ölçümü).
 */
export function routeFromNotification(data: any): void {
  try {
    // Push payload'u bildirim kaydının DÜZLEŞTİRİLMİŞ hâli: `type`/`link` ve
    // kimlikler aynı nesnede gelir, `data` sarmalayıcısı yoktur. Çözümleyici
    // ikisini de aynı şekilde okusun diye nesne hem `data` hem üst seviye verilir.
    const target = notificationRoute({ type: data?.type, link: data?.link, data });
    if (target) {
      router.push(target as any);
      return;
    }

    // Push'ta hedef çözülemezse bildirim listesi makul iniş noktası: kullanıcı
    // zaten bildirime dokunarak uygulamayı açtı, boş ekranda bırakılmamalı.
    // (Uygulama içi listede karşılığı "gezinme yok" — orada zaten listedesin.)
    router.push('/(tabs)/notifications' as any);
  } catch (err) {
    console.log('routeFromNotification failed:', (err as any)?.message);
  }
}

/**
 * Wires Expo notification listeners (tap + foreground-received) to the
 * deep-link router above. Returns a teardown that removes both listeners.
 * Safe to call in Expo Go (no-op).
 */
export function setupPushNotificationRouting(): () => void {
  if (isExpoGo || !Notifications) {
    return () => {};
  }

  // 1) User taps an OS-level notification
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      const data = response?.notification?.request?.content?.data;
      routeFromNotification(data);
    },
  );

  // 2) Notification arrives while app is foregrounded — handle any pre-resolved
  //    "auto-open" flag (data.autoOpen === true). Otherwise let the user tap.
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification: any) => {
      const data = notification?.request?.content?.data;
      if (data?.autoOpen === true || data?.auto_open === true) {
        routeFromNotification(data);
      }
    },
  );

  // 3) Cold-start: uygulama KAPALIYKEN bildirime basılıp açıldıysa, yanıt live
  // listener'a düşmez → son yanıtı bir kez oku ve yönlendir.
  Notifications.getLastNotificationResponseAsync()
    .then((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (data) routeFromNotification(data);
    })
    .catch(() => { /* sessiz */ });

  return () => {
    try {
      responseSub?.remove?.();
      receivedSub?.remove?.();
    } catch {
      /* noop */
    }
  };
}
