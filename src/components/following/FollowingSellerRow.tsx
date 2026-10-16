import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, Text, Card, Avatar, Button, Icon } from '@/ui';
import type { FollowedSeller } from '@/hooks/useFollowing';

const { colors, spacing, iconSize } = theme;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * Takip ettiklerim satırı (web Card satıcı satırı). Memo'lu: `onUnfollow` kararlı referanstır ve
 * satıcıyı argüman alır (satır başına closure yok) → liste yalnız değişen satırı yeniden çizer.
 */
export const FollowingSellerRow = React.memo(function FollowingSellerRow({
  seller,
  onUnfollow,
}: {
  seller: FollowedSeller;
  onUnfollow: (seller: FollowedSeller) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card variant="bordered" padding={0}>
      <Pressable testID={`following-seller-${seller.id}`} onPress={() => router.push(`/seller/${seller.id}`)}>
        <View style={styles.sellerContent}>
          <Avatar size="lg" source={seller.avatarUrl} name={seller.displayName} />
          <View style={styles.sellerInfo}>
            <Text variant="label" numberOfLines={1}>{seller.displayName}</Text>
            {seller.bio ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>{seller.bio}</Text>
            ) : null}
            <View style={styles.sellerStats}>
              <Text variant="caption">{t('following.listingCountSuffix', { count: seller.listingCount })}</Text>
              {seller.rating ? (
                <>
                  <Icon name="star" variant="solid" size={iconSize.sm} color={colors.warning[500]!} style={styles.ratingIcon} />
                  <Text variant="caption">{seller.rating.toFixed(1)}</Text>
                </>
              ) : null}
            </View>
            {seller.followedAt ? (
              <Text variant="caption" tone="subtle">
                {t('following.followedSince', { date: formatDate(seller.followedAt) })}
              </Text>
            ) : null}
          </View>
          <Button
            variant="outline"
            size="sm"
            title={t('following.unfollow')}
            onPress={() => onUnfollow(seller)}
          />
        </View>
      </Pressable>
    </Card>
  );
});

const styles = StyleSheet.create({
  sellerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  sellerInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  ratingIcon: {
    marginLeft: spacing[2],
  },
});
