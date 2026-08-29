import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Input, Text, theme } from '@/ui';
import { styles } from '../_lib/styles';
import type { OfferDetailController } from '../_hooks/useOfferDetail';

const { colors } = theme;

/** Karşı teklif tutarı modalı — validasyon controller'ın submitCounter'ında. */
export function CounterDialog({ f }: { f: OfferDetailController }) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={f.counterDialog}
      onClose={() => f.setCounterDialog(false)}
      title={t('offer.counterOffer')}
    >
      <Text style={{ marginBottom: theme.spacing[3], color: colors.text.muted }}>
        {t('offer.enterCounterAmountBody')}
      </Text>
      <Input
        label={t('offer.amountPlaceholderTL')}
        value={f.counterAmount}
        onChangeText={f.setCounterAmount}
        keyboardType="numeric"
      />
      <View style={styles.dialogActions}>
        <Button variant="ghost" onPress={() => f.setCounterDialog(false)}>
          {t('trade.dispute.cancelCta')}
        </Button>
        <Button
          variant="primary"
          onPress={f.submitCounter}
          isLoading={f.counterMutation.isPending}
          disabled={f.counterMutation.isPending || f.counterValue <= 0}
        >
          {t('common.submit')}
        </Button>
      </View>
    </Modal>
  );
}
