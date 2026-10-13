import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appAlert, runAfterModalClose } from '@/ui';
import { useTimingValues } from '@/hooks/useTimingPolicy';
import { OFFER_CONFIRM, type OfferConfirmKind } from '../_lib/accept';

/**
 * Geri alınamaz teklif işlemlerinden (kabul / reddet / iptal) ÖNCE onay (web
 * `useOfferAction.run` + `useConfirm`). Liste kartı ve detay ekranı aynı kanaldan geçer.
 *
 * ModalFreeze: `AlertDialogHost.close()` `onPress`'i diyalog kapanırken AYNI tick'te
 * çağırır; mutasyon hemen başlarsa hızlı bir hatanın `appAlert`'i, iOS'ta henüz
 * kapanmakta olan diyaloğun üstüne yeni bir modal açıp ekranı dondurur. Bu yüzden
 * `onConfirm` modal kapanma süresi (`MODAL_CLOSE_DELAY_MS`) KADAR GECİKTİRİLİR.
 */
export function useConfirmOffer() {
  const { t } = useTranslation();
  const timing = useTimingValues();

  return useCallback(
    (kind: OfferConfirmKind, onConfirm: () => void) => {
      const { title, description, destructive } = OFFER_CONFIRM[kind];
      appAlert(t(title), t(description, timing), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: destructive ? 'destructive' : 'default',
          onPress: () => runAfterModalClose(onConfirm),
        },
      ]);
    },
    [t, timing],
  );
}
