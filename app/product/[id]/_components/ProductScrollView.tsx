import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme } from '@/ui';

/**
 * Ürün detayının kaydırma gövdesi. PageShell'in kendi ScrollView'u yerine kullanılır: galeri
 * durum çubuğunun altına kadar uzanır (üst bar yok, yüzen adalar var) ve kaydırma konumu
 * `ProductTopBar`'ın kaydırma kenarı için dışarı verilir (`useProductScroll`).
 *
 * Bilerek pull-to-refresh YOK: galeri durum çubuğunun altına uzandığı için yerel yenileme
 * göstergesi durum çubuğu ile yüzen üst barın arasına düşüyordu. Veri, sorgunun ön plana
 * dönüş / ekrana odaklanma tazelemesiyle güncel kalır; iOS esnemesi (bounce) korunur.
 */
export function ProductScrollView({
  onScroll,
  children,
}: {
  onScroll: React.ComponentProps<typeof Animated.ScrollView>['onScroll'];
  children: React.ReactNode;
}) {
  return (
    <Animated.ScrollView
      style={styles.fill}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </Animated.ScrollView>
  );
}

/** Sayfa zemini ana sayfayla aynı (`surface.DEFAULT`): beyaz bölüm kartları (Açıklama, satıcı…) zeminden ayrışır. */
const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT } });
