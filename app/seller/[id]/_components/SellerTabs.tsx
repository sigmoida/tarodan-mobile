import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, EmptyState, SectionCard, SegmentedButtons, Text, theme, Icon } from '@/ui';

import { ProductCard } from '@/components/product';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { styles } from '../_lib/styles';
import type { SellerProfileController } from '../_hooks/useSellerProfile';
import { ReviewAuthorName } from '@/components/reviews/ReviewAuthorName';

const { colors, iconSize } = theme;

type Tab = SellerProfileController['activeTab'];

/** Sekme çubuğu + içerik (web `SellerProfileClient`): ilanlar (ProductCard), değerlendirmeler, koleksiyonlar. */
export function SellerTabs({ f }: { f: SellerProfileController }) {
  const { t } = useTranslation();
  const { activeTab, products, reviews, collections } = f;
  return (
    <>
      <SegmentedButtons<Tab>
        density="small"
        style={styles.tabs}
        value={activeTab}
        onValueChange={f.setActiveTab}
        options={[
          { value: 'listings', label: t('seller.listingsCount', { count: products.length }) },
          { value: 'reviews', label: t('seller.reviewsCount', { count: reviews.length }) },
          { value: 'collections', label: t('seller.collectionsCount', { count: collections.length }) },
        ]}
      />

      {activeTab === 'listings' &&
        (products.length === 0 ? (
          <EmptyState size="compact" icon="magnifying-glass" title={t('seller.noActiveListings')} />
        ) : (
          <View style={styles.grid}>
            {products.map((product: any) => (
              <View key={product.id} style={styles.cell}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        ))}

      {activeTab === 'reviews' &&
        (reviews.length === 0 ? (
          <EmptyState size="compact" icon="star" title={t('review.noReviews')} />
        ) : (
          <SectionCard title={t('review.reviews')}>
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
          <EmptyState size="compact" icon="rectangle-stack" title={t('seller.noCollections')} />
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
