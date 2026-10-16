import { canPromptFor, type PermissionAccessor, type PermissionState } from './types';

/** Gerekçeli istek sonucu. */
export type RationaleResult =
  /** İzin zaten var ya da verildi. */
  | 'granted'
  /** Kullanıcı gerekçe ekranında "Şimdi değil" dedi (sistem diyaloğu GÖSTERİLMEDİ). */
  | 'dismissed'
  /** Sistem diyaloğunda reddedildi. */
  | 'denied'
  /** Sorulamaz (iOS'ta önceden reddedildi / Android'de "bir daha sorma") — yalnız Ayarlar. */
  | 'blocked'
  /** Bu ortamda yok (Expo Go, simülatör). */
  | 'unavailable';

/**
 * Önce KENDİ gerekçe ekranımız, sonra (kabul edilirse) sistem diyaloğu. Sistem diyaloğu tek
 * hakkı tüketir (iOS bir kez sorar): kullanıcı neden istendiğini görmeden harcanmasın.
 *
 * `showRationale` kullanıcı kabul ederse `true` döner ve kendi arayüzü KAPANDIKTAN sonra
 * çözülmelidir (iOS: açık sheet üstünde sistem diyaloğu / ikinci sunum donma kuralı, CLAUDE.md §12).
 */
export async function requestWithRationale(
  accessor: PermissionAccessor,
  showRationale: (state: PermissionState) => Promise<boolean>,
): Promise<RationaleResult> {
  const current = await accessor.read();
  if (current.status === 'granted') return 'granted';
  if (current.status === 'unavailable') return 'unavailable';
  if (!canPromptFor(current)) return 'blocked';
  if (!(await showRationale(current))) return 'dismissed';
  const next = await accessor.request();
  if (next.status === 'granted') return 'granted';
  return next.canAskAgain ? 'denied' : 'blocked';
}
