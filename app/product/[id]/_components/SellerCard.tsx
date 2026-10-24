import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Avatar, Button, SectionCard, Text, theme, Icon, ButtonRow } from '@/ui';
import { formatRating } from '@/utils/format';
import { resolveAvatarSource } from '@/utils/imageUrl';
import type { ProductSeller } from '../_lib/types';

const { colors, spacing, iconSize } = theme;

/**
 * Seller card (web `SellerCard`): SectionCard "Seller" with avatar, name, rating and sales count;
 * below it "Send message" (secondary) and "View profile" (outline). The owner does not see the
 * buttons on their own listing. The seller's package (Premium) is deliberately not shown.
 */
export function SellerCard({
  seller,
  isOwner,
  onPressSeller,
  onMessage,
}: {
  seller: ProductSeller | undefined;
  isOwner: boolean;
  onPressSeller: () => void;
  onMessage: () => void;
}) {
  const { t, i18n } = useTranslation();
  if (!seller) return null;
  const rating = Number(seller.rating) || 0;
  const totalRatings = Number(seller.totalRatings) || 0;
  return (
    <SectionCard title={t('product.seller')} testID="product-seller-card">
      <Pressable onPress={onPressSeller} accessibilityRole="button" style={styles.head}>
        <Avatar size="lg" name={seller.displayName || t('product.seller')} source={resolveAvatarSource(seller.avatarUrl)} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
              {seller.displayName}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {rating > 0 ? (
              <View style={styles.stat}>
                <Icon name="star" variant="solid" size={iconSize.sm} color={colors.warning[400]!} />
                <Text variant="bodySm" weight="medium">
                  {formatRating(rating, i18n.language)}
                </Text>
                {totalRatings > 0 ? (
                  <Text variant="bodySm" tone="subtle">
                    ({totalRatings})
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text variant="bodySm" tone="subtle">
                {t('review.noReviews')}
              </Text>
            )}
            <Text variant="bodySm" tone="subtle">
              •
            </Text>
            <Text variant="bodySm" tone="muted">
              {t('product.sellerTotalSalesCount', { count: seller.totalSales || 0 })}
            </Text>
          </View>
        </View>
      </Pressable>

      {!isOwner ? (
        <ButtonRow style={{ marginTop: theme.spacing[4] }}>
          <Button variant="secondary" title={t('product.sendMessage')} onPress={onMessage} />
          <Button variant="outline" title={t('seller.viewProfile')} onPress={onPressSeller} />
        </ButtonRow>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  name: { flexShrink: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing[2], marginTop: spacing[1] },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
});
