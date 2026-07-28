import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { theme } from '@/ui';
import { adsApi, type ActiveAd } from '@/lib/api';
import { useAds } from '@/hooks/useAds';

/** Banner en-boy oranı — sunucu width/height vermezse kullanılır. */
const FALLBACK_ASPECT = 1200 / 300;

/**
 * `linkUrl` iç rota ("/listings?manufacturer=Hot+Wheels") ya da dış URL olabilir.
 * İç rotalar expo-router'a olduğu gibi verilir — mobil `app/listings` ekranı
 * web ile aynı query parametrelerini (manufacturer/brand/category/search) okur.
 */
function openAdLink(linkUrl: string) {
  if (/^https?:\/\//i.test(linkUrl)) {
    Linking.openURL(linkUrl).catch(() => {});
    return;
  }
  router.push(linkUrl as any);
}

function AdSlot({ ad }: { ad: ActiveAd }) {
  // Gösterim ilan başına bir kez sayılır; yeniden render tekrar tetiklemesin.
  const impressionSent = useRef(false);
  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    adsApi.recordImpression(ad.id).catch(() => {});
  }, [ad.id]);

  const aspectRatio = ad.width && ad.height ? ad.width / ad.height : FALLBACK_ASPECT;

  const handlePress = () => {
    // Ölçümü bekletmeden yönlendir; sayaç arka planda gider.
    adsApi.recordClick(ad.id).catch(() => {});
    if (ad.linkUrl) openAdLink(ad.linkUrl);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!ad.linkUrl}
      accessibilityRole={ad.linkUrl ? 'link' : 'image'}
      accessibilityLabel={ad.altText || ad.title}
      testID={`ad-banner-${ad.id}`}
      style={styles.slot}
    >
      <Image
        source={{ uri: ad.imageUrl }}
        style={[styles.image, { aspectRatio }]}
        contentFit="cover"
        transition={200}
        accessibilityLabel={ad.altText || ad.title}
      />
    </Pressable>
  );
}

/**
 * Verilen konumdaki reklamlar — reklam yoksa veya üye reklamsızsa hiç çizilmez.
 */
export function AdBanner({ position = 'header' }: { position?: string }) {
  const { ads } = useAds(position);
  if (ads.length === 0) return null;

  return (
    <View style={styles.container} testID="ad-banner">
      {ads.map((ad) => (
        <AdSlot key={ad.id} ad={ad} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    gap: theme.spacing[2],
  },
  slot: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.alt,
  },
  image: { width: '100%' },
});
