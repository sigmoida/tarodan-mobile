import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Skeleton, Text, theme } from '@/ui';
import UpgradeCta from '@/components/UpgradeCta';

import { ListingQuotaCard, quotaProgressColor } from '../ListingQuotaCard';
import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';
import { navigateTo } from '@/lib/navigation/goTo';

const { colors, spacing, controlHeight, radiusRole } = theme;

type SectionProps = { f: ListingFormController };

/** Bu dosyadaki bölümün okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = [
  'handleReactivate',
  'isEdit',
  'limitsLoading',
  'listingLimits',
  'reactivateQuantity',
  'reactivating',
  'setReactivateQuantity',
  'status',
];
type ListingLimits = NonNullable<ListingFormController['listingLimits']>;

const goPremium = () => navigateTo('/(tabs)/profile');

/** Kota kartı (yalnız yeni ilan). Yüklenirken web gibi iskelet. */
const ListingLimitCard = memo(function ListingLimitCard({ limits }: { limits: ListingLimits }) {
  const { t } = useTranslation();
  const { isPremium, canCreateListing, maxListings, currentCount, remainingListings } = limits;
  const summaryColor = isPremium
    ? colors.warning[800]
    : canCreateListing
      ? colors.success[800]
      : colors.danger[800];
  return (
    <ListingQuotaCard
      testID="listing-limit-card"
      title={t('listing.limitTitle')}
      summary={
        maxListings === -1
          ? t('listing.currentUnlimited', { count: currentCount })
          : t('listing.quotaLine', { count: currentCount, max: maxListings })
      }
      summaryColor={summaryColor}
      detail={remainingListings !== -1 ? t('listing.remainingCount', { count: remainingListings }) : undefined}
      progress={maxListings > 0 ? Math.min(1, currentCount / maxListings) : null}
      progressColor={quotaProgressColor(currentCount, maxListings)}
      action={
        canCreateListing ? undefined : (
          <UpgradeCta>
            <Button variant="link" size="sm" title={t('address.goPremium')} onPress={goPremium} />
          </UpgradeCta>
        )
      }
    />
  );
});

/** Satılmış ilan: stok girip yeniden onaya gönderme paneli (web `StatusBanners`). */
function ReactivatePanel({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <Alert variant="warning" title={t('listing.soldTitle')}>
      <Text variant="bodySm" tone="warning">
        {t('listing.reactivateHint')}
      </Text>
      <Input
        value={f.reactivateQuantity}
        onChangeText={f.setReactivateQuantity}
        placeholder={t('product.stockQuantity')}
        keyboardType="number-pad"
        style={styles.reactivateInput}
      />
      <Button
        title={t('listing.submitForReview')}
        onPress={f.handleReactivate}
        isLoading={f.reactivating}
        fullWidth
      />
    </Alert>
  );
}

/**
 * Formun üstü: alt başlık (yeni ilan), kota kartı ve durum panelleri (satıldı / kaldırıldı).
 * Kendi kendini kapılar: koşulu tutmayan parça çizilmez.
 */
export const ListingHeaderBanners = memoSection(function ListingHeaderBanners({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <>
      {!f.isEdit ? (
        <Text variant="bodySm" tone="muted">
          {t('listing.createSubtitle')}
        </Text>
      ) : null}

      {!f.isEdit && f.limitsLoading ? (
        <View testID="listing-limit-skeleton">
          <Skeleton height={controlHeight.xl} borderRadius={radiusRole.section} />
        </View>
      ) : !f.isEdit && f.listingLimits ? (
        <ListingLimitCard limits={f.listingLimits} />
      ) : null}

      {f.isEdit && f.status === 'sold' ? <ReactivatePanel f={f} /> : null}

      {/* Kaldırılmış ürün: düzenlenemez/yeniden açılamaz (yönetici kaldırması) */}
      {f.isEdit && f.status === 'deleted' ? (
        <Alert variant="danger" title={t('listing.removedTitle')}>
          {t('listing.removedBody')}
        </Alert>
      ) : null}
    </>
  );
}, KEYS);

const styles = StyleSheet.create({
  reactivateInput: {
    marginTop: spacing[2.5],
  },
});
