import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/ui';
import { Form } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { parseReviewType } from './_lib/reviewSchema';
import { useOrder } from './_hooks/useOrder';
import { useReviewForm } from './_hooks/useReviewForm';
import { ReviewFormFields } from './_components/ReviewFormFields';

/**
 * Sipariş değerlendirme — düz stack ekranı: `/orders/[id]/review?type=product|seller`
 * (liste ve detaydaki "Ürünü/Satıcıyı Değerlendir" iter). Eskiden `RatingModal`'dı.
 * Hedef (ürün adı / satıcı) sipariş sorgusundan; detaydan gelince önbellekte hazır.
 * Gönder alt çubukta; başarı geri çık + toast, hata toast.error (ekran kalır).
 * Bu taraf zaten puanlandıysa (`hasProductRating` / `hasSellerRating` — derin bağlantı,
 * bayat liste) form yerine bilgi durumu gösterilir.
 */
export default function OrderReviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; type?: string }>();
  const orderId = String(params.id);
  const type = parseReviewType(params.type);
  const { data: order, isLoading } = useOrder(orderId);
  const review = useReviewForm({
    type,
    orderId,
    productId: order?.product?.id,
    sellerId: order?.seller?.id,
  });
  const title = type === 'product' ? t('ratingModal.titleProduct') : t('ratingModal.titleSeller');
  const targetName = type === 'product' ? order?.product?.title : order?.seller?.displayName;
  const alreadyRated = type === 'product' ? !!order?.hasProductRating : !!order?.hasSellerRating;

  if (isLoading) return <PageShell title={title} loading />;
  if (!order) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'receipt-percent',
          title: t('order.orderNotFound'),
          subtitle: t('emptyState.notFoundHint'),
          actionLabel: t('common.goBack'),
          onAction: goBackOrHome,
        }}
      />
    );
  }

  if (alreadyRated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'star',
          title: t('order.reviewReceivedShort'),
          subtitle: targetName || title,
          actionLabel: t('common.goBack'),
          onAction: goBackOrHome,
          testID: 'review-already-rated',
        }}
      />
    );
  }

  return (
    <Form form={review.form}>
      <PageShell
        title={title}
        testID="order-review-screen"
        footer={
          <Button
            testID="review-submit-button"
            variant="primary"
            size="lg"
            fullWidth
            title={t('common.submit')}
            onPress={review.onSubmit}
            isLoading={review.isPending}
            disabled={!review.canSubmit}
          />
        }
      >
        <ReviewFormFields
          review={review}
          type={type}
          targetName={targetName}
        />
      </PageShell>
    </Form>
  );
}
