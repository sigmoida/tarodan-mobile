import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useTimingValues } from '@/hooks/useTimingPolicy';
import { OFFER_CONFIRM, type OfferConfirmKind } from '../_lib/accept';

/**
 * Geri alınamaz teklif işlemlerinden (kabul / reddet / iptal) ÖNCE onay (web
 * `useOfferAction.run` + `useConfirm`). Liste kartı ve detay ekranı aynı kanaldan geçer.
 *
 * ModalFreeze: `AlertDialogHost` düğmenin `onPress`'ini diyalog TAMAMEN kapandıktan sonra
 * çağırır (kök çözüm, bkz. `AlertDialog.tsx`); çağrı yerinde ayrıca gecikme gerekmez.
 *
 * O süre (onay basışı ile mutasyon başlangıcı arası) arayüz boş kalmasın diye `onSelect`
 * onay basıldığı AN çalışır: çağıran "bekliyor" durumunu (kart spinner'ı, devre dışı
 * düğmeler) hemen kurar, mutasyon bitince (`onSettled`) kaldırır.
 */
export function useConfirmOffer() {
  const { t } = useTranslation();
  const timing = useTimingValues();

  return useCallback(
    (kind: OfferConfirmKind, onConfirm: () => void, onSelect?: () => void) => {
      const { title, description, destructive } = OFFER_CONFIRM[kind];
      appAlert(t(title), t(description, timing), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: destructive ? 'destructive' : 'default',
          onSelect,
          onPress: onConfirm,
        },
      ]);
    },
    [t, timing],
  );
}
