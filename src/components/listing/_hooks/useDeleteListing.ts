import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { alertAfterClose } from '@/ui';
import { productsApi, errorText, type ListingRemovalPayload } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { invalidateListingCaches } from '../_lib/invalidate';

/**
 * Düzenleme ekranından ilan silme — `DELETE /products/:id` (neden gövdede).
 * Önbellek invalidation'ı (İlanlarım ile ortak küme), kullanıcı yenileme ve
 * uyarının sahibidir; ekran elle `isSubmitting`/try-catch tutmaz (CLAUDE.md §6).
 *
 * `ListingRemovalModal` `onSubmit`'ten ÖNCE kapanır; yanıt hızlı gelirse kapanış
 * animasyonu sürerken `appAlert` açmak iOS'ta donmaya yol açar → uyarılar
 * `alertAfterClose` ile kapanma süresi geçince çıkar (kapatma işi bitmiş: `close` boş).
 * Hata metni `errorText`: sunucu `Accept-Language`e göre çevrilmiş `message`ı (i18nKey'li
 * hatalar dahil) döndürür; yoksa katalogdaki `listing.deleteFailed`.
 */
export function useDeleteListing(productId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshUserData = useAuthStore((s) => s.refreshUserData);

  return useMutation({
    mutationFn: (removal: ListingRemovalPayload) => productsApi.delete(productId!, removal),
    onSuccess: async () => {
      invalidateListingCaches(queryClient, productId);
      try {
        await refreshUserData();
      } catch {
        // Silme başarılı; kullanıcı yenilemesi başarısızsa "silinemedi" denmesin.
      }
      alertAfterClose(() => {}, t('listing.deletedTitle'), t('listing.deleted'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      alertAfterClose(() => {}, t('common.error'), errorText(err, t('listing.deleteFailed')));
    },
  });
}
