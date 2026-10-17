import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { tradesApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { useDisputeDraftStore } from '@/stores/disputeDraftStore';
import type { DisputeReason } from '../_lib/disputeReasons';

/**
 * Takas itirazı açar (itiraz EKRANI sahiplenir). Invalidation eskisiyle aynı
 * (detay + tüm takas listeleri). Başarı: taslak silinir, `onDone` (geri çıkışı başlatır) +
 * `toast.success`. Hata: `toast.error(sunucu mesajı | yedek)`, ekran ve taslak kalır.
 */
export function useDoRaiseDispute(tradeId: string, { onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const clearDraft = useDisputeDraftStore((s) => s.clearDraft);
  return useAppMutation(
    (body: { reason: DisputeReason; description: string }) => tradesApi.raiseDispute(tradeId, body),
    {
      invalidates: [qk.trades.detail(tradeId), qk.trades.all],
      error: () => t('trade.dispute.errorMessage'),
      onSuccess: () => {
        clearDraft(tradeId);
        onDone();
        toast.success(t('trade.dispute.successMessage'));
      },
    },
  );
}
