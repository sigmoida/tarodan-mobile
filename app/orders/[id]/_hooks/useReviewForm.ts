import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useZodForm } from '@/ui/form';
import { useAuthStore } from '@/stores/authStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { DEFAULT_REVIEW_MAX_CHARS, reviewFormDefaults, reviewSchema } from '../_lib/reviewSchema';
import { useDoReview, type ReviewTarget } from './useDoReview';

/**
 * Değerlendirme EKRANININ controller'ı: `useZodForm` (puan 1-5, başlık, yorum —
 * yorum üst sınırı üyelik limitinden), kirli formla geri çıkışta onay, gönderim.
 * Puan seçilmeden gönder kapalı (eski modalla aynı); şema da 0 puanı reddeder.
 */
export function useReviewForm(target: ReviewTarget) {
  const { t } = useTranslation();
  const limits = useAuthStore((s) => s.limits);
  const maxReviewChars = limits?.maxReviewChars || DEFAULT_REVIEW_MAX_CHARS;
  const schema = useMemo(() => reviewSchema(t, maxReviewChars), [t, maxReviewChars]);
  const form = useZodForm(schema, { defaultValues: reviewFormDefaults() });
  const guard = useUnsavedChangesGuard(form.formState.isDirty);
  const submit = useDoReview(target, { onDone: () => guard.leave(goBackOrHome) });

  const score = form.watch('score');
  const reviewLength = form.watch('review').length;
  const onSubmit = form.handleSubmit((values) => submit.mutate(values));

  return {
    form,
    score,
    reviewLength,
    maxReviewChars,
    /** Ücretsiz kademe (500) — Premium notu bunu okur. */
    isFreeTier: limits?.maxReviewChars === DEFAULT_REVIEW_MAX_CHARS,
    onSubmit,
    isPending: submit.isPending,
    canSubmit: score > 0 && !submit.isPending,
  };
}

export type ReviewFormController = ReturnType<typeof useReviewForm>;
