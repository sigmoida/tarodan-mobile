import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '@/ui';
import { useZodForm, Form, FormInput } from '@/ui/form';
import { sellerCounterSchema } from '../_lib/schema';
import { useDoCounterOffer } from '../_hooks/useDoCounterOffer';
import type { Offer } from '../_lib/types';

/** Satıcının karşı teklifi. Kendi form + mutation'ını taşır; ekran sadece açar/kapatır. */
export function CounterOfferModal({
  offer,
  onClose,
}: {
  offer: Offer | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const refAmount = Number(offer?.amount) || 0;
  const maxPrice = Number(offer?.product?.price) || 0;

  const schema = useMemo(
    () => sellerCounterSchema(refAmount, maxPrice, t),
    [refAmount, maxPrice, t],
  );
  const form = useZodForm(schema, { defaultValues: { amount: '' } });
  const counter = useDoCounterOffer();

  // Modal her açıldığında (offer değişince) formu sıfırla.
  useEffect(() => {
    if (offer) form.reset({ amount: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.id]);

  const onSubmit = form.handleSubmit(({ amount }) => {
    if (!offer) return;
    // Modalı ÖNCE kapat: mutation'ın appAlert'ı (başarı/hata) bir ui-native Modal
    // açıkken çağrılırsa iOS donar. [[mobile-modal-freeze-and-modalmessage-primitive]]
    onClose();
    counter.mutate({ id: offer.id, amount: Number(amount) });
  });

  return (
    <Modal
      isOpen={!!offer}
      onClose={onClose}
      title={t('offer.counterOffer')}
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
        <FormInput
          name="amount"
          label={t('offer.enterCounterAmount')}
          placeholder={t('offer.amountPlaceholderTl')}
          keyboardType="numeric"
          autoFocus
        />
      </Form>
    </Modal>
  );
}
