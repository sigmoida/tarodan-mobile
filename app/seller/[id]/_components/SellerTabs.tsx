import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, ChipTabs, EmptyState, SectionCard, Text, theme, Icon } from '@/ui';

import { ProductCard } from '@/components/product';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { sellerRatingSummary } from '../_lib/rating';
import { styles } from '../_lib/styles';
import type { SellerProfileController } from '../_hooks/useSellerProfile';
import { ReviewAuthorName } from '@/components/reviews/ReviewAuthorName';

const { colors, iconSize } = theme;

type Tab = SellerProfileController['activeTab'];

/** Sekme çubuğu + içerik (web `SellerProfileClient`): ilanlar (ProductCard), değerlendirmeler, koleksiyonlar. */
export function SellerTabs({ f }: { f: SellerProfileController }) {
  const { t } = useTranslation();
  const { activeTab, products, reviews, collections } = f;
  const rating = sellerRatingSummary(f);
  // Kendi profilinde ilanların hepsi kullanıcının: kalp hiç çizilmez (DTO'da satıcı olmasa da).
  const favoriteProps = useProductCardFavorites();
  return (
    <>
      <ChipTabs<Tab>
        testID="seller-tabs"
        value={activeTab}
        onChange={f.setActiveTab}
        items={[
          { key: 'listings', label: t('profile.listings'), count: products.length },
          { key: 'reviews', label: t('profile.reviews'), count: reviews.length },
          { key: 'collections', label: t('nav.collections'), count: collections.length },
        ]}
      />

      {activeTab === 'listings' &&
        (products.length === 0 ? (
          <EmptyState placement="inline" testID="seller-empty-listings" icon="magnifying-glass" title={t('seller.noActiveListings')} subtitle={t('home.noProductsYetHint')} />
        ) : (
          <View style={styles.grid}>
            {products.map((product: any) => (
              <View key={product.id} style={styles.cell}>
                <ProductCard product={product} {...(f.isOwnProfile ? null : favoriteProps(product))} />
              </View>
            ))}
          </View>
        ))}

      {activeTab === 'reviews' &&
        (reviews.length === 0 ? (
          <EmptyState placement="inline" testID="seller-empty-reviews" icon="star" title={t('review.noReviews')} subtitle={t('seller.noReviewsDesc')} />
        ) : (
          <SectionCard
            title={t('review.reviews')}
            badge={
              rating.hasRatings ? (
                <Text variant="bodySm" weight="semibold" tone="heading" testID="seller-reviews-average">
                  ★ {rating.average.toFixed(1)} ({rating.total})
                </Text>
              ) : null
            }
          >
            {reviews.map((review: any, i: number) => {
              // Kullanıcı/satıcı değerlendirmesi DTO'su: { score, comment, createdAt, giverName, giver: { displayName, avatarUrl } }
              const score = review.score ?? review.rating ?? 0;
              const reviewerName =
                review.giver?.displayName ?? review.giverName ?? review.reviewer?.displayName ?? review.userName ?? t('common.user');
              const dateStr = review.createdAt ?? review.date;
              const avatarUrl = review.giver?.avatarUrl ?? review.reviewer?.avatarUrl;
              return (
                <View key={review.id} style={[styles.review, i > 0 && styles.reviewDivided]}>
                  <View style={styles.reviewHead}>
                    <Avatar size="md" source={avatarUrl} name={reviewerName.substring(0, 2).toUpperCase()} />
                    <View style={styles.reviewInfo}>
                      <ReviewAuthorName review={review} name={reviewerName} />
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name={star <= score ? 'star' : 'star'} variant={star <= score ? 'solid' : 'outline'}
                            size={iconSize.sm}
                            color={colors.warning[400]!}
                          />
                        ))}
                        {dateStr ? (
                          <Text variant="caption" tone="muted">
                            {' '}
                            {new Date(dateStr).toLocaleDateString(t('common.dateLocale'))}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  {review.comment ? <Text variant="bodySm">{review.comment}</Text> : null}
                </View>
              );
            })}
          </SectionCard>
        ))}

      {activeTab === 'collections' &&
        (collections.length === 0 ? (
          <EmptyState placement="inline" testID="seller-empty-collections" icon="rectangle-stack" title={t('seller.noCollections')} subtitle={t('emptyState.collectionsHint')} />
        ) : (
          <View style={styles.grid}>
            {collections.map((collection: any) => (
              <View key={collection.id} style={styles.cell}>
                <CollectionCard item={collection} />
              </View>
            ))}
          </View>
        ))}
    </>
  );
}
