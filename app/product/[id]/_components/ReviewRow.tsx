import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { ReviewAuthorName } from '@/components/reviews/ReviewAuthorName';
import type { ProductReview } from '../_lib/types';

const { colors, spacing, typography, iconSize } = theme;

/** Tek değerlendirme satırı: yazar + yıldızlar, başlık, metin, tarih (önizleme ve tam liste ortak). */
export function ReviewRow({ review, divided }: { review: ProductReview; divided?: boolean }) {
  const { t } = useTranslation();
  const score = review.score ?? review.rating ?? 0;
  const reviewerName =
    review.user?.displayName ?? (review as any).userName ?? (review as any).reviewer?.displayName ?? t('common.user');
  const reviewText = review.review ?? review.comment;
  const dateStr = review.createdAt ?? review.date;
  return (
    <View style={[styles.review, divided && styles.divided]}>
      <View style={styles.header}>
        <ReviewAuthorName review={review as any} name={reviewerName} style={styles.reviewer} />
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= score ? 'star' : 'star-outline'}
              size={iconSize.sm}
              color={colors.warning[400]!}
            />
          ))}
        </View>
      </View>
      {review.title ? (
        <Text variant="bodySm" weight="bold">
          {review.title}
        </Text>
      ) : null}
      {reviewText ? <Text variant="bodySm">{reviewText}</Text> : null}
      {dateStr ? (
        <Text variant="caption" tone="muted">
          {new Date(dateStr).toLocaleDateString('tr-TR')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  review: { gap: spacing[1], paddingVertical: spacing[3] },
  divided: { borderTopWidth: 1, borderTopColor: colors.border.DEFAULT },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewer: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.heading },
  stars: { flexDirection: 'row', gap: spacing[0.5] },
});
