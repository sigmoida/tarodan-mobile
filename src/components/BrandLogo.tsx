import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/ui';

/**
 * Tarodan kelime-logosu (dairesel oklar + "TARODAN") — web auth çerçevesindeki gibi
 * turuncu (primary-500) yuvarlatılmış kutu içinde, 162×40. PNG şeffaf zeminli ve iki-tonludur:
 * "TARO" beyaz olduğu için açık zeminde kaybolur; kutu bu yüzden logonun kendi zeminini taşır
 * (web `tarodan-logo.jpg`). Tek kaynak: boyut/stil buradan güncellenir.
 */
export function BrandLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.box, style]}>
      <Image
        source={require('../../assets/tarodan-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Tarodan"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 162,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radiusRole.button,
  },
  logo: {
    width: 146,
    height: 32,
  },
});

export default BrandLogo;
