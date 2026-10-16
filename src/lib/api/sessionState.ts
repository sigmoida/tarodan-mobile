/**
 * İstemci oturum durumu — TEK kaynak, bağımlılıksız (axios interceptor'ı `./client` ve
 * `authStore` ikisi de buradan okur; `@/lib/api` barrel'ı test mock'larında kısmi taklit
 * edildiği için store bu modülü DOĞRUDAN import eder).
 *
 * 1) Oturum kuşağı (`sessionEpoch`). Token'ları yazan / silen ya da oturumu değiştiren her
 *    yol (giriş, çıkış, zorunlu çıkışın yedek temizliği, doğrulanmamış oturumun atılması)
 *    kuşağı ilerletir. Uçuştaki refresh yazımdan önce, store'un arka plan profil doğrulaması
 *    da sonucunu uygulamadan önce kuşağı karşılaştırır. Eskiden iki ayrı sayaç vardı
 *    (`client.sessionEpoch` + `authStore.authGeneration`); farklı yerlerde artıyorlardı ve
 *    `handleAuthFailure`'ın yedek temizliği yalnız token'ları silip hiçbirini ilerletmiyordu.
 *
 * 2) Ertelenmiş (doğrulanmamış) oturum. Açılışta oturum GEÇİCİ bir hatayla doğrulanamadıysa
 *    (görüntüsüz eski kurulum çevrimdışı, 5xx, anahtar zinciri kilitli) token'lar SecureStore'da
 *    KALIR ("çevrimdışı açılış çıkış yaptırmaz") ama arayüz misafirdir. Bu sürede:
 *    - istekler Authorization TAŞIMAZ — misafir görünen ekranlar (sepet, favoriler) gerçek
 *      hesaba yazmasın;
 *    - böyle bir isteğin 401'i refresh / zorunlu çıkış / login yönlendirmesi tetiklemez;
 *    - yalnız oturumu yeniden deneyen açılış isteği (`SESSION_PROBE`) token'ı taşır; onun
 *      refresh'i kesin reddedilirse oturum SESSİZCE atılır (yönlendirme yok — kullanıcı zaten
 *      misafir görüyordu, misafir sepeti/verisi korunur).
 *    Oturum doğrulanınca (`applyProfile`) ya da giriş/çıkışta bayrak kalkar.
 */

let sessionEpoch = 0;
let sessionDeferred = false;

/** Oturum değişti (giriş / çıkış / token'lar silindi) — uçuştaki her refresh ve profil yanıtı bayatlar. */
export function advanceSessionEpoch(): void {
  sessionEpoch += 1;
}

export function getSessionEpoch(): number {
  return sessionEpoch;
}

export function setSessionDeferred(deferred: boolean): void {
  sessionDeferred = deferred;
}

/** Token'lar saklı ama oturum doğrulanmadı (arayüz misafir) mı? */
export function isSessionDeferred(): boolean {
  return sessionDeferred;
}

/**
 * Ertelenmiş oturumu yeniden deneyen istek: bayrak açıkken de Bearer taşır ve 401'inde
 * refresh denenir. `userApi.getProfile(SESSION_PROBE)`.
 */
export const SESSION_PROBE = { _sessionProbe: true } as const;

/**
 * Banlı kullanıcı yönlendirmesi (`/banned`) bu oturumda yapıldı mı? Aynı anda dönen birden çok
 * USER_BANNED 403'ü ekranı tekrar tekrar açmasın diye. Her giriş ve çıkışta sıfırlanır
 * (`authStore`) — yoksa sonraki bir oturum (ban kalktıktan sonra ya da başka hesap) bir daha
 * hiç yönlendirilmezdi.
 */
let bannedRedirectActive = false;

/** Ban yönlendirmesini bu oturum için üstlenir: ilk çağrı `true`, sıfırlanana dek sonrakiler `false`. */
export function claimBannedRedirect(): boolean {
  if (bannedRedirectActive) return false;
  bannedRedirectActive = true;
  return true;
}

/** Giriş / çıkış (ve ban ekranından çıkış): sonraki oturum yeniden yönlendirilebilsin. */
export function resetBannedRedirect(): void {
  bannedRedirectActive = false;
}

/** YALNIZ TEST. */
export function resetSessionStateForTests(): void {
  sessionEpoch = 0;
  sessionDeferred = false;
  bannedRedirectActive = false;
}
