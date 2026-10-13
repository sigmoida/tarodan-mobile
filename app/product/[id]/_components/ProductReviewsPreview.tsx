import { useTranslation } from 'react-i18next';
import React from 'react';
import { EmptyState, SectionCard, SectionCardAction } from '@/ui';
import type { ProductReview } from '../_lib/types';
import { ReviewRow } from './ReviewRow';

/** Değerlendirmeler (web `ProductReviews`): SectionCard + "Tümünü gör"; ilk 2 yorum, yoksa boş metin. */
export function ProductReviewsPreview({
  reviews,
  onSeeAll,
}: {
  reviews: ProductReview[] | undefined;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const list = Array.isArray(reviews) ? reviews : [];
  return (
    <SectionCard title={t('review.reviews')} action={<SectionCardAction onPress={onSeeAll} />} testID="product-reviews">
      {list.slice(0, 2).map((review, i) => (
        <ReviewRow key={review.id} review={review} divided={i > 0} />
      ))}

      {list.length === 0 && (
        <EmptyState icon="star" title={t('profile.noReviews')} subtitle={t('emptyState.reviewsHint')} />
      )}
    </SectionCard>
  );
}
