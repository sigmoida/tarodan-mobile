import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button, theme } from '@/ui';
import { useZodForm, Form, FormInput } from '@/ui/form';
import { buyerCounterSchema } from '../_lib/schema';
import { formatPrice } from '../_lib/status';
import { useDoBuyerCounter } from '../_hooks/useDoBuyerCounter';
import type { Offer } from '../_lib/types';

const { spacing, colors, typography } = theme;

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

  const schema = useMemo(() => buyerCounterSchema(refAmount, t), [refAmount, t]);
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
    <Modal isOpen={!!offer} onClose={onClose} title={t('offer.lowerOffer')}>
      <Form form={form}>
        <Text style={styles.subtitle}>
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
        <View style={styles.actions}>
          <Button variant="secondary" onPress={onClose} title={t('trade.dispute.cancelCta')} />
          <Button
            variant="primary"
            onPress={onSubmit}
            isLoading={buyerCounter.isPending}
            title={t('common.submit')}
          />
        </View>
      </Form>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
});
