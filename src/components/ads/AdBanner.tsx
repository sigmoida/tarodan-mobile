import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, Text } from '@/ui';
import { useAds } from '@/hooks/useAds';
import { adAspectRatio } from '@/lib/ads/adAspect';
import { newRotationSeed, pickAd } from '@/lib/ads/pickAd';
import type { AdSession } from '@/lib/ads/useAdSession';
import { AdCreative } from './AdCreative';

export interface AdBannerProps {
  /** `header` (varsayılan), `footer`, `inline`, `topbar`. */
  position?: string;
  /**
   * Seçim anahtarı; varsayılan `position`. Aynı ekranda birden çok yuvası olan
   * konumlar (inline) her yuvaya ayrı anahtar verir (`inline-0`, `inline-1`) ki
   * her yuva farklı reklam seçebilsin.
   */
  slotKey?: string;
  /** Ekranın ortak tohumu + gösterim kümesi; verilmezse yuva kendi tohumunu üretir. */
  session?: AdSession;
  /** Kapsayıcı stilinin üzerine yazar (ızgara içinde kullanım için). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Verilen konumdaki reklam — yuvada TEK reklam gösterilir (web `BannerSlot` ile
 * aynı); seçim ekran açılışı başına döner. Reklam yoksa veya üye reklamsızsa
 * hiç çizilmez. `topbar` ince "Sponsorlu" şeridi olarak çizilir.
 */
export function AdBanner({ position = 'header', slotKey, session, style }: AdBannerProps) {
  const { t } = useTranslation();
  const { ads, isAdFree, isLoading } = useAds(position);
  // Ekran açılışı başına bir tohum + seçilen reklamın kimliği. Paylaşılan reklam
  // sorgusu yenilenip liste uzunluğu değişse de ekrandaki reklam, listede
  // kaldığı sürece SABİT kalır (aksi halde reklam değişir ve yeni gösterim
  // sayılırdı); yalnız listeden düşerse yeniden seçilir. Rotasyon web'deki
  // "sayfa yüklemesi başına" mantığına denk olarak yuva yeniden bağlanınca
  // (ekran açılışı) olur — sekme odağı değişince DEĞİL: odak başına döndürmek
  // her sekme geçişinde reklamı değiştirir ve yeni gösterim sayardı.
  const [ownSeed] = useState(newRotationSeed);
  const seed = session?.seed ?? ownSeed;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const ad = ads.find((a) => a.id === pickedId) ?? pickAd(ads, slotKey ?? position, seed);
  const adId = ad?.id ?? null;
  useEffect(() => {
    if (adId !== pickedId) setPickedId(adId);
  }, [adId, pickedId]);

  // Reklamsız üyede yer ayırma — kalıcı boş kutu göstermiş oluruz.
  if (isAdFree) return null;

  // Query çözülmeden liste boş kalır; yer ayırmazsak reklam gelince akış
  // ~110-130pt aşağı kayar (kullanıcı tam o an ekranın üstüne bakıyor).
  // Yalnız `header` yuvası yer ayırır; diğer yuvalar (web gibi) reklam yoksa
  // hiç yer tutmaz.
  if (isLoading) {
    if (position !== 'header') return null;
    return (
      <View style={styles.container} testID="ad-banner-slot-reserved">
        <View style={[styles.reserved, { aspectRatio: adAspectRatio({ width: null, height: null }, position) }]} />
      </View>
    );
  }

  if (!ad) return null;

  if (position === 'topbar') {
    return (
      <View
        style={[styles.topbar, style]}
        accessibilityLabel={t('product.sponsoredRegion')}
        testID="ad-banner"
      >
        <Text variant="caption" tone="subtle" weight="medium" style={styles.topbarLabel}>
          {t('product.sponsored')}
        </Text>
        <View style={styles.topbarItem}>
          <AdCreative
            key={ad.id}
            ad={ad}
            position={position}
            variant="topbar"
            sentImpressions={session?.sentImpressions}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, POSITION_STYLE[position], style]} testID="ad-banner">
      <AdCreative key={ad.id} ad={ad} position={position} sentImpressions={session?.sentImpressions} />
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
  footer: { paddingTop: theme.spacing[4], paddingBottom: theme.spacing[2] },
  // Izgara içinde: yatay boşluğu ızgara verir.
  inline: { paddingHorizontal: 0, paddingTop: theme.spacing[1], paddingBottom: theme.spacing[3] },
  reserved: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.alt,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.spacing[10],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.surface.alt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.DEFAULT,
  },
  topbarLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  topbarItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
});

const POSITION_STYLE: Record<string, ViewStyle> = {
  footer: styles.footer,
  inline: styles.inline,
};
