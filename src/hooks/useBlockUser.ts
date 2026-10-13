import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';

/**
 * Engel sonrası tazelenecek query kökleri: engellenen kişinin ilanları
 * akış/vitrin/arama/benzer üründen, konuları mesaj listesinden, koleksiyonları
 * keşiften düşer; profil 404'e döner; sunucu iki yönlü takibi sildiği için
 * takip durumu/listesi de tazelenir. Web `useBlockUser` (`BLOCK_INVALIDATES`)
 * ile aynı küme — sözleşme: ana repo `docs/USER_BLOCKING.md`.
 */
const BLOCK_INVALIDATES = [
  qk.blocks.list,
  ['block-status'],
  qk.products.all,
  // `products.all` (`["products"]`) tekil detay anahtarını (`["product", id]`)
  // yakalamaz: engellemeden önce açılmış bir ilan sayfası önbellekten
  // görünmeye devam ediyordu — Apple'ın "akıştan anında kalksın" şartını tam
  // buradan deliyordu.
  qk.products.detailAll,
  qk.products.listingsAll,
  qk.products.searchAll,
  qk.products.featuredBusiness,
  qk.products.featuredCollector,
  qk.messaging.all,
  qk.seller.all,
  qk.seller.productsAll,
  qk.seller.collectionsAll,
  qk.collections.all,
  qk.collections.detailAll,
  qk.follow.following,
  qk.favorites.all,
  // Kategori/marka/üretici/model listeleri, arama önerileri, yorumlar ve puanlar
  // ham anahtarlarla (qk dışında) sorgulanıyor; kökleri burada — yoksa 5 dk
  // staleTime boyunca engellenenin içeriği görünmeye devam ediyordu (Apple 1.2).
  ['category-products'],
  ['brand-products'],
  ['manufacturer-products'],
  ['model-products'],
  ['product-unavailable-similar'],
  ['autocomplete-rich'],
  ['autocomplete-sellers'],
  ['liked-collections'],
  ['product-reviews'],
  ['product-reviews-all'],
  ['product-rating-stats'],
  ['seller-ratings'],
  qk.offers.all,
  qk.trades.all,
  qk.notifications.list,
] as const;

/**
 * Hedef kullanıcıyı engelledim mi? Yalnız giriş yapmış ve kendisi değilse sorar.
 * Backend: `GET /users/:id/block`.
 */
export function useBlockStatus(targetUserId?: string) {
  const { isAuthenticated, user } = useAuthStore();
  const enabled = !!targetUserId && !!isAuthenticated && user?.id !== targetUserId;

  const query = useQuery({
    queryKey: qk.blocks.status(targetUserId ?? ''),
    queryFn: async () => (await userApi.getBlockStatus(targetUserId!)).data.blocked,
    enabled,
  });

  return { isBlocked: query.data ?? false, isLoading: enabled && query.isLoading };
}

/**
 * Engelle / engeli kaldır — onay diyaloğu, bildirim ve invalidasyon TEK yerde
 * (CLAUDE.md §6: mutation hook'u snackbar + invalidateQueries sahibidir).
 * `requireAuth` verilmezse giriş kapısı çağıranın sorumluluğundadır.
 */
export function useBlockUser(options?: {
  requireAuth?: () => boolean;
  /** Engel konduktan sonra (ör. DM ekranından çıkmak için). */
  onBlocked?: () => void;
  onUnblocked?: () => void;
}) {
  const { t } = useTranslation();

  const invalidates = BLOCK_INVALIDATES as unknown as readonly (readonly unknown[])[];

  const blockMutation = useAppMutation(
    ({ userId }: { userId: string; name: string }) => userApi.block(userId),
    {
      invalidates,
      success: (_data, vars) => t('profile.blockedToast', { name: vars.name }),
      error: t('profile.blockFailed'),
      onSuccess: () => options?.onBlocked?.(),
    },
  );

  const unblockMutation = useAppMutation(
    ({ userId }: { userId: string; name?: string }) => userApi.unblock(userId),
    {
      invalidates,
      success: t('profile.unblockedToast'),
      error: t('profile.unblockFailed'),
      onSuccess: () => options?.onUnblocked?.(),
    },
  );

  /** Onay diyaloğu + engelleme. Diyalog kapanmadan mutation tetiklenmez. */
  const requestBlock = (userId: string, name: string) => {
    if (options?.requireAuth && !options.requireAuth()) return;
    appAlert(
      t('profile.blockConfirmTitle', { name }),
      t('profile.blockConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.block'),
          style: 'destructive',
          onPress: () => blockMutation.mutate({ userId, name }),
        },
      ],
      { cancelable: true },
    );
  };

  const requestUnblock = (userId: string, name?: string) => {
    if (options?.requireAuth && !options.requireAuth()) return;
    unblockMutation.mutate({ userId, name });
  };

  return {
    requestBlock,
    requestUnblock,
    pending: blockMutation.isPending || unblockMutation.isPending,
  };
}
