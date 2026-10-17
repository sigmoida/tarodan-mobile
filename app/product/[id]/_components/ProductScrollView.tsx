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
 * göstergesi durum çubuğu ile yüzen üst barın arasına düşüyordu. Veri güncel kalır: ekrana
 * dönüşte (odak) detay + yorumlar bayatsa ya da 30 sn'den eskiyse `useRefetchStaleOnFocus` ile,
 * uygulama ön plana dönünce sorgu istemcisinin `focusManager`'ıyla tazelenir. iOS esnemesi korunur.
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
