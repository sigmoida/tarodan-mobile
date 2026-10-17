import React, { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { theme, Text } from '@/ui';
import { useAuthHero, type AuthHeroPlacement } from './useAuthHero';

/** Görsel bandının yüksekliği (pt). */
const BANNER_HEIGHT = 180;

/**
 * Görselin çizildiği en dar pencere (pt) — web tailwind `lg` (1024px;
 * `@tarodan/design-tokens` preset `screens.lg`). Web `AuthHeroFrame` paneli
 * `hidden lg:flex`: telefonda hiç görünmez, yalnız geniş ekranda formun yanında.
 */
export const AUTH_HERO_MIN_WIDTH = 1024;

interface AuthHeroBannerProps {
  placement: AuthHeroPlacement;
  style?: StyleProp<ViewStyle>;
}

/**
 * Giriş/kayıt ekranının üstündeki marka görseli + başlık/alt başlık (web
 * `AuthHeroFrame` paneli). Kayıt ekranı `placement="auth_register"`, diğer auth
 * ekranları `auth_default`. Web gibi YALNIZ geniş pencerede (≥ 1024pt: iPad
 * yatay vb.); telefonda hiçbir şey çizilmez ve slayt sorgusu da atılmaz — form
 * aşağı itilmez, geri okuyla çakışmaz. Görsel tanımlı değilse ya da
 * yüklenemediyse de HİÇBİR ŞEY çizilmez (yer ayrılmaz). Beacon yok (web auth
 * panelinde de sayılmıyor); CTA yok.
 */
export function AuthHeroBanner(props: AuthHeroBannerProps) {
  const { width } = useWindowDimensions();
  // Genişlik değişince (iPad döndürme, Split View) bileşen bağlanır/sökülür;
  // sorgu yalnız içerik bağlıyken çalışır.
  return width >= AUTH_HERO_MIN_WIDTH ? <AuthHeroBannerContent {...props} /> : null;
}

function AuthHeroBannerContent({ placement, style }: AuthHeroBannerProps) {
  const hero = useAuthHero(placement);
  // Görsel yüklenemezse (404, ağ) başlık/alt başlık tek başına çizilmez: yarı
  // saydam katman altında boş bir kutu kalırdı. Hata görsel başına tutulur —
  // admin görseli değiştirirse yeni adres yeniden denenir.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const loadedUrl = useRef<string | null>(null);
  if (!hero || failedUrl === hero.imageUrl) return null;

  return (
    <View style={[styles.box, style]} testID="auth-hero">
      <Image
        source={{ uri: hero.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        // Giriş ekranının ilk görseli: disk cache + yüksek öncelik (LCP).
        cachePolicy="memory-disk"
        priority="high"
        accessibilityLabel={hero.alt}
        testID="auth-hero-image"
        onLoad={() => {
          loadedUrl.current = hero.imageUrl;
        }}
        onError={() => {
          if (loadedUrl.current !== hero.imageUrl) setFailedUrl(hero.imageUrl);
        }}
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
