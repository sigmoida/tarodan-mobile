import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { theme, Text } from '@/ui';
import { adsApi, type ActiveAd } from '@/lib/api';
import { useAds } from '@/hooks/useAds';
import { adAspectRatio, naturalRatioOf } from '@/lib/ads/adAspect';
import { hotspotStyle, renderableHotspots } from '@/lib/ads/hotspots';
import { openAdLink, resolveAdLink } from '@/lib/ads/openAdLink';
import { newRotationSeed, pickAd } from '@/lib/ads/pickAd';
import { useAdImpression } from '@/lib/ads/useAdImpression';
import { useFlashCountdown } from '@/lib/ads/useFlashCountdown';

/** Hotspot'a dokunuş payı (pt) — küçük bölgeler parmakla kolay vurulsun. */
const HOTSPOT_SLOP = theme.spacing[1];

function AdSlot({ ad, position }: { ad: ActiveAd; position: string }) {
  const hasImage = !!ad.imageUrl;
  // Görsel yüklenince kutu onun GERÇEK oranını alır (kayıtlı ölçü görselden
  // sapabilir). Kutu = görsel olduğu için `contain` kırpmaz ve yüzdeyle
  // konumlanan bölgeler görselin üzerinde birebir oturur.
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(!hasImage);
  // Gösterim ilan başına bir kez, reklam görünürken (mount'ta değil) sayılır.
  useAdImpression(ad.id, loaded);

  const hotspots = renderableHotspots(ad);
  // Görselli reklamda tıklama YALNIZ bölgelerden (web ile aynı kural); bölge
  // yoksa eski/metin reklamın `linkUrl`'i tüm reklamı tıklanabilir yapar.
  // Açılamayacak hedef (güvensiz şema, satın alma) için tıklanabilirlik yok.
  const wholeLink =
    hotspots.length === 0 && resolveAdLink(ad.linkUrl).kind !== 'blocked' ? ad.linkUrl : null;

  const handleWholePress = () => {
    // Ölçümü bekletmeden yönlendir; sayaç arka planda gider.
    adsApi.recordClick(ad.id).catch(() => {});
    openAdLink(wholeLink);
  };

  return (
    <Pressable
      onPress={handleWholePress}
      disabled={!wholeLink}
      accessibilityRole={wholeLink ? 'link' : hasImage ? 'image' : 'text'}
      accessibilityLabel={ad.altText || ad.title}
      testID={`ad-banner-${ad.id}`}
      style={styles.slot}
    >
      {hasImage ? (
        <View style={[styles.imageBox, { aspectRatio: adAspectRatio(ad, position, naturalRatio) }]}>
          <Image
            source={{ uri: ad.imageUrl! }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            accessibilityLabel={ad.altText || ad.title}
            onLoad={(e) => {
              setNaturalRatio(naturalRatioOf(e?.source));
              setLoaded(true);
            }}
          />
          {hotspots.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => {
                adsApi.recordClick(ad.id, h.id).catch(() => {});
                openAdLink(h.linkUrl);
              }}
              hitSlop={HOTSPOT_SLOP}
              accessibilityRole="link"
              accessibilityLabel={h.label || ad.altText || ad.title}
              testID={`ad-hotspot-${h.id}`}
              style={[styles.hotspot, hotspotStyle(h)]}
            />
          ))}
        </View>
      ) : (
        <AdTextBody ad={ad} />
      )}
    </Pressable>
  );
}

/** Görselsiz reklam: başlık, metin ve (varsa) kampanya kodu / flaş geri sayım. */
function AdTextBody({ ad }: { ad: ActiveAd }) {
  const campaign = ad.campaign;
  const left = useFlashCountdown(campaign?.isFlashSale ? campaign.endsAt : null);
  const code = campaign?.code;
  return (
    <View style={styles.textBody} testID={`ad-text-${ad.id}`}>
      <View style={styles.textCopy}>
        <Text variant="label" tone="heading" weight="semibold">
          {ad.title}
        </Text>
        {!!ad.content && (
          <Text variant="bodySm" tone="muted">
            {ad.content}
          </Text>
        )}
      </View>
      {/* Gösterilecek kod ya da (süresi dolmamış) geri sayım yoksa kapsayıcı da yok. */}
      {(!!left || !!code) && (
        <View style={styles.chips} testID="ad-chips">
          {left ? (
            <View style={[styles.chip, styles.flashChip]} testID="ad-flash-countdown">
              <Text variant="label" tone="danger" weight="semibold">
                ⚡ {left}
              </Text>
            </View>
          ) : null}
          {code ? (
            <View style={[styles.chip, styles.codeChip]} testID={`ad-code-${ad.id}`}>
              <Text variant="label" tone="primary" weight="semibold">
                {code}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * Verilen konumdaki reklam — yuvada TEK reklam gösterilir (web `BannerSlot` ile
 * aynı); seçim ekran açılışı başına döner. Reklam yoksa veya üye reklamsızsa
 * hiç çizilmez.
 */
export function AdBanner({ position = 'header' }: { position?: string }) {
  const { ads, isAdFree, isLoading } = useAds(position);
  // Ekran açılışı başına bir tohum + seçilen reklamın kimliği. Paylaşılan reklam
  // sorgusu yenilenip liste uzunluğu değişse de ekrandaki reklam, listede
  // kaldığı sürece SABİT kalır (aksi halde reklam değişir ve yeni gösterim
  // sayılırdı); yalnız listeden düşerse yeniden seçilir. Rotasyon web'deki
  // "sayfa yüklemesi başına" mantığına denk olarak yuva yeniden bağlanınca
  // (ekran açılışı) olur — sekme odağı değişince DEĞİL: odak başına döndürmek
  // her sekme geçişinde reklamı değiştirir ve yeni gösterim sayardı.
  const [seed] = useState(newRotationSeed);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const ad = ads.find((a) => a.id === pickedId) ?? pickAd(ads, position, seed);
  const adId = ad?.id ?? null;
  useEffect(() => {
    if (adId !== pickedId) setPickedId(adId);
  }, [adId, pickedId]);

  // Reklamsız üyede yer ayırma — kalıcı boş kutu göstermiş oluruz.
  if (isAdFree) return null;

  // Query çözülmeden liste boş kalır; yer ayırmazsak reklam gelince akış
  // ~110-130pt aşağı kayar (kullanıcı tam o an ekranın üstüne bakıyor).
  // Konum varsayılan oranıyla rezerve ediyoruz — gerçek reklamın oranı farklıysa
  // yükleme sonrası küçük bir ikinci kayma kalabilir; bunu ortadan kaldırmak
  // sunucudan önden boyut bilmeyi gerektirir, kapsam dışı.
  if (isLoading) {
    return (
      <View style={styles.container} testID="ad-banner-slot-reserved">
        <View style={[styles.slot, { aspectRatio: adAspectRatio({ width: null, height: null }, position) }]} />
      </View>
    );
  }

  if (!ad) return null;

  return (
    <View style={styles.container} testID="ad-banner">
      <AdSlot key={ad.id} ad={ad} position={position} />
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
  },
  slot: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.alt,
  },
  imageBox: { width: '100%' },
  image: { width: '100%', height: '100%' },
  hotspot: { position: 'absolute' },
  textBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  textCopy: { flexShrink: 1, minWidth: 0, gap: theme.spacing[1] },
  chips: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  chip: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  codeChip: { backgroundColor: theme.colors.primary[50] },
  flashChip: { backgroundColor: theme.colors.danger[50] },
});
