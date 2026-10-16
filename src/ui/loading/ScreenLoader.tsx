import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { theme } from '../lib/theme';
import { LoadingIndicator } from './LoadingIndicator';

const { spacing } = theme;

export interface ScreenLoaderProps {
  label?: string;
  /** `large` (varsayılan; ekran ortası) ya da `small` (kart/panel içi). */
  size?: 'small' | 'large';
  /** Tüm ekranı kaplasın mı (flex: 1). Varsayılan: true. */
  fullscreen?: boolean;
  testID?: string;
}

/**
 * Ortalanmış tam ekran/panel yükleniyor görünümü — YALNIZ ilk açılışta ya da yerleşimi olmayan
 * akışlarda (ödeme, kapı); liste/kart ekranları iskelet kullanır. Gösterge `LoadingIndicator`'dır.
 */
export const ScreenLoader: React.FC<ScreenLoaderProps> = ({
  label,
  size = 'large',
  fullscreen = true,
  testID = 'screen-loader',
}) => (
  <View style={[styles.container, fullscreen && styles.fullscreen]} testID={testID}>
    <LoadingIndicator size={size === 'large' ? 'lg' : 'md'} accessibilityLabel={label} />
    {label ? (
      <Text variant="bodySm" tone="muted" style={styles.label}>
        {label}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  fullscreen: { flex: 1 },
  label: { marginTop: spacing[3] },
});
