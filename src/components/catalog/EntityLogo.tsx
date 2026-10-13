import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, theme } from '@/ui';
import { AppImage } from '@/components/AppImage';

const { colors, spacing, radiusRole } = theme;

/** `md`: liste satırı (48pt kutu) · `lg`: marka/üretici detay başlığı (80pt kutu). */
export type EntityLogoSize = 'md' | 'lg';

const BOX = { md: spacing[12], lg: spacing[20] } as const;
const IMAGE = { md: spacing[10], lg: spacing[16] } as const;

interface EntityLogoProps {
  /** Logo adresi (yoksa adın baş harfi çizilir). */
  logo?: string | null;
  name: string;
  size?: EntityLogoSize;
  testID?: string;
}

/**
 * Marka / üretici logosu — liste satırı ve detay başlığı için TEK bileşen (logo yoksa baş harf).
 * `lg` kutu kenarlıklı ve yükseltilmiş yüzeydedir (detay başlığı), `md` düz alt yüzeydedir (satır).
 */
export function EntityLogo({ logo, name, size = 'md', testID }: EntityLogoProps) {
  const box = BOX[size];
  const image = IMAGE[size];
  return (
    <View
      testID={testID}
      style={[styles.box, { width: box, height: box }, size === 'lg' ? styles.boxLg : styles.boxMd]}
    >
      {logo ? (
        <AppImage source={logo} style={{ width: image, height: image }} resizeMode="contain" accessibilityLabel={name} />
      ) : (
        <Text variant={size === 'lg' ? 'displaySm' : 'h2'} tone="primary">
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radiusRole.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxMd: { backgroundColor: colors.surface.alt },
  boxLg: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
});

export default EntityLogo;
