import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discountsApi } from '@/lib/api';
import { qk } from '@/lib/query';

/**
 * Oluştur/güncelle mutasyonu (`id` varsa PATCH). Liste yenilemeyi (invalidate)
 * sahiplenir. Geri bildirim UI'da: form modalı açıkken `appAlert` iOS'u dondurur
 * (CLAUDE.md §12), bu yüzden başarı/hata çağıranın callback'lerinden modal içi
 * mesaj / modal kapatma ile gösterilir.
 */
export function useSaveDiscount({
  onSaved,
  onFailed,
}: {
  onSaved: (updated: boolean) => void;
  onFailed: (e: any) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      if (id) return discountsApi.update(id, payload);
      return discountsApi.create(payload as any);
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
      onSaved(!!vars.id);
    },
    onError: onFailed,
  });
}
