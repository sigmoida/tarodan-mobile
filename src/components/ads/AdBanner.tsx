import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { theme } from '@/ui';
import { adsApi, type ActiveAd, type AdHotspot } from '@/lib/api';
import { useAds } from '@/hooks/useAds';
import { pathFromUrl } from '@/lib/deeplinks';
import { toMobileRoute } from '@/utils/notificationRoute';

/** Banner en-boy oranı — sunucu width/height vermezse kullanılır. */
const FALLBACK_ASPECT = 1200 / 300;

/** Kendi web sitemizin host'ları — bunlara giden link uygulama içinde açılır. */
const OWN_HOSTS = new Set(
  ['tarodan.com.tr', 'www.tarodan.com.tr', 'staging.tarodan.com.tr', hostOf(process.env.EXPO_PUBLIC_WEB_URL)].filter(
    (h): h is string => !!h,
  ),
);

function hostOf(url: string | undefined): string | null {
  const m = url?.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1]!.toLowerCase() : null;
}

/**
 * Reklam linki iç rota ("/listings?manufacturer=Hot+Wheels"), kendi sitemizin
 * mutlak adresi ("https://tarodan.com.tr/listings") ya da dış URL olabilir.
 * İlk ikisi web yolu → mobil rota eşlemesinden (derin bağlantılarla ortak
 * `toMobileRoute`) geçip uygulama içinde açılır; yalnız gerçekten dış adres
 * tarayıcıya gider.
 */
function openAdLink(linkUrl: string) {
  const host = hostOf(linkUrl);
  if (host && !OWN_HOSTS.has(host)) {
    Linking.openURL(linkUrl).catch(() => {});
    return;
  }
  const path = pathFromUrl(linkUrl) ?? '/';
  // İlan listesi eşleyiciye VERİLMEZ: `toMobileRoute` `/listings`'i sorgusuz
  // arama sekmesine çeviriyor, reklamın filtresi (`?manufacturer=…`) düşerdi.
  // Mobil `app/listings` web ile aynı sorgu parametrelerini okuyor.
  const isListingIndex = path.split('?')[0]!.replace(/\/+$/, '') === '/listings';
  router.push((isListingIndex ? path : (toMobileRoute(path) ?? path)) as any);
}

/** Görselin sınırları içinde, çizilebilir bölgeler (bozuk koordinat atlanır). */
function renderableHotspots(ad: ActiveAd): AdHotspot[] {
  return (ad.hotspots ?? [])
    .filter(
      (h) =>
        !!h.linkUrl &&
        h.width > 0 &&
        h.height > 0 &&
        h.x >= 0 &&
        h.y >= 0 &&
        h.x + h.width <= 1.0001 &&
        h.y + h.height <= 1.0001,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

const pct = (n: number) => `${n * 100}%` as const;

function AdSlot({ ad }: { ad: ActiveAd }) {
  // Gösterim ilan başına bir kez sayılır; yeniden render tekrar tetiklemesin.
  const impressionSent = useRef(false);
  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    adsApi.recordImpression(ad.id).catch(() => {});
  }, [ad.id]);

  const aspectRatio = ad.width && ad.height ? ad.width / ad.height : FALLBACK_ASPECT;
  const hotspots = renderableHotspots(ad);
  // Görselli reklamda tıklama YALNIZ bölgelerden (web ile aynı kural); bölge
  // yoksa eski/metin reklamın `linkUrl`'i tüm görseli tıklanabilir yapar.
  const wholeLink = hotspots.length === 0 ? ad.linkUrl : null;

  const handleWholePress = () => {
    // Ölçümü bekletmeden yönlendir; sayaç arka planda gider.
    adsApi.recordClick(ad.id).catch(() => {});
    if (wholeLink) openAdLink(wholeLink);
  };

  return (
    <Pressable
      onPress={handleWholePress}
      disabled={!wholeLink}
      accessibilityRole={wholeLink ? 'link' : 'image'}
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
      {hotspots.map((h) => (
        <Pressable
          key={h.id}
          onPress={() => {
            adsApi.recordClick(ad.id, h.id).catch(() => {});
            openAdLink(h.linkUrl);
          }}
          accessibilityRole="link"
          accessibilityLabel={h.label || ad.altText || ad.title}
          testID={`ad-hotspot-${h.id}`}
          style={[styles.hotspot, { left: pct(h.x), top: pct(h.y), width: pct(h.width), height: pct(h.height) }]}
        />
      ))}
    </Pressable>
  );
}

/**
 * Verilen konumdaki reklamlar — reklam yoksa veya üye reklamsızsa hiç çizilmez.
 */
export function AdBanner({ position = 'header' }: { position?: string }) {
  const { ads, isAdFree, isLoading } = useAds(position);

  // Reklamsız üyede yer ayırma — kalıcı boş kutu göstermiş oluruz.
  if (isAdFree) return null;

  // Query çözülmeden liste boş kalır; yer ayırmazsak reklam gelince akış
  // ~110-130pt aşağı kayar (kullanıcı tam o an ekranın üstüne bakıyor).
  // FALLBACK_ASPECT ile rezerve ediyoruz — gerçek reklamın oranı farklıysa
  // yükleme sonrası küçük bir ikinci kayma kalabilir; bunu ortadan kaldırmak
  // sunucudan önden boyut bilmeyi gerektirir, kapsam dışı.
  if (isLoading) {
    return (
      <View style={styles.container} testID="ad-banner-slot-reserved">
        <View style={[styles.slot, { aspectRatio: FALLBACK_ASPECT }]} />
      </View>
    );
  }

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
    // Altındaki hero kartı `marginTop: -10` ile yukarı çekiliyor (başlığın
    // kavisine oturmak için); bu boşluk olmadan kart banner'ın altını örtüyordu.
    paddingBottom: theme.spacing[4],
    gap: theme.spacing[2],
  },
  slot: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.alt,
  },
  image: { width: '100%' },
  hotspot: { position: 'absolute' },
});
