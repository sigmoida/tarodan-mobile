import React, { memo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Label, SectionCard, Spinner, Text, androidRipple, rippleClip, showPressedStyle, theme } from '@/ui';
import type { ShippingPackageTier } from '@/lib/api/orders';
import { useStableCallback } from '@/hooks/useStableCallback';

import { getPackageTierLabel } from '../_lib/constants';
import type { ListingFormController } from '../_hooks/useListingForm';
import { fieldStyles } from './fields';

const { colors, spacing, radiusRole } = theme;

type SectionProps = { f: ListingFormController };

const TIER_GAP = spacing[2];
/**
 * Kademe kartlarının yatay kullanılabilir alanından düşülen sabit pay: sayfa kenarı (16×2) +
 * SectionCard dolgusu (12×2) + çerçeve.
 */
const TIER_ROW_CHROME = spacing[4] * 2 + spacing[3] * 2 + 2;
/** Bir kartın etiketi tek satıra sığsın diye gereken asgari genişlik (font ölçeği 1'de). */
const TIER_MIN_WIDTH = 96;

/**
 * Üç kademe yan yana sığıyor mu? Sığmıyorsa (dar ekran ya da büyük yazı) tek sütun: kart
 * etiketleri bölünmez. Saf — test edilebilir.
 */
export function tierColumns(windowWidth: number, fontScale: number, count = 3): 1 | 3 {
  const perCard = (windowWidth - TIER_ROW_CHROME - TIER_GAP * (count - 1)) / count;
  return perCard >= TIER_MIN_WIDTH * fontScale ? 3 : 1;
}

interface TierCardProps {
  tier: ShippingPackageTier;
  label: string;
  selected: boolean;
  stacked: boolean;
  onSelect: (code: string) => void;
}

const TierCard = memo(function TierCard({ tier, label, selected, stacked, onSelect }: TierCardProps) {
  const sample = [tier.sampleWidth, tier.sampleHeight, tier.sampleLength];
  const hasSample = sample.every((v) => v != null);
  return (
    <Pressable
      testID={`package-tier-${tier.code}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onSelect(tier.code)}
      android_ripple={androidRipple()}
      style={({ pressed }) => [
        styles.tier,
        rippleClip(),
        stacked ? styles.tierStacked : styles.tierColumn,
        selected && styles.tierActive,
        showPressedStyle(pressed) && styles.pressed,
      ]}
    >
      <Text variant="label" numberOfLines={stacked ? 1 : 2} align="center" color={selected ? colors.primary[700] : undefined}>
        {label}
      </Text>
      {/* Örnek ölçü sunucuda bugün boş — geldiği gün görünür. */}
      {hasSample ? (
        <Text variant="caption" align="center" color={selected ? colors.primary[700] : colors.text.muted}>
          {sample.join(' × ')} cm
        </Text>
      ) : null}
    </Pressable>
  );
});

/**
 * Kargo paket boyutu — üç kart, sunucu tarifesinden (`GET /shipping/package-tiers`).
 *
 * ⚠️ BAĞLAYICI (doküman 14 §1): mobil arayüzde **desi hiç görünmez**. Tarife
 * `billableDesi` / `minDesi` / `maxDesi` döndürüyor; hiçbiri render edilmez.
 * Kart üzerinde tutar da yazmıyoruz: `amount` kademenin TAM kargo bedeli ama
 * alıcı/satıcı payı kategori bazlı ve adminden geliyor (canlıda 50/50) —
 * istemcinin gösterebileceği doğru tek rakam, aşağıdaki net kazanç önizlemesi.
 */
export function ListingShippingSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const stacked = tierColumns(width, fontScale, f.packageTiers.length || 3) === 1;
  const onSelect = useStableCallback(f.setShippingPackageTier);

  return (
    <SectionCard title={t('product.shipping')}>
      <Label required>{t('listing.packageSizeLabel')}</Label>

      {f.packageTiersLoading ? (
        <Spinner color={colors.text.subtle} style={styles.spinner} />
      ) : f.packageTiersError || f.packageTiers.length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('listing.packageTiersError')}
        </Text>
      ) : (
        <View style={fieldStyles.body}>
          <View style={stacked ? styles.tierListStacked : styles.tierRow}>
            {f.packageTiers.map((tier) => (
              <TierCard
                key={tier.code}
                tier={tier}
                label={getPackageTierLabel(tier.code, tier.label, t)}
                selected={f.shippingPackageTier === tier.code}
                stacked={stacked}
                onSelect={onSelect}
              />
            ))}
          </View>
          <Text variant="caption" tone="subtle">
            {t('listing.packageTiersHint')}
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  spinner: {
    alignSelf: 'flex-start',
  },
  tierRow: {
    flexDirection: 'row',
    gap: TIER_GAP,
  },
  tierListStacked: {
    gap: TIER_GAP,
  },
  tier: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.elevated,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    minHeight: theme.minTouchTarget,
  },
  tierColumn: {
    flex: 1,
  },
  tierStacked: {
    alignSelf: 'stretch',
  },
  tierActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  pressed: {
    opacity: 0.85,
  },
});
