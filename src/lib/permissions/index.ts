/**
 * Cihaz izinleri — TEK modül: durum okuma, gerekçeli istek (önce kendi ekranımız, sonra sistem
 * diyaloğu), Ayarlar'ı açma ve ön plana dönüşte yenilenen durum kancası.
 *
 * Galeri izni burada YOK ve istenmez: iOS PHPicker / Android Photo Picker izinsiz çalışır.
 */
export {
  UNAVAILABLE_PERMISSION,
  canPromptFor,
  type PermissionAccessor,
  type PermissionState,
  type PermissionStatus,
} from './types';
export {
  notificationPermission,
  readNotificationPermission,
  requestNotificationPermission,
  toPermissionState,
} from './notifications';
export { openAppSettings } from './settings';
export { requestWithRationale, type RationaleResult } from './rationale';
export { usePermissionStatus } from './usePermissionStatus';
