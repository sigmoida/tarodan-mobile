// Sipariş değerlendirme (ürün / satıcı puanı) formunun zod şeması + gövde kurucuları (colocated).
import type { TFunction } from 'i18next';
import { z } from 'zod';
import type { MessageKey } from '@/i18n/lib/generated/keys';

/** `?type=` — hangi taraf puanlanıyor. Bilinmeyen değer ürün sayılır. */
export type ReviewType = 'product' | 'seller';
export const parseReviewType = (v: unknown): ReviewType => (v === 'seller' ? 'seller' : 'product');

export const REVIEW_SCORES = [1, 2, 3, 4, 5] as const;
export const REVIEW_TITLE_MAX = 100;
/** Üyelik limiti gelmezse yorum üst sınırı (ücretsiz kademe). */
export const DEFAULT_REVIEW_MAX_CHARS = 500;

/** Puan → etiket (0 = henüz seçilmedi). */
export const SCORE_LABEL_KEY: Record<number, MessageKey> = {
  0: 'ratingModal.selectRating',
  1: 'ratingModal.scoreVeryBad',
  2: 'ratingModal.scoreBad',
  3: 'ratingModal.scoreAverage',
  4: 'ratingModal.scoreGood',
  5: 'ratingModal.scoreExcellent',
};

/** Satıcı puanının kriterleri (bilgi listesi). */
export const SELLER_CRITERIA_KEYS: readonly MessageKey[] = [
  'ratingModal.criteriaProductAccuracy',
  'ratingModal.criteriaCommunication',
  'ratingModal.criteriaShipping',
  'ratingModal.criteriaTradeFairness',
];

/** Yorum uzunluğu üyelik limitine bağlı → şema fabrikası. */
export function reviewSchema(t: TFunction, maxReviewChars: number) {
  return z.object({
    score: z.number().int().min(1, t('ratingModal.selectRating')).max(5),
    title: z.string().max(REVIEW_TITLE_MAX),
    review: z.string().max(maxReviewChars),
  });
}

export type ReviewFormValues = z.input<ReturnType<typeof reviewSchema>>;

export const reviewFormDefaults = (): ReviewFormValues => ({ score: 0, title: '', review: '' });

/** `POST /ratings/products` gövdesi — boş başlık/yorum gönderilmez (eski modalla aynı). */
export const productRatingBody = (v: ReviewFormValues, orderId: string, productId: string) => ({
  productId,
  orderId,
  score: v.score,
  title: v.title || undefined,
  review: v.review || undefined,
});

/** `POST /ratings/users` gövdesi — satıcı puanı, yorum `comment` alanında. */
export const sellerRatingBody = (v: ReviewFormValues, orderId: string, sellerId: string) => ({
  receiverId: sellerId,
  orderId,
  score: v.score,
  comment: v.review || undefined,
});
