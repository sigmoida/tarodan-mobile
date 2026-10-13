import { useTranslation } from 'react-i18next';
import { Button, Modal, Input, Text, theme } from '@/ui';
import type { OfferDetailController } from '../_hooks/useOfferDetail';

/** Karşı teklif tutarı modalı — validasyon controller'ın submitCounter'ında. */
export function CounterDialog({ f }: { f: OfferDetailController }) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={f.counterDialog}
      onClose={() => f.setCounterDialog(false)}
      title={t('offer.counterOffer')}
      footer={
        <>
          <Button
            variant="primary"
            onPress={f.submitCounter}
            isLoading={f.counterMutation.isPending}
            disabled={f.counterMutation.isPending || f.counterValue <= 0}
            fullWidth
          >
            {t('common.submit')}
          </Button>
          <Button variant="outline" onPress={() => f.setCounterDialog(false)} fullWidth style={{ marginTop: theme.spacing[2] }}>
            {t('trade.dispute.cancelCta')}
          </Button>
        </>
      }
    >
      <Text variant="bodySm" tone="muted" style={{ marginBottom: theme.spacing[3] }}>
        {t('offer.enterCounterAmountBody')}
      </Text>
      <Input
        label={t('offer.amountPlaceholderTL')}
        value={f.counterAmount}
        onChangeText={f.setCounterAmount}
        keyboardType="numeric"
      />
    </Modal>
  );
}
