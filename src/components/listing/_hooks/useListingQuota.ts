import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';

import type { ListingLimits } from '../_lib/types';

type QuotaUser = { membershipTier?: string | null } | null | undefined;
type StatsBody =
  | {
      limits?: { tierName?: string; tierType?: string };
      summary?: { max?: number; used?: number; remaining?: number; canCreate?: boolean };
    }
  | null
  | undefined;

/** `GET /products/my/stats` gövdesi → kota kartı. Varsayılanlar eski `updateListingLimits` ile aynı. */
function toListingLimits(stats: StatsBody): ListingLimits {
  const tierName = stats?.limits?.tierName || 'Free';
  const tierType = stats?.limits?.tierType || 'free';
  return {
    currentCount: stats?.summary?.used || 0,
    maxListings: stats?.summary?.max || 10,
    canCreateListing: stats?.summary?.canCreate ?? true,
    isPremium: tierType === 'premium' || tierType === 'business',
    membershipTier: tierName,
    remainingListings: stats?.summary?.remaining || 0,
  };
}

/**
 * İlan oluşturma kota kartı (yalnız yeni ilan). React Query: eskiden açılışta `refreshUserData()`
 * BİTTİKTEN sonra bir kez, ardından `[user, limits]` efektiyle (kullanıcı tazelenince) İKİNCİ kez
 * sırayla `/products/my/stats` çekiliyordu (+ `_t` önbellek kırıcı). Artık tek sorgu: kullanıcı
 * tazelemesiyle paralel, `staleTime: 0` ile her açılışta taze; anahtar üyelik imzasını taşır →
 * aynı üyelikle gelen kullanıcı tazelemesi yeniden sormaz, yükseltme sorar. İlan yazımları
 * `myListingsStats` önekini invalidate ettiği için oluşturma sonrası da kendiliğinden tazelenir.
 */
export function useListingQuota({
  enabled,
  user,
  limits,
}: {
  enabled: boolean;
  user: QuotaUser;
  limits: { maxListings?: number | null } | null | undefined;
}) {
  const tier = `${user?.membershipTier ?? ''}:${limits?.maxListings ?? ''}`;
  const query = useQuery({
    queryKey: qk.products.myListingQuota(tier),
    queryFn: async () => toListingLimits((await api.get('/products/my/stats')).data as StatsBody),
    enabled,
    staleTime: 0,
    // Üyelik imzası değişince kart "yükleniyor"a düşmesin; yeni yanıt gelene dek eskisi kalır.
    placeholderData: (previous) => previous,
    // Eski davranış: tek deneme; hata → aşağıdaki yedek kart (kullanıcı bloklanmaz).
    retry: false,
  });

  // Stats çekilemezse: yanıltıcı sayı GÖSTERME ve kullanıcıyı BLOKLAMA.
  // (user.listingCount ömür-boyu toplamdır, kotayı yanlış şişirir.) Sunucu POST'ta zaten doğrular.
  const membershipTier = user?.membershipTier || 'free';
  const fallback = useMemo<ListingLimits>(
    () => ({
      currentCount: 0,
      maxListings: -1,
      canCreateListing: true,
      isPremium: membershipTier === 'premium' || membershipTier === 'business',
      membershipTier,
      remainingListings: -1,
    }),
    [membershipTier],
  );

  const listingLimits: ListingLimits | null = query.data ?? (query.isError ? fallback : null);
  return {
    listingLimits,
    // Eski davranış: ilk yanıt gelene dek (oturum yokken de) `true`.
    limitsLoading: query.isPending,
  };
}
