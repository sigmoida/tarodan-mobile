import { queryClient } from '../lib/queryClient';
import { clearAllPaymentCapabilities, unbindPaymentCapabilityAccount } from '@/lib/payment/paymentCapability';
import { useCartStore } from './cartStore';
import { useMessagesStore } from './messagesStore';
import { useDisputeDraftStore } from './disputeDraftStore';
import { usePendingAuthEmailStore } from './pendingAuthEmailStore';
import { clearUserSnapshot } from './userSnapshot';

/**
 * Çıkışın kaynağı: `user` = kullanıcının kendi çıkışı (profil, ban/onay
 * ekranları); `accountDeleted` = hesap silindi (kendi çıkışı gibi temizlenir,
 * sunucuya istek atılmaz); `forced` = oturum düştü (401 → refresh olmadı,
 * `client.ts` → `handleAuthFailure`).
 */
export type LogoutReason = 'user' | 'accountDeleted' | 'forced';

/**
 * Çıkışta kullanıcıya özel tüm yerel state'i sıfırlar; yoksa rozetler
 * (favori/sepet/mesaj/bildirim sayıları) ve sepet içeriği önceki oturumdan
 * kalmış gibi görünmeye devam eder.
 *
 * Dikkat: favoriler için clearFavorites() ÇAĞRILMAZ — o DELETE /wishlist ile
 * sunucudaki listeyi de siler. Favori listesi artık React Query cache'inde;
 * aşağıdaki queryClient.clear() onu da (yerel olarak) temizler.
 */
export function resetUserStores(reason: LogoutReason = 'user'): void {
  // Sepet: persist'li store — clearCart AsyncStorage'a da boş yazar.
  useCartStore.getState().clearCart();
  useCartStore.getState().clearBuyNow();

  // #77: mesaj server-state'i artık React Query'de (qk.messaging.*) — queryClient.clear()
  // aşağıda onu da temizler. Store yalnız client state tutar (aktif thread).
  useMessagesStore.setState({
    currentThreadId: null,
  });

  // Takas itirazı taslakları kullanıcıya özel — sonraki oturuma kalmasın.
  useDisputeDraftStore.getState().clearAll();

  // Doğrulama akışından kalan bellek içi e-posta (PII) sonraki oturuma kalmasın.
  usePendingAuthEmailStore.getState().setEmail(null);

  // Bildirim + mesaj rozeti dahil tüm react-query önbelleği (örn. 'notifications-unread').
  queryClient.clear();

  // Açılışın saklı kullanıcı görüntüsü (PII: e-posta, vergi no) — token'lar zaten silindi;
  // ortak cihazda önceki hesabın bilgisi kalmasın. En iyi çaba, fırlatmaz.
  void clearUserSnapshot();

  // Ödeme yetki belirteçleri (`payment-capability.*`) yalnız kullanıcının KENDİ
  // çıkışında silinir: ortak cihazda çıkan kullanıcının belirteci sonraki
  // oturumda kalmasın. Zorunlu çıkışta (401) silinmez — 3DS sürerken başka bir
  // isteğin 401'i süren ödemeyi düşürmesin, A yeniden girince sürsün — ama kimlik
  // misafire döner: her belirteç sahibini taşıdığı için A'nınki misafir oturumunda
  // eklenmez. Başka bir hesapla girişte `bindPaymentCapabilitiesToAccount` siler.
  // Hesap silme de kullanıcının kendi çıkışıdır: belirteçler silinir.
  if (reason === 'forced') unbindPaymentCapabilityAccount();
  else void clearAllPaymentCapabilities();
}

/**
 * Girişte sunucu önbelleğini yeni oturuma göre sıfırlar. Misafirken çekilen
 * listeler aksi halde staleTime (5 dk) boyunca ekranda kalır; canlıdaki test
 * şeridi hesabı (App Review) canlı ilanları göremediği için o listelerdeki bir
 * ilana dokunmak `404 Ürün bulunamadı` verir.
 *
 * `clear()` değil `resetQueries()`: giriş ekranının altında ana sayfa mounted
 * kalıyor; `clear()` ekrandaki eski veriyi bırakırdı, `resetQueries()` ise
 * veriyi atıp açık sorguları yeni token'la hemen yeniden çeker. Sepet
 * (zustand) bilinçli olarak dokunulmadan kalır — misafir sepeti girişte korunur.
 */
export function resetServerStateForNewSession(): Promise<void> {
  return queryClient.resetQueries();
}
