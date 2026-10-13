import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discountsApi, type CreateDiscountPayload, type UpdateDiscountPayload } from '@/lib/api';
import { qk } from '@/lib/query';

/**
 * Oluştur/güncelle mutasyonu (`id` varsa PATCH). Liste yenilemeyi (invalidate)
 * sahiplenir. Geri bildirim UI'da: form modalı açıkken `appAlert` iOS'u dondurur
 * (CLAUDE.md §12), bu yüzden başarı/hata çağıranın callback'lerinden modal içi
 * mesaj / modal kapatma ile gösterilir.
 */
/** Oluşturma (`id` yok, tam gövde) ya da güncelleme (`id` var, kısmi gövde + null). */
export type SaveDiscountVars =
  | { id?: undefined; payload: CreateDiscountPayload }
  | { id: string; payload: UpdateDiscountPayload };

export function useSaveDiscount({
  onSaved,
  onFailed,
}: {
  onSaved: (updated: boolean) => void;
  onFailed: (e: any) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SaveDiscountVars) =>
      vars.id === undefined
        ? discountsApi.create(vars.payload)
        : discountsApi.update(vars.id, vars.payload),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
      onSaved(!!vars.id);
    },
    onError: onFailed,
  });
}
