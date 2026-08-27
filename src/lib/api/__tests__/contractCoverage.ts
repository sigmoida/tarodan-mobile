/**
 * Sözleşme kapsaması yardımcıları. Gerekçe `contractCoverage.test.ts` başında.
 */

/**
 * Gövdedeki her YAPRAK alanın nokta yolu.
 *
 * - Dizi indisleri atlanır: `items[0].id` ve `items[1].id` tek bir `items.id`.
 *   Aksi halde üç elemanlı liste aynı alanı üç kez raporlardı.
 * - `null` taşıyan alan yine alandır: sunucu `rejectionReason: null` döndürüyordu
 *   ve alan VARDI — mobilde yoktu. Değere değil VARLIĞA bakıyoruz.
 * - Boş dizi alanın KENDİSİNİ üretir, iç şeklini değil: `feeDiscounts: []` her
 *   ölçümde boştu — alan var (mobil bildirmeli), iç satırın şekli ölçülemedi
 *   (oradan tip çıkarmak uydurmak olurdu).
 */
export function fieldPaths(body: unknown, prefix = ''): string[] {
  if (Array.isArray(body)) {
    return unique(body.flatMap((item) => fieldPaths(item, prefix)));
  }
  if (body && typeof body === 'object') {
    return unique(
      Object.entries(body as Record<string, unknown>).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const nested = fieldPaths(value, path);
        return nested.length > 0 ? nested : [path];
      }),
    );
  }
  return prefix ? [prefix] : [];
}

const unique = (xs: string[]) => [...new Set(xs)];

/** Yolun son parçası — tip dosyasında aranan ad. */
const leafOf = (path: string) => path.split('.').pop()!;

/**
 * Tip kaynağında adı geçmeyen ve allowlist'te olmayan alan yolları.
 *
 * Adın TAM yolunu değil YAPRAĞINI arıyoruz: tip dosyaları iç içe yapıları ayrı
 * `type` bildirimlerine bölüyor (`OrderQuotePricingSummary` gibi), tam yol
 * araması her iç içe tipte yanlış pozitif üretirdi.
 *
 * `_meta` fixture'ın kendi başlığı, sözleşmenin parçası değil.
 */
export function undeclaredFields(
  body: unknown,
  typeSource: string,
  allowlist: Set<string>,
): string[] {
  const declared = new Set(typeSource.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []);
  return fieldPaths(body)
    .filter((path) => !path.startsWith('_meta'))
    .filter((path) => !allowlist.has(path))
    .filter((path) => !declared.has(leafOf(path)))
    .sort();
}
