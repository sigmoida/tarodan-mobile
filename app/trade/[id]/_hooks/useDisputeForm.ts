import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useZodForm } from '@/ui/form';
import { useFormScreenExit } from '@/hooks/useFormScreenExit';
import { useDisputeDraftStore } from '@/stores/disputeDraftStore';
import { disputeBody, disputeFormDefaults, disputeSchema } from '../_lib/schema';
import type { DisputeReason } from '../_lib/disputeReasons';
import { useDoRaiseDispute } from './useDoRaiseDispute';

/**
 * İtiraz EKRANININ controller'ı. Davranış eski modal akışıyla (A3) aynı:
 * - açıklama kırpılmış hâliyle < 10 karakterse istek gitmez, hata alanın altında;
 *   kullanıcı yazmaya başlayınca hata temizlenir;
 * - ekran her açılışta varsayılan nedenle başlar, açıklama TASLAKTAN gelir
 *   (`disputeDraftStore`) — çıkıp geri gelen yazdığını kaybetmez, onay da gerekmez;
 * - başarıda taslak silinir ve ekran kapanır; hatada metin korunur.
 */
export function useDisputeForm(tradeId: string) {
  const { t } = useTranslation();
  const setDraft = useDisputeDraftStore((s) => s.setDraft);
  const schema = useMemo(() => disputeSchema(t), [t]);
  const form = useZodForm(schema, {
    defaultValues: disputeFormDefaults(useDisputeDraftStore.getState().drafts[tradeId] ?? ''),
    // Hata yalnız gönderimde hesaplanır, yazarken temizlenir (aşağıdaki `watch`) — yeniden
    // doğrulama her tuşta hatayı geri getirirdi.
    reValidateMode: 'onSubmit',
  });
  // Taslak korunduğu için çıkışta onay yok (`dirty` = false); `leave` yalnız başarıda.
  const { leave } = useFormScreenExit(false);
  const raise = useDoRaiseDispute(tradeId, { onDone: leave });

  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name !== 'description') return;
      setDraft(tradeId, values.description ?? '');
      if (form.getFieldState('description').error) form.clearErrors('description');
    });
    return () => sub.unsubscribe();
  }, [form, setDraft, tradeId]);

  const reason = form.watch('reason');
  const setReason = (v: string) => form.setValue('reason', v as DisputeReason, { shouldDirty: true });
  const onSubmit = form.handleSubmit((values) => raise.mutate(disputeBody(values)));

  return { form, reason, setReason, onSubmit, isPending: raise.isPending };
}
