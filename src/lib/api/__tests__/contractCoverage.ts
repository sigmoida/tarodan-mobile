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
 * `//` satır yorumlarını ve blok yorumlarını kaynaktan atar.
 *
 * `declared` seti yorumları da tarardı: bir alan adı yalnız bir JSDoc
 * CÜMLESİNDE geçiyorsa (kod olarak bildirilmemiş olsa da) "bildirilmiş"
 * sayılıyordu — `useMembershipLimits.ts`'in "sunucu şu 13 alanı döndürüyor"
 * diyen JSDoc'u dokuz alanı böyle sızdırıyordu (bkz. `MEMBERSHIP_TYPE_SOURCES`
 * yorumu). Yorumları atmak allowlist'in "her satır bir karar" sözleşmesini
 * düz yazının atlamasını engeller.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

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
  const declared = new Set(stripComments(typeSource).match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []);
  return fieldPaths(body)
    .filter((path) => !path.startsWith('_meta'))
    .filter((path) => !allowlist.has(path))
    .filter((path) => !declared.has(leafOf(path)))
    .sort();
}

/**
 * Tip kaynağında BİLDİRİLEN ama ÖLÇÜLEN hiçbir gövdede görünmeyen adlar.
 *
 * `undeclaredFields`'ın tersi: orada gövde tipe göre taranır, burada tip
 * gövdelere göre taranır. Amaç ayrı bir hata sınıfı — istemcinin sunucunun
 * hiç göndermediği bir adı ARAMASI (`limits.maxListings === -1` derken sunucu
 * `maxTotalListings` gönderiyor, `maxListings` hiç yok; `payload.qrCode`
 * derken sunucu `qrCodeImage` gönderiyor).
 *
 * "Hiçbirinde" kasıtlı: bir gövdede eksik olmak normaldir (`cancelledAt` iptal
 * edilmemiş bir siparişte yok) — TÜM ölçülen gövdelerin HİÇBİRİNDE olmayan bir
 * ad farklı bir şey, sunucu hiç göndermiyor ya da göndermeyi bırakmış demektir.
 *
 * `stripComments` burada da uygulanır — aynı gerekçeyle (bkz. `undeclaredFields`
 * yorumu): düz yazı bir bildirim SAYILMAMALI.
 *
 * SINIRI: yalnız TİPTE bildirilen adları görür. `any`'ye okunan bir alan
 * (`payload.qrCode` gibi) hiçbir tipte geçmediği için bu fonksiyona hiç
 * girmez — o sınıf kaynak taraması ister, bu araç onu KAPSAMAZ.
 */
export function declaredButAbsent(
  typeSource: string,
  bodies: unknown[],
  allowlist: Set<string>,
): string[] {
  const declared = new Set(stripComments(typeSource).match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []);
  const presentLeaves = new Set(
    bodies.flatMap((body) => fieldPaths(body).map((path) => leafOf(path))),
  );
  return [...declared].filter((name) => !presentLeaves.has(name) && !allowlist.has(name)).sort();
}
