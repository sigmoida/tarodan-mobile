/**
 * AppImage — uzak görsellerin TEK render kapısı (#73).
 *
 * RN `<Image>` yerine `expo-image` kullanır:
 *   - `cachePolicy="memory-disk"` → görsel remount'ta yeniden indirilmez (RN
 *     <Image>'ın zayıf/tutarsız disk cache'i cihaz RAM'ini şişiriyordu).
 *   - hücre boyutuna göre downsample → küçük hücrede tam-res bitmap tutulmaz.
 *   - `variant` ile boyut-farkında URL çözümü: liste hücreleri `card`
 *     (thumbnail), galeri/detay `detail` (tam çözünürlük).
 *
 * Drop-in olması için `source` her şekli kabul eder (entity/obje/dizi/string);
 * `getImageUrl` ile aynı çözümleme. `resizeMode` → `contentFit` köprüsü var ki
 * mevcut çağrı yerleri tek satırda taşınabilsin.
 */
import React from 'react';
import { type StyleProp, type ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { resolveImageUrl, IMAGE_PLACEHOLDER, type ImageVariant } from '@/utils/imageUrl';
import { useAuthStore } from '@/stores/authStore';

export interface AppImageProps {
  /** Entity / görsel objesi / dizi / string — `getImageUrl` ile aynı çözümleme. */
  source: unknown;
  /** Küçük hücreler için `card` (thumbnail). Varsayılan `card`. Galeri/detay: `detail`. */
  variant?: ImageVariant;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** RN uyumluluk köprüsü — `contentFit` verilmezse buradan eşlenir. */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  onError?: () => void;
  /**
   * `Authorization: Bearer <token>` header'ı ekler (`expo-image`'in
   * `source.headers`'ı). Token store'a ABONE olunarak okunur (`useAuthStore`
   * selector'ü) — `getState()` ile tek seferlik okumak DEĞİL:
   *   - Token sonradan gelirse (push/deep-link ile doğrudan thread'e girip
   *     `loadToken()` bitmeden render olmak tipik), tek seferlik okuma `null`
   *     görür, `React.memo` ebeveyn render'ını bloklar ve görsel KALICI olarak
   *     kırık kalırdı.
   *   - Sessiz refresh token'ı değiştirdiğinde de aynı şey olurdu.
   * Selector sayesinde `token` değişmedikçe hiçbir `AppImage` örneği yeniden
   * render olmaz; değişince authenticated olanlar doğru header'la tekrar dener.
   *
   * ⚠️ Varsayılan `false` — SADECE API'nin JWT istediği bilinen uçlar için aç
   * (örn. mesaj eki `/api/media/message-attachment/{id}`, bkz.
   * `app/messages/[threadId]/_components/MessageList.tsx`). Ürün görselleri
   * public S3/CDN'den geliyor: gereksiz bir `Authorization` header'ı hem
   * işe yaramaz hem de presigned S3 URL'ine 302 redirect edildiğinde imzayı
   * bozma riski taşır.
   */
  authenticated?: boolean;
}

const RESIZE_TO_FIT: Record<NonNullable<AppImageProps['resizeMode']>, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

export const AppImage = React.memo(function AppImage({
  source,
  variant = 'card',
  style,
  contentFit,
  resizeMode,
  accessibilityLabel,
  onError,
  authenticated = false,
}: AppImageProps) {
  const uri = resolveImageUrl(source, variant);
  const fit = contentFit ?? (resizeMode ? RESIZE_TO_FIT[resizeMode] : 'cover');
  // Hook KOŞULSUZ çağrılır (rules-of-hooks), ama seçici `authenticated`
  // değilken sabit `null` döndürür: public görseller token değişimine ABONE
  // OLMAZ, yoksa her sessiz refresh uygulamadaki BÜTÜN görselleri yeniden
  // render ederdi. Token sızıntısı sözleşmesi de aynı seçicide korunuyor.
  const token = useAuthStore((s) => (authenticated ? s.token : null));
  const imageSource = token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };

  const handleError = React.useCallback(() => {
    // Bearer'lı yükleme sessizce placeholder'a düşmesin — bu hatanın bunca
    // zaman görünmez kalmasının sebebi buydu (çağrı yerleri `onError` bağlamıyor).
    // ⚠️ Token, URL, imza/query ve her tür PII log'lanmaz; yalnız DEV'de ve
    // yalnız "token var mıydı" boolean'ı — C1 (bayat token) ile C2 (token hiç
    // gelmemiş) ayrımını yapmaya bu yetiyor.
    if (__DEV__ && authenticated) {
      console.warn(`[AppImage] authenticated image failed to load (hasToken=${!!token})`);
    }
    onError?.();
  }, [authenticated, token, onError]);

  return (
    <Image
      source={imageSource}
      style={style}
      contentFit={fit}
      cachePolicy="memory-disk"
      transition={150}
      placeholder={IMAGE_PLACEHOLDER}
      placeholderContentFit={fit}
      accessibilityLabel={accessibilityLabel}
      onError={handleError}
    />
  );
});
