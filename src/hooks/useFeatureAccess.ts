import { useAuthStore } from '@/stores/authStore';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * Üyeliğe bağlı özelliklere (takas, koleksiyon) erişim — TEK kaynak.
 *
 * `canTrade`: web `trades/new` ile aynı kural — sunucu limitleri yüklüyse onlar,
 * değilse üyelik kademesi. `canCreateCollections`: yalnız sunucu limiti.
 *
 * Takas girişi (ürün sayfasındaki "Takas Teklifi" düğmesi + "Takas" rozeti) üyelik kapısına BAĞLI DEĞİL:
 * takasa açık ve satın alınabilir ilanda herkese görünür (web ile aynı); yetkisiz kullanıcı düğmeye
 * basınca bilgilendirme dialog'u görür (`canTrade` ile karar verilir), satın alma/yükseltme düğmesi yok.
 *
 * `showCollectionEntry`: "Koleksiyona ekle", "Koleksiyon oluştur" kartları gösterilsin mi?
 * - Satın almanın mümkün olduğu platformda her zaman: kapı ekranı yükseltmeye
 *   çağırır.
 * - Satın alma kapalıyken (CAN_BUY_DIGITAL=false: iOS VE Android) yalnız
 *   yetkisi olana: yetkisiz kullanıcı "Bu özellik hesabınızda kullanılamıyor"
 *   çıkmazına ya da sunucunun "Üyeliğinizi yükseltin" mesajına düşüyordu
 *   (Apple 2.1 + 3.1.1; Play ödeme politikası).
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
    showCollectionEntry: visible(canCreateCollections),
  };
}
