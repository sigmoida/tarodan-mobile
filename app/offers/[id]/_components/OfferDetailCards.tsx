import { View, Pressable } from 'react-native';
import { SectionCard, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatPrice, formatOfferStatus, formatRelativeDate } from '@/utils/format';
import { AppImage } from '@/components/AppImage';
import { styles } from '../_lib/styles';
import type { OfferDetailController } from '../_hooks/useOfferDetail';

/** Ürün + statü + tutar + mesaj + taraflar kartları (detay gövdesi). */
export function OfferDetailCards({ f }: { f: OfferDetailController }) {
  const { t, i18n } = useTranslation();
  const { offer, firstImg, color } = f;
  if (!offer || !color) return null;

  return (
    <>
      {/* Product */}
      <SectionCard>
        <Pressable
          style={styles.productCard}
          onPress={() => offer.product?.id && router.push(`/product/${offer.product.id}`)}
          accessibilityRole="button"
        >
          <AppImage source={firstImg} variant="card" style={styles.productImage} />
          <View style={styles.productBody}>
            <Text variant="body" weight="semibold" tone="heading" numberOfLines={2}>
              {offer.product?.title || t('order.product')}
            </Text>
            {offer.product?.price ? (
              <Text variant="bodySm" tone="muted">
                {t('product.listPriceLine')}: {formatPrice(offer.product.price)}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </SectionCard>

      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: color.bg }]}>
        <Text variant="body" weight="bold" style={{ color: color.fg }}>
          {formatOfferStatus(offer.status, i18n.language)}
        </Text>
      </View>

      {/* Amount */}
      <SectionCard title={t('offer.offerAmount')} bodyStyle={styles.amount}>
        <Text variant="h1" weight="bold" style={{ color: theme.priceColor.detail }}>
          {formatPrice(offer.amount)}
        </Text>
        {offer.counterAmount ? (
          <>
            <View style={styles.divider} />
            <Text variant="bodySm" tone="muted">{t('offer.counterOffer')}</Text>
            <Text variant="h2" weight="bold" style={{ color: theme.colors.info[600]! }}>
              {formatPrice(offer.counterAmount)}
            </Text>
          </>
        ) : null}
      </SectionCard>

      {/* Message */}
      {offer.message ? (
        <SectionCard title={t('common.message')}>
          <Text variant="body" tone="heading">{offer.message}</Text>
        </SectionCard>
      ) : null}

      {/* Parties */}
      <SectionCard bodyStyle={styles.party}>
        <View style={styles.partyRow}>
          <Text variant="bodySm" tone="muted">{t('order.buyer')}</Text>
          <Text variant="bodySm" weight="semibold" tone="heading">{offer.buyer?.displayName || '—'}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text variant="bodySm" tone="muted">{t('product.seller')}</Text>
          <Text variant="bodySm" weight="semibold" tone="heading">{offer.seller?.displayName || '—'}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text variant="bodySm" tone="muted">{t('offer.createdAtLabel')}</Text>
          <Text variant="bodySm" weight="semibold" tone="heading">
            {formatRelativeDate(offer.createdAt, i18n.language)}
          </Text>
        </View>
      </SectionCard>
    </>
  );
}
