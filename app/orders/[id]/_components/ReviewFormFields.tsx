import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Controller } from 'react-hook-form';
import { SectionCard, Text, theme, Icon } from '@/ui';
import { FormInput } from '@/ui/form';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import {
  REVIEW_SCORES,
  REVIEW_TITLE_MAX,
  SCORE_LABEL_KEY,
  SELLER_CRITERIA_KEYS,
  type ReviewType,
} from '../_lib/reviewSchema';
import type { ReviewFormController } from '../_hooks/useReviewForm';

const { colors, spacing, minTouchTarget } = theme;
const STAR_SIZE = 40;

/** 1-5 yıldız. Her yıldız ≥ 44pt dokunma hedefi (40 ikon + iç boşluk). */
function StarRatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.stars} accessibilityRole="radiogroup">
      {REVIEW_SCORES.map((star) => {
        const on = star <= value;
        return (
          <Pressable
            key={star}
            testID={`review-star-${star}`}
            onPress={() => onChange(star)}
            style={styles.starButton}
            accessibilityRole="radio"
            accessibilityState={{ checked: star === value }}
            accessibilityLabel={`${star} — ${t(SCORE_LABEL_KEY[star]!)}`}
            android_ripple={{ color: colors.gray[200], borderless: true }}
          >
            <Icon
              name="star"
              variant={on ? 'solid' : 'outline'}
              size={STAR_SIZE}
              color={on ? colors.warning[500]! : colors.text.subtle}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Değerlendirme ekranının alanları (eski `RatingModal` gövdesi): hedef adı, yıldızlar +
 * puan metni, başlık (yalnız ürün), yorum + karakter sayacı, satıcı kriterleri.
 * Gönder düğmesi ekranın alt çubuğunda.
 */
export function ReviewFormFields({
  review,
  type,
  targetName,
}: {
  review: ReviewFormController;
  type: ReviewType;
  targetName?: string;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard>
      {targetName ? (
        <Text variant="body" weight="semibold" tone="primary" align="center" style={styles.target}>
          {targetName}
        </Text>
      ) : null}

      <View style={styles.starsBlock}>
        <Text variant="bodySm" tone="muted">
          {t('profile.rating')}
        </Text>
        <Controller
          control={review.form.control}
          name="score"
          render={({ field }) => <StarRatingInput value={field.value} onChange={field.onChange} />}
        />
        <Text testID="review-score-label" variant="bodySm" tone="muted">
          {t(SCORE_LABEL_KEY[review.score] ?? 'ratingModal.selectRating')}
        </Text>
      </View>

      {type === 'product' ? (
        <FormInput
          name="title"
          testID="review-title-input"
          label={t('review.titleOptional')}
          maxLength={REVIEW_TITLE_MAX}
          containerStyle={styles.input}
        />
      ) : null}

      <FormInput
        name="review"
        testID="review-text-input"
        label={t('ratingModal.reviewLabelOptional')}
        multiline
        numberOfLines={4}
        maxLength={review.maxReviewChars}
        containerStyle={styles.input}
        inputStyle={{ minHeight: 96 }}
      />
      <View style={styles.charCount}>
        <Text variant="caption" tone="muted" align="right">
          {t('ratingModal.charCount', { current: review.reviewLength, max: review.maxReviewChars })}
        </Text>
        {/* iOS'ta ücretli kademe satılmıyor (Apple 2.1(b)/3.1.3) — Premium notu yok. */}
        {CAN_BUY_DIGITAL && review.isFreeTier ? (
          <Text variant="caption" tone="primary" align="right">
            {t('ratingModal.premiumCharLimitNote')}
          </Text>
        ) : null}
      </View>

      {type === 'seller' ? (
        <View style={styles.criteria}>
          <Text variant="caption" tone="muted">
            {t('ratingModal.criteriaTitle')}
          </Text>
          {SELLER_CRITERIA_KEYS.map((key) => (
            <Text key={key} variant="bodySm" tone="heading">
              {`• ${t(key)}`}
            </Text>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  target: { marginBottom: spacing[4] },
  starsBlock: { alignItems: 'center', gap: spacing[2], marginBottom: spacing[6] },
  stars: { flexDirection: 'row', gap: spacing[1] },
  starButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    padding: spacing[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { marginBottom: spacing[2] },
  charCount: { marginBottom: spacing[4] },
  criteria: { gap: spacing[1] },
});
