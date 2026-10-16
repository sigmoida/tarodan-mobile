/**
 * Üretici adı → kimlik (saf yardımcılar).
 *
 * İlan filtresi adla eşleştirildiğinde sunucudaki ad önbelleği yüzünden ("Hot Wheels" yazımı,
 * büyük/küçük harf, boşluk) sonuç boş dönebilir; `manufacturerId` ise yazımdan bağımsız. Ana sayfa /
 * kategoriler / üreticiler dokunuşları zaten kimlik gönderiyor; yalnız adla gelen yollar
 * (reklam linki, akıllı arama) burada kimliğe çevrilir. Üretici listesi bulunamazsa ya da ad
 * eşleşmezse sorgu OLDUĞU GİBİ (yalnız ad) kalır — gezinme hiçbir zaman bu yüzden bozulmaz.
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

/** Ham önbellek verisini (`unknown`) güvenli üretici listesine çevirir. */
export function asManufacturerList(raw: unknown): ManufacturerRef[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : [];
  return list.filter(
    (m): m is ManufacturerRef =>
      !!m &&
      typeof (m as ManufacturerRef).id === 'string' &&
      typeof (m as ManufacturerRef).name === 'string',
  );
}

/** Ada (ya da slug'a) göre üretici kimliği; bulunamazsa `null`. */
export function findManufacturerId(
  name: string | null | undefined,
  manufacturers: readonly ManufacturerRef[] | null | undefined,
): string | null {
  const key = foldKey(name ?? '');
  if (!key || !manufacturers?.length) return null;
  const hit =
    manufacturers.find((m) => foldKey(m.name) === key) ??
    manufacturers.find((m) => !!m.slug && foldKey(m.slug) === key);
  return hit?.id ?? null;
}

function decodeParam(value: string): string {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

/**
 * `/listings?manufacturer=Hot+Wheels` gibi bir rota/sorgu dizesine, adla eşleşen üretici
 * bulunursa `manufacturerId` ekler. Zaten `manufacturerId` varsa, `manufacturer` yoksa ya da
 * ad listede yoksa girdi DEĞİŞMEDEN döner. Sorgunun geri kalanı (sıra, diğer filtreler,
 * `#fragment`) korunur.
 */
export function withManufacturerId(
  route: string,
  manufacturers: readonly ManufacturerRef[] | null | undefined,
): string {
  const qIndex = route.indexOf('?');
  if (qIndex < 0) return route;
  const hashIndex = route.indexOf('#', qIndex);
  const queryEnd = hashIndex < 0 ? route.length : hashIndex;
  const query = route.slice(qIndex + 1, queryEnd);

  let name: string | null = null;
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    const key = decodeParam(eq < 0 ? pair : pair.slice(0, eq));
    if (key === 'manufacturerId') return route;
    if (key === 'manufacturer' && eq >= 0) name = decodeParam(pair.slice(eq + 1));
  }

  const id = findManufacturerId(name, manufacturers);
  if (!id) return route;
  return `${route.slice(0, queryEnd)}&manufacturerId=${encodeURIComponent(id)}${route.slice(queryEnd)}`;
}
