/**
 * Üretici adı → kimlik (saf yardımcı).
 *
 * İlan filtresi adla eşleştirildiğinde sunucudaki ad önbelleği yüzünden sonuç boş dönebilir;
 * `manufacturerId` ise yazımdan bağımsız. Yalnız adla gelen giriş noktaları (derin bağlantı,
 * push, hero, reklam: `/listings?manufacturer=Hot+Wheels`) `useListings` içinde bununla kimliğe
 * çevrilir. Eşleşme bulunamazsa ya da belirsizse `null` döner ve filtre ad ile devam eder.
 */

export interface ManufacturerRef {
  id: string;
  name: string;
  slug?: string | null;
}

/** "Hot Wheels" / "hotwheels" / "HOT-WHEELS" / "Hôt Wheels" aynı anahtara iner. */
function foldKey(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '');
}

const plain = (value: string) => value.trim().toLowerCase();

/**
 * Sıra: (1) tam ad eşleşmesi (büyük/küçük harf duyarsız, kırpılmış), (2) tam slug eşleşmesi,
 * (3) noktalama/aksan silerek birleştirilmiş anahtar — YALNIZ tek aday kalırsa. Birden çok farklı
 * üretici aynı anahtara iniyorsa (belirsiz) eşleme yapılmaz, `null` döner.
 */
export function findManufacturerId(
  name: string | null | undefined,
  manufacturers: readonly ManufacturerRef[] | null | undefined,
): string | null {
  const query = plain(name ?? '');
  if (!query || !manufacturers?.length) return null;

  const byName = manufacturers.find((m) => plain(m.name) === query);
  if (byName) return byName.id;

  const bySlug = manufacturers.find((m) => !!m.slug && plain(m.slug) === query);
  if (bySlug) return bySlug.id;

  const key = foldKey(query);
  if (!key) return null;
  const candidates = new Set(
    manufacturers
      .filter((m) => foldKey(m.name) === key || (!!m.slug && foldKey(m.slug) === key))
      .map((m) => m.id),
  );
  return candidates.size === 1 ? [...candidates][0]! : null;
}
