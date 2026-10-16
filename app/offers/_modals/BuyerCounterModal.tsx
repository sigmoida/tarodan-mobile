import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Text } from '@/ui';
import { useZodForm, Form, FormInput } from '@/ui/form';
import { usePriceLimits } from '@/hooks/usePriceLimits';
import { buyerOfferFloor } from '@/lib/shared/priceLimits';
import { buyerCounterSchema } from '../_lib/schema';
import { formatPrice } from '../_lib/status';
import { useDoBuyerCounter } from '../_hooks/useDoBuyerCounter';
import type { Offer } from '../_lib/types';

/**
 * Alıcının, satıcının karşı teklifinden DAHA DÜŞÜK teklifi. Kendi form +
 * mutation'ını taşır; ekran sadece açar/kapatır.
 */
export function BuyerCounterModal({
  offer,
  onClose,
}: {
  offer: Offer | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const refAmount = Number(offer?.amount) || 0;

  // Admin fiyat tabanı: karşı teklif min(taban, ilan fiyatı) altına inemez (taban ilan fiyatından küçükse).
  const { minPrice } = usePriceLimits();
  const floor = buyerOfferFloor(minPrice, Number(offer?.product?.price) || 0);

  const schema = useMemo(() => buyerCounterSchema(refAmount, t, floor), [refAmount, t, floor]);
  const form = useZodForm(schema, { defaultValues: { amount: '' } });
  const buyerCounter = useDoBuyerCounter();

  useEffect(() => {
    if (offer) form.reset({ amount: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.id]);

  const onSubmit = form.handleSubmit(({ amount }) => {
    if (!offer) return;
    // Modalı ÖNCE kapat: appAlert bir ui-native Modal açıkken çağrılırsa iOS donar.
    // [[mobile-modal-freeze-and-modalmessage-primitive]]
    onClose();
    buyerCounter.mutate({ id: offer.id, amount: Number(amount) });
  });

  return (
    <Modal
      isOpen={!!offer}
      onClose={onClose}
      title={t('offer.lowerOffer')}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          cancelLabel={t('trade.dispute.cancelCta')}
          confirmLabel={t('common.submit')}
        />
      }
    >
      <Form form={form}>
        <Text variant="bodySm" tone="muted">
          {t('offer.sellerCounterSubtitle', {
            amount: offer ? formatPrice(refAmount) : '—',
          })}
        </Text>
        <FormInput
          name="amount"
          placeholder={t('offer.newAmountPlaceholderTl')}
          keyboardType="numeric"
          autoFocus
        />
      </Form>
    </Modal>
  );
}
