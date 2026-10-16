import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { readList } from '@/utils/apiEnvelope';
import {
  mapTiersToSettings,
  type MembershipDetails,
  type PlatformSettings,
} from '../_lib/membershipTiers';

/**
 * Üyelik ekranlarının (`/membership`, `/membership/plans`) sunucu verisi — iki sorgu.
 *
 * Eskiden `useState + useEffect + useFocusEffect` her odakta `setLoading(true)` yapıyordu: ekrana
 * her dönüşte iskelete düşüp yeniden çiziliyordu. Artık React Query: yükleme yalnız İLK açılışta,
 * dönüşte veri bayatsa arka planda sessizce tazelenir. Ödeme sonrası "mevcut plan" yine anında
 * güncellenir — başarı ekranı ve Abonelik Yönetimi `['membership']` önekini invalidate ediyor.
 *
 * - Üyelik: `qk.membership.details` — Abonelik Yönetimi ile AYNI anahtar ve AYNI açma kuralı
 *   (`data.data ?? data`), önbellek iki ekranda tutarlı.
 * - Kademeler/fiyatlar: `qk.membership.tiers` — üyelik checkout'uyla aynı anahtar ve ham liste
 *   (`readList`); ekran modeline (`PlatformSettings`) burada çevrilir. Fiyat/limit TEK KAYNAĞI
 *   DB MembershipTier (GET /membership/tiers) — backend tahsilatı + web ile birebir aynı.
 *
 * Biri düşerse diğeri yine gösterilir (eski `allSettled` davranışı); İKİSİ de hiç yüklenemezse
 * `loadFailed` → ekran ErrorState + yeniden dene.
 */
export function useMembershipData(enabled: boolean) {
  const membershipQuery = useQuery({
    queryKey: qk.membership.details,
    queryFn: async (): Promise<MembershipDetails | null> => {
      const response = await membershipApi.getCurrentMembership();
      return (response.data?.data ?? response.data ?? null) as MembershipDetails | null;
    },
    enabled,
  });

  const tiersQuery = useQuery({
    queryKey: qk.membership.tiers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- checkout ile aynı ham liste
    queryFn: async () => readList<any>(await membershipApi.getTiers()),
    enabled,
  });

  useRefetchStaleOnFocus([qk.membership.details, qk.membership.tiers], enabled);

  const tiers = tiersQuery.data;
  const settings: PlatformSettings = useMemo(() => (tiers ? mapTiersToSettings(tiers) : {}), [tiers]);

  const membershipFailed = membershipQuery.isError && membershipQuery.data === undefined;
  const tiersFailed = tiersQuery.isError && tiersQuery.data === undefined;

  return {
    membership: membershipQuery.data ?? null,
    settings,
    /** Yalnız ilk yükleme (önbellekte veri yokken); arka plan tazelemesi iskelete düşürmez. */
    isLoading: membershipQuery.isLoading || tiersQuery.isLoading,
    loadFailed: membershipFailed && tiersFailed,
    retry: () => {
      void membershipQuery.refetch();
      void tiersQuery.refetch();
    },
  };
}
