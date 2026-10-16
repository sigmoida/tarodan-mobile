/**
 * İşletim sistemi izninin uygulama içi tek biçimi (bildirim; ileride kamera/konum aynı biçimle).
 *
 * - `granted`: izin var (iOS geçici/provisional da sayılır — bildirimler sessiz gelir).
 * - `undetermined`: hiç sorulmadı; sistem diyaloğu gösterilebilir.
 * - `denied`: reddedildi. `canAskAgain` true ise (Android'de bir kez reddedilmiş) sistem
 *   diyaloğu yeniden gösterilebilir; false ise yalnız cihaz Ayarlar'ından açılır.
 * - `unavailable`: bu ortamda yok (Expo Go, simülatör, modül eksik).
 */
export type PermissionStatus = 'granted' | 'undetermined' | 'denied' | 'unavailable';

export interface PermissionState {
  status: PermissionStatus;
  /** Sistem diyaloğu yeniden gösterilebilir mi? (`granted` / `unavailable`'da false). */
  canAskAgain: boolean;
}

export const UNAVAILABLE_PERMISSION: PermissionState = { status: 'unavailable', canAskAgain: false };

/** Bir izin türünün okuyucu + isteyicisi (`usePermissionStatus` ve `requestWithRationale` bunu alır). */
export interface PermissionAccessor {
  read: () => Promise<PermissionState>;
  /** Sistem diyaloğunu gösterir. Yalnız `canAskAgain` true iken çağrılır. */
  request: () => Promise<PermissionState>;
}

/** Sistem diyaloğunun gösterilebileceği durum mu? */
export function canPromptFor(state: PermissionState): boolean {
  return state.status !== 'granted' && state.status !== 'unavailable' && state.canAskAgain;
}
