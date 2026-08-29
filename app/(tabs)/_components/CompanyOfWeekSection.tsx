import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl as getImageUrlFromUtils } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';

const { colors } = theme;

/** "Haftanın Şirketi" — profil + istatistik + öne çıkan ürünler + koleksiyonlar. */
export function CompanyOfWeekSection({
  companyOfWeek,
  isLoading,
}: {
  companyOfWeek: any;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return <View style={styles.companyOfWeekSectionReserved} testID="company-of-week-section-reserved" />;
  }
  if (!companyOfWeek) return null;
  const c = companyOfWeek;

  return (
    <View style={styles.companySection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIndicator, { backgroundColor: colors.warning[500]! }]} />
          <Text style={styles.sectionTitle}>{t('home.companyOfWeek')}</Text>
          <View style={styles.businessBadge}>
            <Text style={styles.businessBadgeText}>{t('home.businessBadge')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.companyCard}>
        {/* Company Profile */}
        <View style={styles.companyHeader}>
          {c.avatarUrl ? (
            <Image source={{ uri: getImageUrlFromUtils(c.avatarUrl) }} style={styles.companyAvatar} />
          ) : (
            <LinearGradient colors={[colors.primary[600]!, colors.warning[500]!]} style={styles.companyAvatarGradient}>
              <Text style={styles.companyAvatarText}>
                {(c.displayName || c.companyName || 'Ş').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.companyInfo}>
            <View style={styles.companyNameRow}>
              <Text style={styles.companyNameText}>{c.displayName || c.companyName || t('home.companyFallback')}</Text>
              {c.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />}
            </View>
            <Text style={styles.companyBio}>{c.bio || t('home.companyBioFallback')}</Text>
          </View>
        </View>

        {/* Company Stats */}
        {c.stats && (
          <View style={styles.companyStatsGrid}>
            <View style={[styles.companyStat, { backgroundColor: colors.warning[50]! }]}>
              <Text style={[styles.companyStatValue, { color: colors.primary[600]! }]}>{c.stats.totalProducts || 0}</Text>
              <Text style={styles.companyStatLabel}>{t('home.statProducts')}</Text>
            </View>
            <View style={[styles.companyStat, { backgroundColor: colors.success[50]! }]}>
              <Text style={[styles.companyStatValue, { color: colors.success[600]! }]}>{c.stats.totalSales || 0}</Text>
              <Text style={styles.companyStatLabel}>{t('common.sales')}</Text>
            </View>
            <View style={[styles.companyStat, { backgroundColor: colors.info[50]! }]}>
              <Text style={[styles.companyStatValue, { color: colors.info[600]! }]}>{(c.stats.totalViews || 0).toLocaleString()}</Text>
              <Text style={styles.companyStatLabel}>{t('home.statViews')}</Text>
            </View>
            <View style={[styles.companyStat, { backgroundColor: colors.danger[50]! }]}>
              <Text style={[styles.companyStatValue, { color: colors.danger[600]! }]}>{(c.stats.totalLikes || 0).toLocaleString()}</Text>
              <Text style={styles.companyStatLabel}>{t('home.statLikes')}</Text>
            </View>
          </View>
        )}

        {/* Rating */}
        {c.stats?.averageRating > 0 && (
          <View style={styles.companyRating}>
            <Ionicons name="star" size={18} color={colors.warning[500]!} />
            <Text style={styles.companyRatingValue}>{c.stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.companyRatingCount}>
              {t('home.reviewCountSuffix', { count: c.stats.totalRatings || 0 })}
            </Text>
          </View>
        )}

        {/* Öne Çıkan Ürünler */}
        <Text style={styles.companySectionTitle}>{t('home.featuredRailTitle')}</Text>
        {c.products && c.products.length > 0 && (
          <View style={styles.companyProductsGrid}>
            {c.products.slice(0, 6).map((product: any) => (
              <TouchableOpacity
                key={product.id}
                style={styles.companyProductCard}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <Image
                  source={{ uri: getImageUrlFromUtils(product.image ?? product.cardUrl ?? product.images) }}
                  style={styles.companyProductImage}
                  resizeMode="cover"
                />
                <View style={styles.companyProductLikes}>
                  <Ionicons name="thumbs-up" size={12} color={colors.primary[600]!} />
                  <Text style={styles.companyProductLikesText}>{product.likeCount || 0}</Text>
                </View>
                <View style={styles.companyProductInfo}>
                  <Text style={styles.companyProductTitle} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.companyProductPrice}>₺{product.price?.toLocaleString('tr-TR')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Koleksiyonlar */}
        {c.collections && c.collections.length > 0 && (
          <>
            <Text style={styles.companySectionTitle}>{t('home.companyCollections')}</Text>
            {c.collections.slice(0, 2).map((collection: any) => (
              <TouchableOpacity
                key={collection.id}
                style={styles.companyCollectionCard}
                onPress={() => router.push(`/collections/${collection.id}` as any)}
              >
                {collection.coverImageUrl ? (
                  <Image source={{ uri: getImageUrlFromUtils(collection.coverImageUrl) }} style={styles.companyCollectionImage} />
                ) : (
                  <View style={styles.companyCollectionImagePlaceholder}>
                    <Text style={{ fontSize: 24 }}>📚</Text>
                  </View>
                )}
                <View style={styles.companyCollectionInfo}>
                  <Text style={styles.companyCollectionName}>{collection.name}</Text>
                  <Text style={styles.companyCollectionMeta}>
                    {t('collection.itemCountSuffix', { count: collection.itemCount })}
                  </Text>
                  <View style={styles.companyCollectionStats}>
                    <Text style={styles.companyCollectionStatText}>
                      {t('collection.viewCountSuffix', { count: collection.viewCount })}
                    </Text>
                    <Text style={styles.companyCollectionStatTextRed}>
                      {t('collection.likeCountSuffix', { count: collection.likeCount })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.viewStoreButton} onPress={() => router.push(`/seller/${c.id}`)}>
          <LinearGradient
            colors={[colors.primary[600]!, colors.warning[500]!]}
            style={styles.viewStoreButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.viewStoreButtonText}>{t('home.viewStore')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
