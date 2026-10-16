/**
 * İptal yardımcıları — yükleme kuyruğu ve görsel hazırlayıcı ortak kullanır.
 * RN'de `DOMException` yok; iptal, `name: 'AbortError'` taşıyan düz bir `Error`dur.
 */

/** axios (`CanceledError` / `ERR_CANCELED`) ve fetch (`AbortError`) iptal biçimleri. */
export const isAbortError = (error: unknown): boolean =>
  (error as { name?: string } | null)?.name === 'AbortError' ||
  (error as { name?: string } | null)?.name === 'CanceledError' ||
  (error as { code?: string } | null)?.code === 'ERR_CANCELED';

/** İptal hatası (RN'de `DOMException` yok). */
export function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/** `promise`'i iptalle yarıştır: sinyal gelince hemen `AbortError` ile reddeder. */
export function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort);
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}
