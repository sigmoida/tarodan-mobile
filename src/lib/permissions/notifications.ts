import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { logger, safeError } from '@/services/logger';
import {
  UNAVAILABLE_PERMISSION,
  type PermissionAccessor,
  type PermissionState,
  type PermissionStatus,
} from './types';

/**
 * Bildirim izni — okuma ve isteme TEK yerden. `expo-notifications` Expo Go'da yok; modül
 * gevşek (lazy) yüklenir, yoksa durum `unavailable` döner (fırlatmaz).
 */
type NotificationsModule = {
  getPermissionsAsync: () => Promise<RawPermission>;
  requestPermissionsAsync: (options?: unknown) => Promise<RawPermission>;
};
type RawPermission = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: { status?: number };
};

/** iOS `UNAuthorizationStatus.provisional` (3) / `ephemeral` (4): sessiz ama teslim edilir. */
const IOS_PROVISIONAL_STATUSES = new Set([3, 4]);

let cachedModule: NotificationsModule | null | undefined;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Constants.executionEnvironment === 'storeClient') {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- Expo Go'da modül yok: gevşek yükleme
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** expo-notifications yanıtı → ortak biçim. */
export function toPermissionState(raw: RawPermission | null | undefined): PermissionState {
  if (!raw) return UNAVAILABLE_PERMISSION;
  const provisional =
    typeof raw.ios?.status === 'number' && IOS_PROVISIONAL_STATUSES.has(raw.ios.status);
  const granted = raw.granted === true || raw.status === 'granted' || provisional;
  const status: PermissionStatus = granted
    ? 'granted'
    : raw.status === 'undetermined'
      ? 'undetermined'
      : 'denied';
  return { status, canAskAgain: !granted && raw.canAskAgain !== false };
}

/** Push yalnız gerçek cihazda ve modül varken mümkün. */
function pushSupported(): NotificationsModule | null {
  if (!Device.isDevice) return null;
  return loadNotifications();
}

export async function readNotificationPermission(): Promise<PermissionState> {
  const mod = pushSupported();
  if (!mod) return UNAVAILABLE_PERMISSION;
  try {
    return toPermissionState(await mod.getPermissionsAsync());
  } catch (error) {
    logger.warn('Notification permission read failed', { err: safeError(error) });
    return UNAVAILABLE_PERMISSION;
  }
}

/**
 * Sistem bildirim izni diyaloğu. Yalnız sorulabiliyorsa (`canAskAgain`) gösterilir; aksi halde
 * mevcut durum döner — iOS'ta reddedilmiş izin için diyalog açılmaz, kullanıcı Ayarlar'a gider.
 *
 * Android: kanallar diyalogdan ÖNCE oluşturulmalı (Android 13'te kanal yoksa diyalog hiç
 * çıkmaz) — çağıran (`@/services/push`) bunu sağlar.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const mod = pushSupported();
  if (!mod) return UNAVAILABLE_PERMISSION;
  const current = await readNotificationPermission();
  if (current.status === 'granted' || !current.canAskAgain) return current;
  try {
    return toPermissionState(
      await mod.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }),
    );
  } catch (error) {
    logger.warn('Notification permission request failed', { err: safeError(error) });
    return current;
  }
}

export const notificationPermission: PermissionAccessor = {
  read: readNotificationPermission,
  request: requestNotificationPermission,
};

/** YALNIZ TEST: modül önbelleğini sıfırlar. */
export function resetNotificationPermissionModuleForTests(): void {
  cachedModule = undefined;
}
