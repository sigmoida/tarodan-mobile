import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { styles } from '../_lib/styles';
import type { OfferDetailController } from '../_hooks/useOfferDetail';
import { FirstToPayNote } from '../../_components/FirstToPayNote';

/** Statü/role-göre aksiyonlar — satıcı kabul/karşı/red, alıcı iptal. Self-gates. */
export function OfferDetailActions({ f }: { f: OfferDetailController }) {
  const { t } = useTranslation();
  const { offer, isPending, isSeller, isBuyer, counterMutation, accepting, rejecting, cancelling } = f;
  if (!offer) return null;

  return (
    <>
      <FirstToPayNote offer={offer} isSeller={isSeller} timing={f.timing} />

      {isPending && isSeller ? (
        <View style={styles.actionsStack}>
          <Button
            variant="success"
            onPress={f.requestAccept}
            isLoading={accepting}
            disabled={accepting || rejecting || counterMutation.isPending}
            fullWidth
          >
            {t('offer.acceptOffer')}
          </Button>
          <Button
            variant="outline"
            onPress={f.openCounter}
            disabled={accepting || rejecting || counterMutation.isPending}
            fullWidth
          >
            {t('offer.counterOfferCta')}
          </Button>
          <Button
            variant="danger"
            onPress={f.requestReject}
            isLoading={rejecting}
            disabled={accepting || rejecting || counterMutation.isPending}
            fullWidth
          >
            {t('offer.rejectOffer')}
          </Button>
        </View>
      ) : null}

      {/* Karşı teklif (buyerMustAccept) geldiyse iptal hakkı kalkar; alıcı listeden kabul/red/yeni teklif verir */}
      {isPending && isBuyer && !offer.buyerMustAccept ? (
        <Button variant="danger" onPress={f.requestCancel} isLoading={cancelling} disabled={cancelling} fullWidth>
          {t('trade.cancel.offerCta')}
        </Button>
      ) : null}
    </>
  );
}
