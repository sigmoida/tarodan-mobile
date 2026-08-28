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
 *
 * KAPSAMI — dürüst olması gereken iki sınır (fix round 1, inceleme buldu):
 *
 * 1. YALNIZ NESNE TİPİ HARFİYEN bildirimlerini okur. `type X = { a } | { b }`
 *    gibi bir BİRLEŞİM (union) verilirse yalnız İLK kolu okuyup SESSİZCE
 *    kalan kolları düşürmek yerine FIRLATIR — bkz. aşağıdaki kontrol. Bu
 *    guard'ın bütün güvenlik özelliği "beşinci bir tip eklemek BİLİNÇLİ,
 *    bilgili bir eylem olmalı" — bir birleşim tipini sessizce yarım okumak
 *    tam da bunun karşıtı: bakımcı bunu asla fark etmezdi. Bugün canlı DEĞİL
 *    (dört bağlı tipin hiçbiri birleşim değil) ama beşinci bir tip eklenirse
 *    canlı olabilir.
 * 2. YALNIZ DÜZ ÖZELLİKLERİ okur, METOD/callback ÜYELERİNİ değil. Derinlik
 *    sayacı yalnız `{`/`}` izler, `(`/`)` İZLEMEZ — `doThing(x: number): void`
 *    gibi bir metod üyesi verilirse parametre adı `x` sahte bir "alan" olarak
 *    sızar. Bilerek DÜZELTİLMEDİ (parantez takibi eklemek bu ayıklayıcının
 *    kapsamını genişletirdi, brief'in "redesign etme" talimatına aykırı
 *    düşerdi) — bunun yerine burada YAZILI bir sınır. Bugün canlı DEĞİL (dört
 *    bağlı tipin hiçbirinde metod üyesi yok) — metod üyesi olan bir tip
 *    eklenirse bu ayıklayıcının MENZİLİ DIŞINDA kalır.
 */
export function extractTypeFields(source: string, typeName: string): string[] {
  const stripped = stripComments(source);
  const declaration = new RegExp(`\\b(?:type|interface)\\s+${typeName}\\b[^{]*\\{`).exec(
    stripped,
  );
  if (!declaration) return [];
  const bodyStart = declaration.index + declaration[0].length;
  // Açılış parantezinden ÖNCEki başlıkta bir `|` — `type X = Foo | { ... }`
  // gibi bir birleşimin başka bir kolu — sessizce yalnız nesne-harfiyen kolu
  // okumak yerine burada durdurur.
  const head = declaration[0].slice(0, -1);
  if (head.includes('|')) {
    throw new Error(
      `extractTypeFields('${typeName}'): bildirim bir '|' içeriyor — bu ayıklayıcı yalnız NESNE TİPİ HARFİYEN bildirimlerini okur, BİRLEŞİM (union) tiplerini değil.`,
    );
  }
  let depth = 1;
  let bodyEnd = bodyStart;
  for (; bodyEnd < stripped.length && depth > 0; bodyEnd++) {
    if (stripped[bodyEnd] === '{') depth++;
    else if (stripped[bodyEnd] === '}') depth--;
  }
  // Kapanış parantezinden HEMEN SONRA (boşluk atlanarak) bir `|` — `type X =
  // { a } | { b }` gibi ilk kolu doğru okuyup KALAN kolları sessizce düşürmek
  // yerine burada durdurur.
  const afterBody = /^\s*(\S)/.exec(stripped.slice(bodyEnd));
  if (afterBody && afterBody[1] === '|') {
    throw new Error(
      `extractTypeFields('${typeName}'): bildirim bir BİRLEŞİM (union) tipinin yalnız İLK kolu — bu ayıklayıcı yalnız NESNE TİPİ HARFİYEN bildirimlerini okur, BİRLEŞİM tiplerini değil.`,
    );
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
