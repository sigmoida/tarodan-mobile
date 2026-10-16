import { logger, safeError } from '@/services/logger';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { readStoredValue, writeStoredValue } from '@/lib/storage/lazyAsyncStorage';
import { router } from 'expo-router';
import { theme } from '@/ui';
import { api, guestApi } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { invalidateForNewNotification } from '@/hooks/useBadgePoll';
import i18n from '@/i18n/config';
import { notificationRoute } from '../utils/notificationRoute';
import { navigateTo } from '@/lib/navigation/goTo';
import { withTimeout } from '@/utils/withTimeout';
import { captureMessage } from '@/services/sentry';
import { getInstallId } from '@/lib/device/installId';
import {
  readNotificationPermission,
  requestNotificationPermission,
} from '@/lib/permissions';
import { settlePendingPushRevoke } from './pushRevocation';

/** Push token alımı için üst sınır — çıkış akışı bundan uzun bekleyemez. */
const PUSH_TOKEN_TIMEOUT_MS = 5000;
/**
 * Kayıt akışında token alımının üst sınırı. `getExpoPushTokenAsync` APNs/FCM kaydını ve Expo'ya
 * ağ isteğini bekler; kendi zaman aşımı YOKTUR. Süre dolarsa kayıt "başarısız" sayılır ve
 * yeniden denenir (`usePushRegistration`).
 */
const REGISTER_TOKEN_TIMEOUT_MS = 15000;

const { colors } = theme;

// Conditionally import notifications - only in development builds, not Expo Go
let Notifications: any = null;
const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Uygulama ön planda (açık) iken gelen bildirimin nasıl sunulacağı — TEK tanım
    // (eski `app/_layout.tsx` kopyası, kullanımdan kalkmış `shouldShowAlert` ile, kaldırıldı).
    // Bu olmadan Expo, foreground bildirimini varsayılan olarak göstermez.
    // Rozet: sunucu push'a okunmamış zil sayısını (`badge`) koyar; ön planda da o uygulanır.
    // Uygulama içindeyken rozet ayrıca okunmamış sayısı sorgusundan senkronlanır
    // (`useAppBadgeSync`) — iki kaynak da aynı sayıyı (okunmamış zil bildirimi) yazar.
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

/** Push bu ortamda mümkün mü (Expo Go değil, modül var, gerçek cihaz)? */
function pushAvailable(): boolean {
  return !isExpoGo && !!Notifications && Device.isDevice === true;
}

// ── Android bildirim kanalları ───────────────────────────────────────────────────────────────

/**
 * Kanal kimlikleri — sunucunun `channelId` değerleriyle BİREBİR aynı (tarodan-app
 * `apps/api/src/modules/notification/helpers/push-delivery.ts` → `pushChannelFor`).
 */
export const PUSH_CHANNEL_IDS = ['default', 'trades', 'messages', 'orders'] as const;

let channelsLocale: string | null = null;

/**
 * Android kanallarını oluşturur (iOS'ta no-op). İzin İSTENMEDEN ve token ALINMADAN ÖNCE
 * çağrılmalı: Android 13+ kanal yokken bildirim izni diyaloğunu göstermez, gelen push da
 * tanımsız kanala düşer. `setNotificationChannelAsync` idempotent; dil değişince adlar
 * yeniden yazılır.
 *
 * Kanal adları Android sistem ayarlarında kullanıcıya gösterilir — React dışı bir modülüz,
 * `paytrDirectForm.ts` ile aynı desen: global `i18n`'den ÇAĞRI ANINDA okunur.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || isExpoGo || !Notifications) return;
  const locale = i18n.language || 'tr';
  if (channelsLocale === locale) return;
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
    channelsLocale = locale;
  } catch (e) {
    logger.warn('Notification channel setup failed', { err: safeError(e) });
  }
}

// ── Kayıt ────────────────────────────────────────────────────────────────────────────────────

/**
 * Kayıt sonucu:
 * - `registered`: token sunucuya yazıldı;
 * - `failed`: token alınamadı ya da sunucu reddetti → yeniden denenir;
 * - `no-permission`: izin yok (sorulmadı / reddedildi) — sessizce geçilir;
 * - `unavailable`: Expo Go / simülatör / projectId yok.
 */
export type PushRegistrationResult = 'registered' | 'failed' | 'no-permission' | 'unavailable';

/** Kayıt seçenekleri. */
export interface PushRegistrationOptions {
  /**
   * `true`: izin yoksa ve sorulabiliyorsa sistem diyaloğu gösterilir. Varsayılan `false` —
   * açılışta/girişte SORULMAZ; yalnız kullanıcı "Bildirimleri aç" dediğinde (ön-izin sheet'i,
   * Ayarlar → Bildirimler) istenir.
   */
  prompt?: boolean;
}

async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = resolveProjectId();
  if (!projectId || !Notifications) return null;
  const response = await withTimeout<{ data: string }>(
    Notifications.getExpoPushTokenAsync({ projectId }),
    REGISTER_TOKEN_TIMEOUT_MS,
  );
  return response?.data ?? null;
}

/** Hata durumunu (yalnız HTTP kodu) özetler — gövde/başlık günlüğe girmez. */
function failureStatus(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return typeof status === 'number' ? String(status) : 'network';
}

/**
 * Token'ı sunucuya yazar (`POST /notifications/push-token`). Başarısızlıkta FIRLATIR.
 * `deviceId` kurulum başına sabit kimlik; `deviceModel` ayrı alan (eski sürümler `deviceId`'ye
 * model adını yazıyordu).
 */
export async function postPushToken(token: string): Promise<void> {
  await api.post('/notifications/push-token', {
    token,
    platform: Platform.OS,
    deviceId: await getInstallId(),
    deviceModel: Device.modelName ?? undefined,
  });
}

async function runRegistration(
  options: PushRegistrationOptions,
): Promise<{ result: PushRegistrationResult; token: string | null }> {
  if (!pushAvailable() || !resolveProjectId()) {
    return { result: 'unavailable', token: null };
  }

  // Kanallar izin diyaloğundan ve token'dan ÖNCE (Android 13 diyaloğu kanal ister).
  await ensureNotificationChannels();

  let permission = await readNotificationPermission();
  if (permission.status !== 'granted' && options.prompt) {
    permission = await requestNotificationPermission();
  }
  if (permission.status === 'unavailable') return { result: 'unavailable', token: null };
  if (permission.status !== 'granted') return { result: 'no-permission', token: null };

  let token: string | null = null;
  try {
    token = await fetchExpoPushToken();
  } catch (error) {
    logger.warn('Expo push token unavailable', { err: safeError(error) });
  }
  if (!token) {
    captureMessage('push.register: Expo push token could not be obtained', 'warning');
    return { result: 'failed', token: null };
  }

  // Önceki çıkışın push iptali uçuştaysa önce o sonuçlansın (≤ 5 sn): sunucu iptali cihaz
  // token'ının TÜM kayıtlarını kapatır; yeni kaydın ardından ulaşırsa onu da kapatırdı.
  // Her kayıt yolu (giriş, yeniden deneme, ön plan, token yenilenmesi) buradan geçer.
  await settlePendingPushRevoke();

  try {
    await postPushToken(token);
  } catch (error) {
    // Eskiden `.catch(debug)` ile yutuluyordu: kayıt başarısız olsa da kimse bilmiyordu.
    const status = failureStatus(error);
    logger.warn('Push token registration failed', { status });
    captureMessage(`push.register: backend rejected push token (${status})`, 'warning');
    return { result: 'failed', token };
  }

  // Push token'ı kullanıcıya bağlı bir tanımlayıcıdır: release cihaz günlüğüne yazılmaz.
  logger.debug('Push token registered', { token });
  return { result: 'registered', token };
}

/**
 * Bu cihazı push için kaydeder. Varsayılan olarak izin İSTEMEZ (yalnız verilmişse kaydeder);
 * `prompt: true` yalnız kullanıcı eylemiyle (ön-izin sheet'i / Ayarlar) kullanılır.
 */
export async function syncPushRegistration(
  options: PushRegistrationOptions = {},
): Promise<PushRegistrationResult> {
  return (await runRegistration(options)).result;
}

/**
 * Geriye dönük uyumlu sarmal: kaydı yapar (izin İSTEMEZ), kayıtlı token'ı döner.
 * (Eskiden her açılışta izin istiyordu — artık ön-izin akışı istiyor.)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { result, token } = await runRegistration({});
  return result === 'registered' ? token : null;
}

/**
 * Cihaz push token'ı değişince (APNs/FCM yenilemesi) çağrılır. Dinleyici yeni Expo token'ını
 * yeniden alıp sunucuya yazmalıdır (`usePushRegistration`). Abonelik kaldırıcı döner.
 */
export function addPushTokenChangeListener(callback: () => void): () => void {
  if (isExpoGo || !Notifications?.addPushTokenListener) return () => {};
  const sub = Notifications.addPushTokenListener(() => callback());
  return () => {
    try {
      sub?.remove?.();
    } catch {
      /* noop */
    }
  };
}

/** Uygulama simgesi rozeti (okunmamış zil sayısı). En iyi çaba, fırlatmaz. */
export async function setAppBadgeCount(count: number): Promise<void> {
  if (isExpoGo || !Notifications?.setBadgeCountAsync) return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, Math.floor(count)));
  } catch {
    /* en iyi çaba */
  }
}

/**
 * Çıkışta yerel push durumunu temizler: uygulama simgesi rozeti sıfırlanır ve önceki hesabın
 * bildirim merkezinde duran bildirimleri kaldırılır (ortak cihazda mesaj önizlemeleri kalmasın;
 * dokununca çıkış yapmış hesabın ekranına gitmesin). En iyi çaba, fırlatmaz.
 */
export async function clearLocalPushState(): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    await Promise.allSettled([
      Promise.resolve(Notifications.setBadgeCountAsync?.(0)),
      Promise.resolve(Notifications.dismissAllNotificationsAsync?.()),
    ]);
  } catch {
    /* en iyi çaba */
  }
}

/**
 * Bu cihazın push token'ını sunucuda deaktive eder ve yerel push durumunu temizler (çıkış).
 *
 * İptal ucu oturum İSTEMEZ (sunucu: `@Public`, `revoke: true` — token cihazın kendi sırrıdır):
 * istek interceptor'sız istemciyle (`guestApi`) Bearer'SIZ gider. Böylece zorunlu çıkışta
 * (oturum düşmüş), sunucusuz çıkışta ve süresi dolmuş token'la da cihaz bildirim almayı keser;
 * 401'i refresh / zorunlu çıkış döngüsü başlatmaz.
 *
 * `signal` iptal edilirse istek gönderilmez (ya da yarıda kesilir): bekleyen iptal, sonraki
 * girişin yeni kaydından SONRA sunucuya ulaşıp onu kapatmasın (`@/services/pushRevocation`).
 */
export async function unregisterPushNotifications(
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  const { signal } = options;
  await clearLocalPushState();
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
    // İptal edilirse (signal) token beklenmez.
    const aborted = new Promise<undefined>((resolve) => {
      if (signal?.aborted) resolve(undefined);
      signal?.addEventListener('abort', () => resolve(undefined));
    });
    const tokenResponse = await Promise.race([
      withTimeout<{ data: string }>(
        Notifications.getExpoPushTokenAsync({ projectId }),
        PUSH_TOKEN_TIMEOUT_MS,
      ),
      aborted,
    ]);
    if (!tokenResponse?.data || signal?.aborted) return;
    // Aynı endpoint'e revoke:true ile gidiyoruz; backend bu token'ı
    // push_tokens tablosunda isActive=false yapar (notification.service.ts).
    await guestApi.post(
      '/notifications/push-token',
      { token: tokenResponse.data, revoke: true },
      { timeout: PUSH_TOKEN_TIMEOUT_MS, signal },
    ).catch(() => null);
  } catch (error) {
    logger.error('Error unregistering push token', { err: safeError(error) });
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
      // Sekme hedefi ikinci bir `(tabs)` itmesin (`navigateTo`: sekmede dismissTo, aksi halde push).
      navigateTo(target);
      return;
    }

    // Push'ta hedef çözülemezse bildirim listesi makul iniş noktası: kullanıcı
    // zaten bildirime dokunarak uygulamayı açtı, boş ekranda bırakılmamalı.
    // (Uygulama içi listede karşılığı "gezinme yok" — orada zaten listedesin.)
    // `navigate`: liste zaten açıksa ikinci bir kopya itilmez.
    router.navigate('/notifications');
  } catch (err) {
    logger.debug('routeFromNotification failed', { err: safeError(err) });
  }
}

// ── Dokunuş yönlendirmesi: tekilleştirme ────────────────────────────────────────────────────

/**
 * Son yönlendirilen bildirimin kimliği — OTA `reloadAsync` / JS yeniden başlatmadan sağ çıkar.
 * Yeniden yüklemede `getLastNotificationResponseAsync` AYNI yanıtı tekrar döndürür; kimlik
 * saklanmazsa kullanıcı (güncelleme sonrası) eski bildirimin ekranına yeniden atılırdı.
 */
const LAST_ROUTED_NOTIFICATION_KEY = 'push.lastRoutedNotificationId';

/** Bu JS oturumunda yönlendirilmiş yanıtlar (canlı dinleyici + soğuk açılış çakışması). */
const routedIds = new Set<string>();

function responseIdentifier(response: any): string | null {
  const id = response?.notification?.request?.identifier;
  return typeof id === 'string' && id ? id : null;
}

/** Sistemdeki "son yanıt"ı temizler: bir sonraki soğuk açılış/yeniden yükleme onu görmesin. */
function clearLastResponse(): void {
  try {
    if (typeof Notifications?.clearLastNotificationResponse === 'function') {
      Notifications.clearLastNotificationResponse();
    } else {
      void Notifications?.clearLastNotificationResponseAsync?.()?.catch?.(() => undefined);
    }
  } catch {
    /* en iyi çaba */
  }
}

/**
 * Yanıtı EN FAZLA BİR KEZ yönlendirir. `persisted`: soğuk açılış yolunda önceki JS
 * oturumunun (OTA yeniden yükleme öncesi) yönlendirdiği kimlik.
 */
function routeResponseOnce(response: any, persisted?: string | null): void {
  const data = response?.notification?.request?.content?.data;
  if (!data) return;
  const id = responseIdentifier(response);
  if (id) {
    if (routedIds.has(id) || id === persisted) return;
    routedIds.add(id);
    void writeStoredValue(LAST_ROUTED_NOTIFICATION_KEY, id);
  }
  routeFromNotification(data);
  clearLastResponse();
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

  // Android kanalları açılışta (izin istenmeden önce) hazır olsun: Android 13 izin diyaloğu
  // kanal ister, sunucunun gönderdiği `channelId` de var olan bir kanala düşmeli.
  void ensureNotificationChannels();

  // 1) User taps an OS-level notification
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      routeResponseOnce(response);
    },
  );

  // 2) Notification arrives while app is foregrounded — handle any pre-resolved
  //    "auto-open" flag (data.autoOpen === true). Otherwise let the user tap.
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification: any) => {
      // Yeni bildirim geldi: liste + rozet sayacı bayat. Bildirimler sekmesi staleTime'lı olduğu
      // için tazelemeyi burası tetikler (açıksa arka planda, değilse bir sonraki açılışta).
      // Liste + bildirim / bekleyen teklif/takas rozetleri — soketin `notification:new`'iyle
      // AYNI yardımcı (ikisi aynı bildirim için gelse de çift istek yok).
      invalidateForNewNotification(queryClient);
      const data = notification?.request?.content?.data;
      if (data?.autoOpen === true || data?.auto_open === true) {
        routeFromNotification(data);
      }
    },
  );

  // 3) Cold-start: uygulama KAPALIYKEN bildirime basılıp açıldıysa, yanıt live
  // listener'a düşmeyebilir → son yanıtı bir kez oku ve yönlendir. Canlı dinleyici de aynı
  // yanıtı verdiyse kimlik tekilleştirmesi ikinci gezinmeyi engeller; OTA yeniden yüklemesinden
  // sonra aynı yanıt saklı kimlikle elenir.
  void (async () => {
    try {
      const [response, persisted] = await Promise.all([
        Notifications.getLastNotificationResponseAsync(),
        readStoredValue(LAST_ROUTED_NOTIFICATION_KEY),
      ]);
      if (response) routeResponseOnce(response, persisted);
    } catch {
      /* sessiz */
    }
  })();

  return () => {
    try {
      responseSub?.remove?.();
      receivedSub?.remove?.();
    } catch {
      /* noop */
    }
  };
}

/** YALNIZ TEST: modül durumunu sıfırlar. */
export function resetPushModuleStateForTests(): void {
  routedIds.clear();
  channelsLocale = null;
}
