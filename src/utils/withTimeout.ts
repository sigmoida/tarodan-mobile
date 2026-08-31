/**
 * Bir promise'i süre sınırına bağlar. Süre dolarsa promise ÇÖZÜLÜR (reject
 * etmez) — çağıran "en iyi çaba" işlerde akışı sürdürebilsin diye.
 *
 * Neden var: `authStore.logout()` çıkışta iki ağ çağrısını await ediyor
 * (push token deaktivasyonu + /auth/logout). Bunlardan biri asılı kalırsa
 * çıkış hiç tamamlanmaz; bu, response interceptor'ın içinden çağrıldığında
 * axios'un reject'ini de bloklar ve arayüz sonsuz "yükleniyor" durumunda
 * kalır (31 Ağu 2026, Apple girişi — bkz. `publicAuthEndpoints401.test.ts`).
 *
 * Çıkış yerel tarafta zaten tamamlanıyor (SecureStore + store temizliği);
 * sunucuya haber vermek en iyi çaba işidir ve kullanıcıyı bekletmemelidir.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
