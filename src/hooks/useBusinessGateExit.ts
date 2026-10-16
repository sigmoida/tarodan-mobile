import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { navigateTo } from '@/lib/navigation/goTo';

type GatedBusinessStatus = 'pending' | 'rejected';

/**
 * Kurumsal başvuru kapı ekranından (`/business-pending`, `/business-rejected`) ÇIKIŞ.
 *
 * Soğuk açılış saklı kullanıcı görüntüsüyle açılır; görüntüdeki `businessStatus` bayat
 * olabilir (başvuru bu arada onaylandı). `BusinessMembershipGuard` görüntüye bakıp kapıya
 * kilitler, arka plan doğrulaması `approved` getirince guard'ın kapıdan çıkaran bir kuralı
 * yoktu ve ekranın kaydırma-geri hareketi kapalı (`gestureEnabled:false`) → kullanıcı
 * kapıda mahsur kalıyordu. Ekranın koşulu artık geçerli değilse ana sayfaya dönülür;
 * gerekiyorsa guard oradan doğru yere (ör. `/membership`) yönlendirir.
 *
 * Yalnız kapı ekranı ÖNDEYKEN çalışır: kapının üstüne açılan başvuru formu
 * (`/settings/business-application`) durum değişince altından kapatılmasın.
 * Oturum yokken (çıkış sürüyor/bitti) hiçbir şey yapmaz: çıkışın kendi login
 * yönlendirmesiyle yarışmasın.
 */
export function useBusinessGateExit(status: GatedBusinessStatus): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const gatePath = `/business-${status}`;

  useEffect(() => {
    if (!pathname.startsWith(gatePath)) return;
    if (!isAuthenticated || !user) return;
    const isBusinessAccount = !!(user.companyName && user.taxId);
    if (isBusinessAccount && user.businessStatus === status) return;
    navigateTo('/');
  }, [isAuthenticated, user, status, pathname, gatePath]);
}
