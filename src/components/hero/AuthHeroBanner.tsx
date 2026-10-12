import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { theme, Text } from '@/ui';
import { useAuthHero, type AuthHeroPlacement } from './useAuthHero';

/** Görsel bandının yüksekliği (pt). */
const BANNER_HEIGHT = 180;

/**
 * Giriş/kayıt ekranının üstündeki marka görseli + başlık/alt başlık (web
 * `AuthHeroFrame` paneli). Kayıt ekranı `placement="auth_register"`, diğer auth
 * ekranları `auth_default`. Görsel tanımlı değilse ya da yüklenemediyse HİÇBİR
 * ŞEY çizilmez (yer ayrılmaz). Beacon yok (web auth panelinde de sayılmıyor);
 * CTA yok.
 */
export function AuthHeroBanner({
  placement,
  style,
}: {
  placement: AuthHeroPlacement;
  style?: StyleProp<ViewStyle>;
}) {
  const hero = useAuthHero(placement);
  if (!hero) return null;

  return (
    <View style={[styles.box, style]} testID="auth-hero">
      <Image
        source={{ uri: hero.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        accessibilityLabel={hero.alt}
      />
      {/* Metin okunaklı kalsın diye görselin üstüne yarı saydam katman. */}
      <View style={styles.scrim} />
      <View style={styles.copy}>
        <Text variant="h2" tone="inverted" accessibilityRole="header">
          {hero.title}
        </Text>
        {!!hero.subtitle && (
          <Text variant="bodySm" tone="inverted">
            {hero.subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: BANNER_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surface.alt,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay.black50 },
  copy: { padding: theme.spacing[4], gap: theme.spacing[1] },
});
