import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '../stores/authStore';
import { theme, Text, Button, Modal, Input, Textarea } from '@/ui';

const { colors } = theme;

interface RatingModalProps {
  visible: boolean;
  onDismiss: () => void;
  type: 'product' | 'seller';
  orderId: string;
  productId?: string;
  sellerId?: string;
  productTitle?: string;
  sellerName?: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  visible,
  onDismiss,
  type,
  orderId,
  productId,
  sellerId,
  productTitle,
  sellerName,
  onSuccess,
}: RatingModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { limits } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');

  // Character limit for free members
  const maxReviewChars = limits?.maxReviewChars || 500;

  // Product rating mutation
  const productRatingMutation = useMutation({
    mutationFn: async () => {
      return api.post('/ratings/products', {
        productId,
        orderId,
        score: rating,
        title: title || undefined,
        review: review || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
      handleClose();
    },
  });

  // Seller rating mutation
  const sellerRatingMutation = useMutation({
    mutationFn: async () => {
      return api.post('/ratings/users', {
        receiverId: sellerId,
        orderId,
        score: rating,
        comment: review || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
      handleClose();
    },
  });

  const handleSubmit = () => {
    if (rating === 0) return;

    if (type === 'product') {
      productRatingMutation.mutate();
    } else {
      sellerRatingMutation.mutate();
    }
  };

  const handleClose = () => {
    setRating(0);
    setTitle('');
    setReview('');
    onDismiss();
  };

  const isPending = productRatingMutation.isPending || sellerRatingMutation.isPending;
  const error = productRatingMutation.error || sellerRatingMutation.error;

  return (
    <Modal
      isOpen={visible}
      onClose={handleClose}
      title={type === 'product' ? t('ratingModal.titleProduct') : t('ratingModal.titleSeller')}
    >
      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
        {/* Target info */}
        <Text style={styles.targetInfo}>
          {type === 'product' ? productTitle : sellerName}
        </Text>

        {/* Star Rating */}
        <View style={styles.starsContainer}>
          <Text style={styles.label}>{t('profile.rating')}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? colors.warning[500]! : colors.text.subtle}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 && t('ratingModal.selectRating')}
            {rating === 1 && t('ratingModal.scoreVeryBad')}
            {rating === 2 && t('ratingModal.scoreBad')}
            {rating === 3 && t('ratingModal.scoreAverage')}
            {rating === 4 && t('ratingModal.scoreGood')}
            {rating === 5 && t('ratingModal.scoreExcellent')}
          </Text>
        </View>

        {/* Title (Product only) */}
        {type === 'product' && (
          <Input
            label={t('review.titleOptional')}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            containerStyle={styles.input}
          />
        )}

        {/* Review */}
        <Textarea
          label={t('ratingModal.reviewLabelOptional')}
          value={review}
          onChangeText={(text: string) => setReview(text.slice(0, maxReviewChars))}
          rows={4}
          containerStyle={styles.input}
        />
        <View style={styles.charCountContainer}>
          <Text style={styles.charCount}>
            {t('ratingModal.charCount', { current: review.length, max: maxReviewChars })}
          </Text>
          {limits?.maxReviewChars === 500 && (
            <Text style={styles.charLimitNote}>
              {t('ratingModal.premiumCharLimitNote')}
            </Text>
          )}
        </View>

        {/* Rating Criteria (for seller) */}
        {type === 'seller' && (
          <View style={styles.criteriaSection}>
            <Text style={styles.criteriaTitle}>
              {t('ratingModal.criteriaTitle')}
            </Text>
            <View style={styles.criteriaItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success[600]!} />
              <Text style={styles.criteriaText}>{t('ratingModal.criteriaProductAccuracy')}</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success[600]!} />
              <Text style={styles.criteriaText}>{t('ratingModal.criteriaCommunication')}</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success[600]!} />
              <Text style={styles.criteriaText}>{t('ratingModal.criteriaShipping')}</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success[600]!} />
              <Text style={styles.criteriaText}>{t('ratingModal.criteriaTradeFairness')}</Text>
            </View>
          </View>
        )}

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>
            {(error as any).response?.data?.message || t('ratingModal.submitFailed')}
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button variant="ghost" title={t('common.cancel')} onPress={handleClose} disabled={isPending} />
        <Button
          variant="primary"
          title={t('common.submit')}
          onPress={handleSubmit}
          isLoading={isPending}
          disabled={rating === 0 || isPending}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 480,
  },
  targetInfo: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing[4],
    color: colors.primary[600]!,
  },
  starsContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  label: {
    marginBottom: theme.spacing[2],
    color: colors.text.muted,
  },
  stars: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  starButton: {
    padding: theme.spacing[1],
  },
  ratingText: {
    marginTop: theme.spacing[2],
    fontSize: 14,
    color: colors.text.muted,
  },
  input: {
    marginBottom: theme.spacing[2],
  },
  charCountContainer: {
    marginBottom: theme.spacing[4],
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.text.muted,
  },
  charLimitNote: {
    textAlign: 'right',
    fontSize: 11,
    color: colors.primary[600]!,
  },
  criteriaSection: {
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  criteriaTitle: {
    marginBottom: theme.spacing[2],
    color: colors.text.muted,
    fontSize: 12,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  criteriaText: {
    marginLeft: theme.spacing[2],
    fontSize: 13,
    color: colors.text.heading,
  },
  errorText: {
    textAlign: 'center',
    color: colors.danger[600]!,
    marginBottom: theme.spacing[2],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
});
