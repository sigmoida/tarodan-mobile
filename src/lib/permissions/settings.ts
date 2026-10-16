import { Linking } from 'react-native';
import { logger, safeError } from '@/services/logger';

/**
 * Uygulamanın cihaz Ayarlar sayfasını açar (reddedilmiş izni kullanıcı orada açar).
 * iOS: uygulamanın ayar sayfası; Android: uygulama bilgisi. Fırlatmaz; açılamazsa `false`.
 */
export async function openAppSettings(): Promise<boolean> {
  try {
    await Linking.openSettings();
    return true;
  } catch (error) {
    logger.warn('Could not open app settings', { err: safeError(error) });
    return false;
  }
}
