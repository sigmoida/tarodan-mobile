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
          targetName={type === 'product' ? order.product?.title : order.seller?.displayName}
        />
      </PageShell>
    </Form>
  );
}
