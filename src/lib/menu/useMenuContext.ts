import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMembershipTier } from '@/hooks/useMembershipTier';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import type { ProfileMenuContext } from './profileMenu';

/**
 * Menü bağlamı (koşullu satırlar) — Profil ve Ayarlar aynı kuralla:
 * - `isBusiness`: kurumsal hesap (companyName + taxId) → "Kurumsal Başvuru".
 * - `showMembership`: iOS'ta abonelik satılmıyor (Apple 2.1(b)); ücretsiz kullanıcı "Üyelik Planı"nı
 *   görmez, ücretli üye planını ve abonelik durumunu (salt görüntüleme) görür.
 * - `isBusinessTier`: efektif katman `business` → "İşletme Paneli".
 */
export function useMenuContext(): ProfileMenuContext {
  const user = useAuthStore((s) => s.user);
  const { effectiveTier, isPaidTier } = useMembershipTier();
  const isBusiness = !!(user?.companyName && user?.taxId);
  return useMemo(
    () => ({
      isBusiness,
      showMembership: CAN_BUY_DIGITAL || isPaidTier,
      isBusinessTier: effectiveTier.toLowerCase() === 'business',
    }),
    [isBusiness, isPaidTier, effectiveTier],
  );
}
