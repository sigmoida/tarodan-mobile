import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@/ui';
import { styles } from '../_lib/styles';
import type { OfferDetailController } from '../_hooks/useOfferDetail';
import { FirstToPayNote } from '../../_components/FirstToPayNote';

const { colors } = theme;

/** Statü/role-göre aksiyonlar — satıcı kabul/karşı/red, alıcı iptal. Self-gates. */
export function OfferDetailActions({ f }: { f: OfferDetailController }) {
  const { t } = useTranslation();
  const { offer, isPending, isSeller, isBuyer, acceptMutation, rejectMutation, cancelMutation, counterMutation } = f;
  if (!offer) return null;

  return (
    <>
      <View style={styles.noteWrap}>
        <FirstToPayNote offer={offer} isSeller={isSeller} timing={f.timing} />
      </View>

      {isPending && isSeller ? (
        <View style={styles.actionsStack}>
          <Button
            variant="success"
            onPress={f.requestAccept}
            isLoading={acceptMutation.isPending}
            disabled={acceptMutation.isPending || rejectMutation.isPending || counterMutation.isPending}
            icon="checkmark"
            fullWidth
            style={styles.actionBtn}
          >
            {t('offer.acceptOffer')}
          </Button>
          <Button
            variant="outline"
            onPress={f.openCounter}
            disabled={counterMutation.isPending}
            icon="swap-horizontal"
            fullWidth
            style={{ ...styles.actionBtn, borderColor: colors.info[600]! }}
            textStyle={{ color: colors.info[600]! }}
          >
            {t('offer.counterOfferCta')}
          </Button>
          <Button
            variant="outline"
            onPress={f.requestReject}
            disabled={rejectMutation.isPending}
            icon="close"
            fullWidth
            style={{ ...styles.actionBtn, borderColor: colors.danger[600]! }}
            textStyle={{ color: colors.danger[600]! }}
          >
            {t('offer.rejectOffer')}
          </Button>
        </View>
      ) : null}

      {/* Karşı teklif (buyerMustAccept) geldiyse iptal hakkı kalkar; alıcı listeden kabul/red/yeni teklif verir */}
      {isPending && isBuyer && !offer.buyerMustAccept ? (
        <Button
          variant="outline"
          onPress={f.requestCancel}
          isLoading={cancelMutation.isPending}
          icon="trash-outline"
          fullWidth
          style={{ ...styles.actionBtn, borderColor: colors.danger[600]!, margin: theme.spacing[4] }}
          textStyle={{ color: colors.danger[600]! }}
        >
          {t('trade.cancel.offerCta')}
        </Button>
      ) : null}
    </>
  );
}
