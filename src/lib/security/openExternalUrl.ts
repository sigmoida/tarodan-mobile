import { Linking } from 'react-native';
import { parseStrictUrl } from './url';

/**
 * Sunucudan gelen bir adresi (kargo takip / iade takip linki) sistem tarayıcısında açar —
 * YALNIZ katı `https://` adresi (`parseStrictUrl`: kullanıcı bilgisi, varsayılan dışı port,
 * ters eğik çizgi yok). `http:`, `intent:`, `tel:`, `javascript:`, özel şemalar ve bozuk adres
 * açılmaz. Kargo firmalarının alan adları dışarıda olduğu için host izin listesi YOK; kendi
 * belge depomuzun adresleri için `isTrustedDocumentUrl` kullanılır. Açıldıysa `true`; hiç fırlatmaz.
 */
export async function openExternalUrlSafely(url: unknown): Promise<boolean> {
  if (!parseStrictUrl(url)) return false;
  try {
    await Linking.openURL((url as string).trim());
    return true;
  } catch {
    return false;
  }
}
