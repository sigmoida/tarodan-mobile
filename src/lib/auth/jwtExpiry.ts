/**
 * Access token'ın (JWT) `exp` alanından son geçerlilik anı (ms). İmza DOĞRULANMAZ — yalnız
 * istemci tarafı "bu token'la bağlanmaya değer mi" kararı içindir. Çözülemeyen / `exp`'siz
 * token → `null` (bilinmiyor; çağıran eski davranışı sürdürür).
 */
export function jwtExpiresAtMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token `skewMs` içinde (ya da zaten) dolmuş mu. Bilinmiyorsa `false`. */
export function isJwtExpired(token: string, skewMs = 0, now: number = Date.now()): boolean {
  const exp = jwtExpiresAtMs(token);
  return exp !== null && exp - now <= skewMs;
}
