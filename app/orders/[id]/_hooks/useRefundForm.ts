import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useZodForm } from '@/ui/form';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { MAX_EVIDENCE_PHOTOS } from '../_lib/status';
import { refundFormDefaults, refundRequestSchema, refundRequirements, type RefundFormValues } from '../_lib/schema';
import { pickEvidencePhotos } from '../_lib/pickEvidence';
import { useDoRefundRequest } from './useDoRefundRequest';
import { useUploadRefundEvidence } from './useUploadRefundEvidence';

/**
 * İade talebi EKRANININ controller'ı — eski `RefundRequestModal`'ın form mantığı
 * AYNEN (CLAUDE.md §12 "lift, rewrite değil"): `useZodForm` + şema, neden/adet/
 * kanıt alanları, galeri seçici, kanıt yükleme → talep. Payload ve doğrulama
 * `_lib/schema.ts`'te, değişmedi.
 *
 * Ekran farkı: istek boyunca ekran açık kalır (düğme yükleniyor); başarıda
 * geri çıkılır; kirli formla geri çıkışta onay (`useUnsavedChangesGuard`).
 */
export function useRefundForm(orderId: string, orderQuantity: number) {
  const { t } = useTranslation();
  const schema = useMemo(() => refundRequestSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: refundFormDefaults() });
  const guard = useUnsavedChangesGuard(form.formState.isDirty);
  const upload = useUploadRefundEvidence(orderId);
  const create = useDoRefundRequest(orderId, { onCreated: () => guard.leave(goBackOrHome) });
  const busy = upload.isPending || create.isPending;

  const reason = form.watch('reason');
  const quantity = form.watch('quantity');
  const evidence = form.watch('evidence');
  const { errors, isSubmitted } = form.formState;
  const requirements = refundRequirements(reason);

  // Gönderimden sonra hatalar canlı: neden değişince açıklama/kanıt kuralı da değişir.
  const setReason = (v: string) => {
    form.setValue('reason', v, { shouldDirty: true });
    if (isSubmitted) void form.trigger();
  };
  const setQuantity = (fn: (q: number) => number) =>
    form.setValue('quantity', fn(form.getValues('quantity')), { shouldDirty: true });
  const setEvidence = (next: RefundFormValues['evidence']) =>
    form.setValue('evidence', next, { shouldDirty: true, shouldValidate: isSubmitted });

  const pickEvidence = async () => {
    const current = form.getValues('evidence');
    const picked = await pickEvidencePhotos(MAX_EVIDENCE_PHOTOS - current.length);
    if (picked.length > 0) setEvidence([...current, ...picked]);
  };
  const removeEvidence = (index: number) => setEvidence(form.getValues('evidence').filter((_, i) => i !== index));

  const onSubmit = form.handleSubmit(async (values) => {
    // Başarısız ya da URL'siz bir yükleme hatası kanıt alanının altında görünür
    // ve talep GÖNDERİLMEZ (kanıtsız istek sunucudan `evidenceRequired` 400'ü alırdı).
    let evidencePhotoUrls: string[] = [];
    if (values.evidence.length > 0) {
      try {
        evidencePhotoUrls = await upload.mutateAsync(values.evidence);
      } catch {
        form.setError('evidence', { type: 'upload', message: t('order.evidenceUploadFailed') });
        return;
      }
      // Para akışı: yükleme sürerken "vazgeç?" onayı açıldıysa karar beklenir;
      // "Değişiklikleri Sil" seçildiyse / ekran kapandıysa talep GÖNDERİLMEZ.
      if (!(await guard.canProceed())) return;
    }
    create.mutate({ values, orderQuantity, evidencePhotoUrls });
  });

  return {
    form,
    reason,
    quantity,
    evidence,
    errors,
    requirements,
    setReason,
    setQuantity,
    pickEvidence,
    removeEvidence,
    onSubmit,
    busy,
  };
}

export type RefundFormController = ReturnType<typeof useRefundForm>;
