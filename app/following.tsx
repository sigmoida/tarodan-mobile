import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text, Card, Avatar, Button, Spinner, ScreenHeader } from '@/ui';
import { useFollowing, FollowedSeller } from '@/hooks/useFollowing';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

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
      <View style={styles.centeredContainer}>
        <Ionicons name="people-outline" size={64} color={colors.primary[600]!} />
        <Text variant="h2" style={styles.title}>{t('following.title')}</Text>
        <Text variant="body" style={styles.subtitle}>
          {t('following.loginSubtitle')}
        </Text>
        <Button variant="primary" title={t('common.login')} onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('following.titleWithCount', { count: getFollowingCount() })} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      {/* Content */}
      {isLoading && following.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : following.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>{t('following.emptyTitle')}</Text>
          <Text variant="body" style={styles.emptySubtitle}>
            {t('following.emptySubtitle')}
          </Text>
          <Button variant="primary" title={t('following.exploreSellers')} onPress={() => router.push('/(tabs)/search')} style={{ alignSelf: 'center' }} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]!]} />
          }
        >
          {following.map((seller) => (
            <Card key={seller.id} padding={0} style={styles.sellerCard}>
              <TouchableOpacity onPress={() => router.push(`/seller/${seller.id}`)}>
                <View style={styles.sellerContent}>
                  <Avatar
                    size="lg"
                    source={seller.avatarUrl}
                    name={seller.displayName}
                  />
                  <View style={styles.sellerInfo}>
                    <Text variant="label">{seller.displayName}</Text>
                    <View style={styles.sellerStats}>
                      <Ionicons name="pricetag" size={14} color={colors.text.muted} />
                      <Text style={styles.statText}>{t('following.listingCountSuffix', { count: seller.listingCount })}</Text>
                      {seller.rating && (
                        <>
                          <Ionicons name="star" size={14} color={colors.warning[500]!} style={{ marginLeft: theme.spacing[3] }} />
                          <Text style={styles.statText}>{seller.rating.toFixed(1)}</Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.followedDate}>
                      {t('following.followedSince', { date: formatDate(seller.followedAt) })}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <Button
                      variant="outline"
                      size="sm"
                      title={t('following.unfollow')}
                      onPress={() => handleUnfollow(seller)}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))}

          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
    backgroundColor: colors.surface.DEFAULT,
  },
  title: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    color: colors.text.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  emptyTitle: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
    color: colors.text.heading,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    color: colors.text.muted,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  sellerCard: {
    marginBottom: theme.spacing[3],
    backgroundColor: colors.surface.DEFAULT,
  },
  sellerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
  },
  sellerInfo: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1],
  },
  statText: {
    marginLeft: theme.spacing[1],
    color: colors.text.muted,
    fontSize: 12,
  },
  followedDate: {
    color: colors.text.subtle,
    fontSize: 11,
    marginTop: theme.spacing[1],
  },
  actions: {
    marginLeft: theme.spacing[2],
  },
});
