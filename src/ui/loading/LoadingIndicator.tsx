import React from 'react';
// Uygulamadaki TEK `ActivityIndicator` kullanımı burası (`tarodan/no-raw-activity-indicator`).
import { ActivityIndicator, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';

const { loading } = theme;

export type LoadingIndicatorSize = keyof typeof loading.indicator.size;
export type LoadingIndicatorTone = keyof typeof loading.indicator.color;

export interface LoadingIndicatorProps {
  /** `sm` 16 (düğme içi / satır içi) · `md` 20 (liste altı, alan içi) · `lg` 36 (ekran/panel ortası). */
  size?: LoadingIndicatorSize;
  /** `primary` (marka, varsayılan) · `inverted` (dolu zemin üstü) · `muted` (ikincil, gri). */
  tone?: LoadingIndicatorTone;
  /**
   * Tonu ezen renk — YALNIZ içinde durduğu öğenin metin rengini alması gerektiğinde (ör. `Button`
   * etiket rengi). Ekranlar ton kullanır.
   */
  color?: string;
  /** Ekran okuyucu metni; varsayılan "Yükleniyor" (`common.loading`). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** iOS `ActivityIndicator` yalnız `small` (20) / `large` (36) çizer; daha küçük kutu ölçekle küçültülür. */
const IOS_SMALL = 20;

/**
 * Uygulamanın TEK dönen yükleme göstergesi. `Spinner`, `ScreenLoader`, `Button`/`IconButton`
 * `isLoading` ve diğer tüm göstergeler bunu çizer; ekranlar ham `ActivityIndicator` kullanmaz.
 *
 * DEĞİŞTİRME NOKTASI: göstergeyi özel bir animasyonla (Lottie, Reanimated…) değiştirmek için
 * yalnız bu bileşenin İÇİ (aşağıdaki `ActivityIndicator`) değişir. Sözleşme sabittir:
 *   - dış kutu tam `theme.loading.indicator.size[size]` × aynı (yerleşim değişmez),
 *   - renk `theme.loading.indicator.color[tone]` (ya da `color`),
 *   - `accessibilityRole="progressbar"` + etiket, "Hareketi azalt" açıkken yeni animasyon durağan
 *     bir kare göstermeli (`AccessibilityInfo.isReduceMotionEnabled`; ActivityIndicator sistemindir).
 * Çekip yenileme (`RefreshControl`) bilerek NATIVE kalır (platform davranışı); yalnız `tintColor` /
 * `colors` token'dan verilir.
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  tone = 'primary',
  color,
  accessibilityLabel,
  style,
  testID = 'loading-indicator',
}) => {
  const { t } = useTranslation();
  const box = loading.indicator.size[size];
  const tint = color ?? loading.indicator.color[tone];
  const ios = Platform.OS === 'ios';
  const nativeSize = ios ? (box > IOS_SMALL ? 'large' : 'small') : box;
  const scale = ios && box < IOS_SMALL ? box / IOS_SMALL : 1;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('common.loading')}
      accessibilityState={{ busy: true }}
      style={[styles.box, { width: box, height: box }, style]}
    >
      <ActivityIndicator
        size={nativeSize}
        color={tint}
        style={scale !== 1 ? { transform: [{ scale }] } : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Sütunda yatay, satırda dikey ortalı (ham ActivityIndicator'ın ortalı davranışı korunur).
  box: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
