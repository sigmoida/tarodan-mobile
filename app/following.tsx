import { View, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text, Card, Avatar, Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useFollowing, FollowedSeller } from '@/hooks/useFollowing';
import { useAuthStore } from '@/stores/authStore';

const { colors, spacing, iconSize } = theme;

/** Takip ettiklerim — PageShell (Skeleton / boş durum / misafir) + web Card satıcı satırları. */
export default function FollowingScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { following, isLoading, fetchFollowing, unfollowSeller, getFollowingCount } = useFollowing();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch following on focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchFollowing();
      }
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFollowing();
    setRefreshing(false);
  };

  const handleUnfollow = async (seller: FollowedSeller) => {
    await unfollowSeller(seller.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <AuthGatePage
        title={t('following.title')}
        icon="people-outline"
        subtitle={t('following.loginSubtitle')}
      />
    );
  }

  return (
    <PageShell
      title={t('following.titleWithCount', { count: getFollowingCount() })}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      loading={isLoading && following.length === 0}
      loadingFallback={<RowListSkeleton rows={4} />}
      empty={!isLoading && following.length === 0}
      emptyState={{
        icon: 'people-outline',
        title: t('following.emptyTitle'),
        subtitle: t('following.emptySubtitle'),
        actionLabel: t('following.exploreSellers'),
        onAction: () => router.push('/(tabs)/search'),
      }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {following.map((seller) => (
        <Card key={seller.id} variant="bordered" padding={0}>
          <Pressable onPress={() => router.push(`/seller/${seller.id}`)}>
            <View style={styles.sellerContent}>
              <Avatar size="lg" source={seller.avatarUrl} name={seller.displayName} />
              <View style={styles.sellerInfo}>
                <Text variant="label">{seller.displayName}</Text>
                <View style={styles.sellerStats}>
                  <Text variant="caption">{t('following.listingCountSuffix', { count: seller.listingCount })}</Text>
                  {seller.rating && (
                    <>
                      <Ionicons name="star" size={iconSize.sm} color={colors.warning[500]!} style={styles.ratingIcon} />
                      <Text variant="caption">{seller.rating.toFixed(1)}</Text>
                    </>
                  )}
                </View>
                <Text variant="caption" tone="subtle">
                  {t('following.followedSince', { date: formatDate(seller.followedAt) })}
                </Text>
              </View>
              <Button
                variant="outline"
                size="sm"
                title={t('following.unfollow')}
                onPress={() => handleUnfollow(seller)}
              />
            </View>
          </Pressable>
        </Card>
      ))}
    </PageShell>
  );
}

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
