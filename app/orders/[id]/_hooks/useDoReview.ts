import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { ratingsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { productRatingBody, sellerRatingBody, type ReviewFormValues, type ReviewType } from '../_lib/reviewSchema';

export interface ReviewTarget {
  type: ReviewType;
  orderId: string;
  /** Siparişten gelir; sipariş yüklenene kadar yok (gönder o sırada çizilmez). */
  productId?: string;
  sellerId?: string;
}

/**
 * Ürün ya da satıcı puanı gönderir (değerlendirme EKRANI sahiplenir). Eski
 * `RatingModal`'ın iki mutasyonu tek hook'ta, `type` ile seçilir; uç noktalar ve
 * gövdeler aynı. Invalidation eskisinin üst kümesi: sipariş listeleri + detay
 * (`hasProductRating`/`hasSellerRating`), puanlanan ürün/satıcı ve yorum listeleri.
 * Başarı: `onDone` (geri çıkışı başlatır) + `toast.success` (kök katmanda, navigasyonu aşar); hata `toast.error`, ekran kalır.
 */
export function useDoReview(target: ReviewTarget, { onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { type, orderId } = target;
  const productId = target.productId ?? '';
  const sellerId = target.sellerId ?? '';
  const invalidates =
    type === 'product'
      ? [qk.products.detail(productId), qk.products.reviews(productId), qk.products.ratingStats(productId)]
      : [qk.seller.detail(sellerId), qk.seller.ratings(sellerId), qk.seller.ratingStats(sellerId)];

  return useAppMutation(
    (values: ReviewFormValues) =>
      type === 'product'
        ? ratingsApi.createProductRating(productRatingBody(values, orderId, productId))
        : ratingsApi.createUserRating(sellerRatingBody(values, orderId, sellerId)),
    {
      invalidates: [qk.orders.all, qk.orders.detail(orderId), ...invalidates],
      error: t('ratingModal.submitFailed'),
      onSuccess: () => {
        onDone();
        toast.success(t('order.reviewReceived'));
      },
    },
  );
}
