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
 * Adı verilen bir `type`/`interface` bildiriminin KENDİ blok gövdesinden alan
 * adlarını çıkarır — dosyanın geri kalanından (import'lar, fonksiyonlar,
 * axios yüzeyi, başka tiplerin alanları) değil.
 *
 * İlk deneme `declaredButAbsent`'ı doğrudan bütün `*_TYPE_SOURCES`
 * dosyalarına karşı çalıştırmıştı — `undeclaredFields`'ın `declared` setiyle
 * AYNI geniş kimlik taraması. O yön için (bir alan adının dosyanın HERHANGİ
 * bir yerinde geçip geçmediği) güvenliydi; TERS yönde (bir tip alanının
 * ÖLÇÜLEN gövdede geçip geçmediği) felaketti — dosyalar axios metod adlarını,
 * store eylemlerini, İLGİSİZ uçların tiplerini de "bildiriyordu", yedi
 * domainin YEDİSİ de 40 satır eşiğini (74-285 arası) katladı. Bu fonksiyon o
 * dersin sonucu: yalnız TEK, adı VERİLMİŞ bir tipin kendi alanlarını döndürür
 * — o tipe REFERANS veren bir alan varsa (`summary?: OrderQuotePricingSummary`)
 * yalnız `summary` sayılır, `OrderQuotePricingSummary`'nin alanları değil
 * (onlar ayrı bir çağrıyla, kendi adlarıyla istenir). Blok içinde satır içi
 * `{ ... }` (iç içe nesne tipi) varsa onun içindeki adlar da bu yüzden
 * ATLANIR — yalnız tipin KENDİ üst düzeyi.
 *
 * `stripComments` yorumları atar — aynı gerekçeyle (bkz. `undeclaredFields`
 * yorumu): düz yazı bir bildirim SAYILMAMALI.
 */
export function extractTypeFields(source: string, typeName: string): string[] {
  const stripped = stripComments(source);
  const declaration = new RegExp(`\\b(?:type|interface)\\s+${typeName}\\b[^{]*\\{`).exec(
    stripped,
  );
  if (!declaration) return [];
  const bodyStart = declaration.index + declaration[0].length;
  let depth = 1;
  let bodyEnd = bodyStart;
  for (; bodyEnd < stripped.length && depth > 0; bodyEnd++) {
    if (stripped[bodyEnd] === '{') depth++;
    else if (stripped[bodyEnd] === '}') depth--;
  }
  const body = stripped.slice(bodyStart, bodyEnd - 1);
  const names: string[] = [];
  let localDepth = 0;
  const tokenRe = /([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:|[{}]/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(body))) {
    if (m[0] === '{') {
      localDepth++;
    } else if (m[0] === '}') {
      localDepth--;
    } else if (localDepth === 0) {
      names.push(m[1]);
    }
  }
  return unique(names);
}

/**
 * BİLDİRİLEN (bir tipin kendi alan adları) ama ÖLÇÜLEN hiçbir gövdede
 * görünmeyen adlar.
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
 * `declaredFieldNames` YALNIZ `extractTypeFields`'ın döndürdüğü adlardan
 * gelmeli — bir dosyanın tüm kimliklerinden DEĞİL (bkz. `extractTypeFields`
 * yorumu, bu ayrımın neden var olduğu). Kapsamı BİLEREK dar: yeni bir tip
 * eklemek (beşinci bir `extractTypeFields` çağrısı) her zaman BİLİNÇLİ, elle
 * bir karar olmalı — guard kendiliğinden genişlemez, bu onu dürüst tutan şey.
 *
 * Varlığı `fieldPaths`'ın YAPRAKLARINA değil, gövdedeki HER anahtar adına
 * bakarak ölçer (`presentFieldNames`, altta). `fieldPaths` kasıtlı olarak iç
 * içe bir konteynerin adını DÜŞÜRÜR — `pricing: { summary: {...} }` iken
 * yaprak yolu `pricing.summary.total` olur, `pricing` ya da `summary` KENDİSİ
 * hiç yaprak olarak görünmez (bkz. `fieldPaths` yorumu). `OrderQuoteResponse.
 * pricing` gibi bir alan tam olarak böyle bir konteyner — yalnız yapraklara
 * bakılsaydı GERÇEKTEN dolu bir gövdede bile "yok" diye yanlış işaretlenirdi.
 * Bu yüzden burada AYRI bir tarayıcı var: her derinlikteki HER anahtarı sayar.
 *
 * SINIRI: yalnız TİPTE bildirilen adları görür. `any`'ye okunan bir alan
 * (`payload.qrCode` gibi) hiçbir tipte geçmediği için `extractTypeFields`'a
 * hiç girmez — o sınıf kaynak taraması ister, bu araç onu KAPSAMAZ.
 */
export function declaredButAbsent(
  declaredFieldNames: string[],
  bodies: unknown[],
  allowlist: Set<string>,
): string[] {
  const presentNames = new Set(bodies.flatMap((body) => presentFieldNames(body)));
  return declaredFieldNames
    .filter((name) => !presentNames.has(name) && !allowlist.has(name))
    .sort();
}

/** Gövdedeki HER anahtar adı, derinlik ve yaprak/konteyner ayrımı olmadan. */
function presentFieldNames(body: unknown): string[] {
  if (Array.isArray(body)) {
    return unique(body.flatMap((item) => presentFieldNames(item)));
  }
  if (body && typeof body === 'object') {
    return unique(
      Object.entries(body as Record<string, unknown>).flatMap(([key, value]) => [
        key,
        ...presentFieldNames(value),
      ]),
    );
  }
  return [];
}
