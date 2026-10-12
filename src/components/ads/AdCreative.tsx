import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { theme, Text } from '@/ui';
import { adsApi, type ActiveAd } from '@/lib/api';
import { hasAdImage } from '@/lib/ads/creative';
import { adAspectRatio, naturalRatioOf } from '@/lib/ads/adAspect';
import { hotspotStyle, renderableHotspots } from '@/lib/ads/hotspots';
import { openAdLink, resolveAdLink } from '@/lib/ads/openAdLink';
import { useAdImpression } from '@/lib/ads/useAdImpression';
import { useFlashCountdown } from '@/lib/ads/useFlashCountdown';

/** Hotspot'a dokunuş payı (pt) — küçük bölgeler parmakla kolay vurulsun. */
const HOTSPOT_SLOP = theme.spacing[1];

/** Üst şerit (topbar) görselinin yüksekliği ve en büyük genişliği (web: max-h-6 / max-w-[200px]). */
export const TOPBAR_IMAGE_HEIGHT = theme.spacing[6];
export const TOPBAR_IMAGE_MAX_WIDTH = 200;

/**
 * Popup'ta bağlantı, modal kapandıktan SONRA açılır: açık bir Modal üstünden
 * gezinmek/dış uygulamaya geçmek iOS'ta ekranı dondurabilir (ModalFreeze).
 */
export const NAVIGATE_AFTER_CLOSE_MS = 350;

export type AdCreativeVariant = 'block' | 'topbar';

export interface AdCreativeProps {
  ad: ActiveAd;
  position: string;
  /** `block`: tam genişlik, görsel oranında (varsayılan). `topbar`: ince şerit için küçük satır içi görsel/başlık. */
  variant?: AdCreativeVariant;
  /** Verilirse, bağlantı açılmadan ÖNCE çağrılır ve açma `NAVIGATE_AFTER_CLOSE_MS` ertelenir (popup'ı kapatmak için). */
  onNavigate?: () => void;
  /** Oturumda gösterimi gönderilmiş reklamlar (bkz. `useAdSession`). */
  sentImpressions?: Set<string>;
}

/**
 * Tek bir reklamın içeriği: görselli (hotspot'lu) ya da metin reklam. Yuvadan
 * bağımsızdır — `AdBanner` (header/footer/inline/topbar) ve `PopupAd` kullanır.
 * Satın alma linki filtresi `resolveAdLink` içinde: açılamayacak hedef için
 * tıklanabilirlik ve hotspot yoktur.
 */
export function AdCreative({ ad, position, variant = 'block', onNavigate, sentImpressions }: AdCreativeProps) {
  const hasImage = hasAdImage(ad);
  // Görsel yüklenince kutu onun GERÇEK oranını alır (kayıtlı ölçü görselden
  // sapabilir). Kutu = görsel olduğu için `contain` kırpmaz ve yüzdeyle
  // konumlanan bölgeler görselin üzerinde birebir oturur.
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(!hasImage);
  // Gösterim ilan başına bir kez, reklam görünürken (mount'ta değil) sayılır.
  useAdImpression(ad.id, loaded, undefined, sentImpressions);

  const open = (url: string | null) => {
    if (!onNavigate) {
      openAdLink(url);
      return;
    }
    onNavigate();
    setTimeout(() => openAdLink(url), NAVIGATE_AFTER_CLOSE_MS);
  };

  const hotspots = renderableHotspots(ad);
  // Görselli reklamda tıklama YALNIZ bölgelerden (web ile aynı kural); bölge
  // yoksa eski/metin reklamın `linkUrl`'i tüm reklamı tıklanabilir yapar.
  const wholeLink =
    hotspots.length === 0 && resolveAdLink(ad.linkUrl).kind !== 'blocked' ? ad.linkUrl : null;

  const handleWholePress = () => {
    // Ölçümü bekletmeden yönlendir; sayaç arka planda gider.
    adsApi.recordClick(ad.id).catch(() => {});
    open(wholeLink);
  };

  const ratio = adAspectRatio(ad, position, naturalRatio);
  const isTopbar = variant === 'topbar';
  const boxStyle = isTopbar
    ? { height: TOPBAR_IMAGE_HEIGHT, width: Math.min(TOPBAR_IMAGE_MAX_WIDTH, TOPBAR_IMAGE_HEIGHT * ratio) }
    : { aspectRatio: ratio };

  return (
    <Pressable
      onPress={handleWholePress}
      disabled={!wholeLink}
      accessibilityRole={wholeLink ? 'link' : hasImage ? 'image' : 'text'}
      accessibilityLabel={ad.altText || ad.title}
      testID={`ad-banner-${ad.id}`}
      style={isTopbar ? styles.topbarSlot : styles.slot}
    >
      {hasImage ? (
        <View style={[styles.imageBox, boxStyle]}>
          <Image
            source={{ uri: ad.imageUrl!.trim() }}
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
                open(h.linkUrl);
              }}
              hitSlop={HOTSPOT_SLOP}
              accessibilityRole="link"
              accessibilityLabel={h.label || ad.altText || ad.title}
              testID={`ad-hotspot-${h.id}`}
              style={[styles.hotspot, hotspotStyle(h)]}
            />
          ))}
        </View>
      ) : isTopbar ? (
        <Text variant="caption" tone="heading" weight="medium" numberOfLines={1} testID={`ad-text-${ad.id}`}>
          {ad.title}
        </Text>
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

const styles = StyleSheet.create({
  slot: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.alt,
  },
  topbarSlot: { justifyContent: 'center' },
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
