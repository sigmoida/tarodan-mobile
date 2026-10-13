/**
 * Liste uçlarının zarfını açar: gövde `{ data: [...] }` ya da doğrudan `[...]`
 * olabilir. Dizi değilse (hata gövdesi, null) `[]` döner — çağıran "boş liste"
 * ile "okunamadı"yı ayırt etmek zorunda kalmaz. Tek kaynak: hook'larda inline
 * `?.data ?? body` kopyası yazılmaz.
 */
export function unwrapList<T>(body: unknown): T[] {
  const data = (body as { data?: unknown } | null | undefined)?.data ?? body;
  return Array.isArray(data) ? (data as T[]) : [];
}
