import React from 'react';
import { Animated, RefreshControl, StyleSheet } from 'react-native';
import { theme, useHeaderTopInset } from '@/ui';

/**
 * Ürün detayının kaydırma gövdesi. PageShell'in kendi ScrollView'u yerine kullanılır: galeri
 * durum çubuğunun altına kadar uzanır (üst bar yok, yüzen adalar var) ve kaydırma konumu
 * `ProductTopBar` zemini için dışarı verilir.
 */
export function ProductScrollView({
  onScroll,
  refreshing,
  onRefresh,
  children,
}: {
  onScroll: React.ComponentProps<typeof Animated.ScrollView>['onScroll'];
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const topInset = useHeaderTopInset();
  return (
    <Animated.ScrollView
      style={styles.fill}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          progressViewOffset={topInset}
          colors={[theme.colors.primary[600]]}
          tintColor={theme.colors.primary[600]}
        />
      }
    >
      {children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
