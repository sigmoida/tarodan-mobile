import { useAuthStore } from '@/stores/authStore';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * Üyeliğe bağlı özelliklere (takas, koleksiyon) erişim — TEK kaynak.
 *
 * `canTrade`: web `trades/new` ile aynı kural — sunucu limitleri yüklüyse onlar,
 * değilse üyelik kademesi. `canCreateCollections`: yalnız sunucu limiti.
 *
 * `show*Entry`: özelliğin GİRİŞ noktası (ürün sayfasındaki Takas düğmesi,
 * "Koleksiyona ekle", "Koleksiyon oluştur" kartları) gösterilsin mi?
 * - Satın almanın mümkün olduğu platformda her zaman: kapı ekranı yükseltmeye
 *   çağırır.
 * - iOS'ta (CAN_BUY_DIGITAL=false) yalnız yetkisi olana: yetkisiz kullanıcı
 *   "Bu özellik hesabınızda kullanılamıyor" çıkmazına ya da sunucunun
 *   "Üyeliğinizi yükseltin" mesajına düşüyordu (Apple 2.1 + 3.1.1).
 * - Misafire her zaman: giriş kapısı ilgili ekranda.
 */
export function useFeatureAccess() {
  const { isAuthenticated, user, limits } = useAuthStore();

  const canTrade =
    limits != null
      ? !!limits.canTrade
      : ['basic', 'premium', 'business'].includes((user?.membershipTier ?? '').toLowerCase());
  const canCreateCollections = !!limits?.canCreateCollections;

  const visible = (allowed: boolean) => CAN_BUY_DIGITAL || !isAuthenticated || allowed;

  return {
    canTrade,
    canCreateCollections,
    showTradeEntry: visible(canTrade),
    showCollectionEntry: visible(canCreateCollections),
  };
}
