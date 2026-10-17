import { useTranslation } from 'react-i18next';
import { discountsApi, type CreateDiscountPayload, type UpdateDiscountPayload } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';

/** Oluşturma (`id` yok, tam gövde) ya da güncelleme (`id` var, kısmi gövde + null). */
export type SaveDiscountVars =
  | { id?: undefined; payload: CreateDiscountPayload }
  | { id: string; payload: UpdateDiscountPayload };

/**
 * Oluştur/güncelle mutasyonu (`id` varsa PATCH). `useAppMutation`: liste
 * geçersiz kılma + başarı toast'ı + hata `toast.error` (sunucu mesajı, yoksa
 * `discount.saveFailed`). Form ayrı EKRAN olduğu için toast güvenli; ekran
 * hatada açık kalır, başarıda çağıran (`onSaved`) geri döner.
 */
export function useSaveDiscount({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  return useAppMutation(
    (vars: SaveDiscountVars) =>
      vars.id === undefined
        ? discountsApi.create(vars.payload)
        : discountsApi.update(vars.id, vars.payload),
    {
      invalidates: [qk.membership.discounts],
      success: (_res, vars) => t(vars.id ? 'discount.updated' : 'discount.created'),
      error: t('discount.saveFailed'),
      onSuccess: onSaved,
    },
  );
}
