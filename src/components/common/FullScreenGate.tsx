import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

/**
 * Kapatılamaz tam ekran kapıların TEK z-sırası — önce gelen üstte kalır.
 * Zorunlu güncelleme her şeyin üstünde: güncelleme gerekiyorsa üye önce onu
 * görür (eski build'den onay göndermenin anlamı yok); zorunlu adımlar
 * (sözleşme onayı, B3'te kimlik) onun altında.
 */
export const FULL_SCREEN_GATE_LAYERS = ['forceUpdate', 'requiredSteps'] as const;
export type FullScreenGateLayer = (typeof FULL_SCREEN_GATE_LAYERS)[number];

const Z_BASE = 9000;
/** Katmanın z-değeri; yalnız `FULL_SCREEN_GATE_LAYERS` sırasından türetilir. */
export function fullScreenGateZIndex(layer: FullScreenGateLayer): number {
  return Z_BASE + FULL_SCREEN_GATE_LAYERS.length - FULL_SCREEN_GATE_LAYERS.indexOf(layer);
}

export interface FullScreenGateProps {
  layer: FullScreenGateLayer;
  children: ReactNode;
  testID?: string;
}

/**
 * Tam ekran kapıların ortak kabuğu (`ForceUpdateGate`, `RequiredStepShell`):
 * tüm ekranı kaplayan, kapatma düğmesi olmayan, ekran okuyucuyu içine
 * hapseden yüzey + güvenli alan boşlukları. İçerik düzeni çağırana aittir.
 */
export function FullScreenGate({ layer, children, testID }: FullScreenGateProps) {
  const insets = useSafeAreaInsets();
  const z = fullScreenGateZIndex(layer);
  return (
    <View
      style={[
        styles.overlay,
        { zIndex: z, elevation: z, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      accessibilityViewIsModal
      testID={testID}
    >
      {children}
    </View>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Kapıların ortak ikon dairesi. */
export function FullScreenGateIcon({ name, size = 80 }: { name: IoniconName; size?: number }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size }]}>
      <Ionicons name={name} size={size / 2} color={colors.primary[600]!} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.DEFAULT,
  },
  iconCircle: {
    borderRadius: radius.full,
    backgroundColor: colors.primary[50]!,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
});
