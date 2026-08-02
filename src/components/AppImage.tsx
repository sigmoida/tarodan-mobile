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
   * `source.headers`'ı). Token `useAuthStore.getState()`'ten senkron okunur —
   * React state'e subscribe olmaz, bu yüzden token değişince bu komponent
   * yeniden render OLMAZ (görsel zaten mount'ta bir kez yüklenir, yeniden
   * subscribe etmeye gerek yok).
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
  // Yalnız opt-in edildiğinde token'ı sorgula — varsayılan (public) yol
  // authStore'a hiç dokunmaz.
  const token = authenticated ? useAuthStore.getState().token : null;
  const imageSource = token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };

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
      onError={onError}
    />
  );
});
