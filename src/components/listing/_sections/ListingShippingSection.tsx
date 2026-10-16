import React, { memo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Label, SectionCard, Spinner, Text, androidRipple, rippleClip, showPressedStyle, theme } from '@/ui';
import type { ShippingPackageTier } from '@/lib/api/orders';
import { useStableCallback } from '@/hooks/useStableCallback';
import { formatPrice } from '@/utils/format';

import { getPackageTierLabel } from '../_lib/constants';
import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';
import { fieldStyles } from './fields';

const { colors, spacing, radiusRole } = theme;

type SectionProps = { f: ListingFormController };

/** Bu dosyadaki bölümün okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = [
  'commissionEnabled',
  'commissionLoading',
  'commissionPreview',
  'packageTiers',
  'packageTiersError',
  'packageTiersLoading',
  'setShippingPackageTier',
  'shippingPackageTier',
];

const TIER_GAP = spacing[2];
/**
 * Kademe kartlarının yatay kullanılabilir alanından düşülen sabit pay: sayfa kenarı (16×2) +
 * SectionCard dolgusu (12×2) + çerçeve.
 */
const TIER_ROW_CHROME = spacing[4] * 2 + spacing[3] * 2 + 2;
/** Kart içi sabit pay: çerçeve + kart yatay dolgusu + ücret şeridinin yatay dolgusu. */
const TIER_CARD_CHROME = 2 + spacing[1.5] * 2 + spacing[1] * 2;
/**
 * Bir kartın içeriği ("Küçük Paket" etiketi, "160,00 TL" ücreti) tek satıra sığsın diye
 * gereken asgari genişlik (font ölçeği 1'de). Ücret ASLA bölünmez. Sonuç: font ölçeği 1'de
 * ~380pt ve üstü (390/393/430) üç sütun; 375/360 ve büyük yazı satır kart.
 */
const TIER_MIN_CONTENT = 80;

/**
 * Üç kademe yan yana sığıyor mu? Sığmıyorsa (dar ekran ya da büyük yazı) tek sütun —
 * web'in telefon düzeni gibi satır kartlar: etiket solda, ücret sağda. Saf — test edilebilir.
 */
export function tierColumns(windowWidth: number, fontScale: number, count = 3): 1 | 3 {
  const perCard = (windowWidth - TIER_ROW_CHROME - TIER_GAP * (count - 1)) / count;
  return perCard >= TIER_MIN_CONTENT * fontScale + TIER_CARD_CHROME ? 3 : 1;
}

/** Örnek ölçü metni (web `sampleDimensionsLabel`); üç ölçü de yoksa `null`. */
export function sampleDimensions(tier: ShippingPackageTier): string | null {
  const { sampleWidth, sampleHeight, sampleLength } = tier;
  if (sampleWidth == null || sampleHeight == null || sampleLength == null) return null;
  return `${sampleWidth} × ${sampleHeight} × ${sampleLength} cm`;
}

/**
 * "Paket ücreti" şeridi (web `PackageSizeOption`). Tutar yokken de KAYBOLMAZ: kart
 * yüksekliği sabit kalır ve satıcı ücretin var olduğunu, yalnız henüz
 * hesaplanmadığını görür ("—"); hesaplanırken "…".
 */
function FeeStrip({ amount, loading, stacked }: { amount: number | null; loading: boolean; stacked: boolean }) {
  const { t } = useTranslation();
  const filled = amount != null && !loading;
  return (
    <View style={[styles.strip, filled ? styles.stripFilled : styles.stripEmpty, stacked && styles.stripStacked]}>
      <Text variant="overline" numberOfLines={1} align="center" tone={filled ? 'inverted' : 'muted'}>
        {t('product.packageFeeLabel')}
      </Text>
      <Text
        variant="label"
        numberOfLines={1}
        align="center"
        tone={filled ? 'inverted' : 'subtle'}
        style={styles.stripAmount}
        testID="package-tier-fee"
      >
        {loading ? '…' : amount == null ? '—' : formatPrice(amount)}
      </Text>
    </View>
  );
}

interface TierCardProps {
  tier: ShippingPackageTier;
  label: string;
  /** Satıcının ödeyeceği kargo payı; fiyat/kategori yokken hesaplanamaz → `null`. */
  amount: number | null;
  amountLoading: boolean;
  selected: boolean;
  stacked: boolean;
  onSelect: (code: string) => void;
}

const TierCard = memo(function TierCard({
  tier,
  label,
  amount,
  amountLoading,
  selected,
  stacked,
  onSelect,
}: TierCardProps) {
  const { t } = useTranslation();
  const dimensions = sampleDimensions(tier);
  const labelColor = selected ? colors.primary[700] : undefined;
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
      {stacked ? (
        <>
          <View style={styles.tierInfo}>
            <Text variant="label" numberOfLines={1} color={labelColor}>
              {label}
            </Text>
            {dimensions ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {t('product.sampleDimensionsLabel')}: {dimensions}
              </Text>
            ) : null}
          </View>
          <FeeStrip amount={amount} loading={amountLoading} stacked />
        </>
      ) : (
        <>
          <Text variant="label" numberOfLines={2} align="center" color={labelColor}>
            {label}
          </Text>
          <FeeStrip amount={amount} loading={amountLoading} stacked={false} />
          {dimensions ? (
            <Text
              variant="caption"
              align="center"
              tone="muted"
              accessibilityLabel={`${t('product.sampleDimensionsLabel')}: ${dimensions}`}
            >
              {dimensions}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
});

/**
 * Kargo paket boyutu — üç kart; etiket + örnek ölçü sunucu tarifesinden
 * (`GET /shipping/package-tiers`), "Paket ücreti" komisyon önizlemesinin
 * `packageTierShipping[]`'inden: satıcının ÖDEYECEĞİ pay, tarifenin tam bedeli
 * (`amount`) değil — web `PackageSizePicker` ile aynı. Fiyat/kategori girilmeden
 * tutar hesaplanamaz: şeritte "—" ve neyin eksik olduğunu söyleyen ipucu.
 *
 * ⚠️ BAĞLAYICI (doküman 14 §1): mobil arayüzde **desi hiç görünmez**.
 */
export const ListingShippingSection = memoSection(function ListingShippingSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const stacked = tierColumns(width, fontScale, f.packageTiers.length || 3) === 1;
  const onSelect = useStableCallback(f.setShippingPackageTier);
  const amountByTier = new Map(
    (f.commissionPreview?.packageTierShipping ?? []).map((s) => [s.code, s.sellerShippingAmount]),
  );

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
                amount={amountByTier.get(tier.code) ?? null}
                amountLoading={f.commissionLoading}
                selected={f.shippingPackageTier === tier.code}
                stacked={stacked}
                onSelect={onSelect}
              />
            ))}
          </View>
          {/* Yalnız EKSİK GİRDİ: sunucu hatasında bu metin, alanları doldurmuş satıcıya
              doldurmadığını söylerdi — hata metnini fiyat kartının özeti veriyor. */}
          {!f.commissionEnabled ? (
            <Text variant="caption" tone="muted" testID="package-fee-missing">
              {t('product.packageFeeNeedsPriceAndCategory')}
            </Text>
          ) : null}
          <Text variant="caption" tone="subtle">
            {t('listing.packageTiersHint')}
          </Text>
        </View>
      )}
    </SectionCard>
  );
}, KEYS);

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
    paddingHorizontal: spacing[1.5],
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
  },
  tierInfo: {
    flex: 1,
    gap: spacing[1],
  },
  strip: {
    alignSelf: 'stretch',
    borderRadius: radiusRole.card,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },
  stripStacked: {
    alignSelf: 'center',
    paddingHorizontal: spacing[3],
  },
  stripFilled: {
    backgroundColor: colors.primary[600],
  },
  stripEmpty: {
    backgroundColor: colors.surface.alt,
  },
  stripAmount: {
    fontVariant: ['tabular-nums'],
  },
  tierActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  pressed: {
    opacity: 0.85,
  },
});
