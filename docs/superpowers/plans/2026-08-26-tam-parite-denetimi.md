# Tam parite denetimi — Plan A (denetim)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana repo ile mobil arasındaki parite farklarını, sunucunun DTO'suz/iç içe alanlarını da yakalayan bir yöntemle çıkarmak ve makinece denetlenebilir bir boşluk listesine dönüştürmek.

**Architecture:** Ölçülmüş staging gövdeleri fixture olarak repoya girer. Bir sözleşme-kapsama testi her fixture'ın alan adlarını ilgili `src/lib/api/<domain>.ts` dosyasına karşı tarar; tanımlanmamış her alan ya **bilinen boşluk** listesinde gerekçesiyle durur ya da test düşer. Böylece denetim tek seferlik bir rapor değil, kalıcı bir bekçi olur; Plan B'nin her task'ı bu listeden bir satır siler.

**Tech Stack:** TypeScript, Jest (jest-expo), staging REST API (`https://staging.tarodan.com.tr/api`), `curl` + `jq` ölçüm için.

**Spec:** `docs/superpowers/specs/2026-08-26-tam-parite-denetimi-design.md`

## Global Constraints

- **Bir task yeşil olup commit'lenmeden sonraki başlamaz.** Commit biriktirme yok.
- Her task'ın kapısı: `npx tsc --noEmit` temiz → `npx eslint . --ext .ts,.tsx` **0 error** → `npx jest` tam paket yeşil.
- Ölçüm kapısı: bir alan hakkında kod yazmadan önce staging'den ölçülür. Ölçüm göstermiyorsa madde "backend bekliyor"a taşınır, tip yazılmaz.
- Fixture'lar PII taşımaz: e-posta, telefon, adres, ad-soyad alanları ölçüm anında `jq walk` filtresiyle `REDACTED`'a çevrilir (filtre Task 1 Step 8'de).
- Demo hesabı: `ahmet@demo.com` / `Demo123!`. Access token ömrü **900 sn** — ölçüm uzarsa yenile.
- Test dosyalarının yorumları Türkçe, kod İngilizce (repo deseni).
- Bu plan denetimdir; **hiçbir ürün davranışı değiştirilmez**. Davranış değişiklikleri Plan B'ye aittir.
- **i18n göçü duruyor.** Aynı ekranın metnini ve davranışını aynı anda değiştirmek diff'i okunmaz yapıyor ve bir regresyonun kaynağını belirsizleştiriyor. Denetim + Plan B bitince sürer.
- Rapordaki `<...>` yer tutucuları **çalışma anında ölçülüp doldurulacak değerlerdir** (uç sayısı, sha, kavram), yazılmamış iş değil.

## Spec → task eşlemesi

| Spec fazı | Task |
|---|---|
| Faz 1 — Sözleşme taraması (çapraz doğrulamalı) | Task 1 (orders), Task 2 (checkout + trades), Task 3 (products/membership/user/messaging) |
| Faz 2 — Süzülmüş commit taraması | Task 4, Step 1-4 |
| Faz 3 — Denetim raporu | Task 4, Step 5 |
| Faz 4 — Uygulama | Task 5 → Plan B (`writing-plans` yeniden çağrılır) |

**Plan B neden şimdi yazılamıyor:** task'ları bugün yazmak, kaç bulgu çıkacağını
ve ne olduklarını bilmeden kod bloğu uydurmak olurdu. Bulgular Task 4'te
netleşiyor; Plan B onlardan türüyor.

---

### Task 1: Sözleşme-kapsama bekçisi + ilk alan (orders)

Ölçülmüş bir gövdeyi mobilin tip dosyasına karşı tarayan mekanizmayı kurar ve `orders` alanında çalıştırır.

**Files:**
- Create: `src/lib/api/__tests__/fixtures/README.md`
- Create: `src/lib/api/__tests__/fixtures/orders.json`
- Create: `src/lib/api/__tests__/contractCoverage.ts`
- Create: `src/lib/api/__tests__/contractCoverage.test.ts`

**Interfaces:**
- Produces: `fieldPaths(body: unknown): string[]` — gövdedeki her yaprak alanın nokta yolu (dizi indisleri atlanır: `orders[0].id` → `orders.id`).
- Produces: `undeclaredFields(body: unknown, typeSource: string, allowlist: Set<string>): string[]` — tip kaynağında adı geçmeyen ve allowlist'te olmayan alan yolları.

- [ ] **Step 1: Staging'den `orders` gövdesini ölç ve kaydet**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')

mkdir -p src/lib/api/__tests__/fixtures
{
  echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /orders?limit=3", "GET /orders/:id", "GET /orders/groups?limit=3"] },'
  echo -n '  "list": '; curl -s "$API/orders?limit=3" -H "Authorization: Bearer $T"
  echo ','
  echo -n '  "groups": '; curl -s "$API/orders/groups?limit=3" -H "Authorization: Bearer $T"
  echo '}'
} > src/lib/api/__tests__/fixtures/orders.json

# Tek sipariş detayı da lazım — listedeki ilk kimlikle:
OID=$(jq -r '.list.data[0].id // .list[0].id // empty' src/lib/api/__tests__/fixtures/orders.json)
echo "detay için id: $OID"
```

Detay gövdesini `"detail":` anahtarı altına elle ekle (aynı dosyaya). `jq .` ile
dosyanın geçerli JSON olduğunu doğrula.

- [ ] **Step 2: Fixture'ları belgeleyen README'yi yaz**

```bash
cat > src/lib/api/__tests__/fixtures/README.md <<'EOF'
# Sözleşme fixture'ları

Staging'den ÖLÇÜLMÜŞ ham yanıt gövdeleri. Elle yazılmazlar — `_meta.capturedAt`
ve `_meta.endpoints` neyin, ne zaman, hangi uçtan alındığını söyler.

## Ne işe yarıyorlar

`contractCoverage.test.ts` her fixture'ın alan adlarını ilgili
`src/lib/api/<domain>.ts` tip dosyasına karşı tarıyor. Tip dosyasında adı
geçmeyen her alan ya `KNOWN_UNDECLARED` listesinde gerekçesiyle duruyor ya da
test düşüyor.

Sebep: parite denetimleri iki kez üst üste sunucunun İÇ İÇE ve DTO'suz
alanlarını kaçırdı (`pricing.summary.quantityDiscount`, `rejectionReason`).
`dto/**` diffi bunları göstermiyor çünkü gövde serviste kuruluyor. Ölçülmüş
gövde gösteriyor.

## Sınırı — abartma

Test alan ADININ tip dosyasında geçip geçmediğine bakar; iç içe yapıyı ya da
tipi DOĞRULAMAZ. Yani `total: string` yazılmışsa yakalamaz. Yakaladığı tek şey,
tam olarak bizi iki kez yakalayan şey: yanıtta olup tip dosyasında hiç
bulunmayan alan.

## PII

Fixture'lar `jq walk` filtresiyle maskelenmiş hâlde commit'lenir. Ham gövdeyi
repoya koyma.

## Yenileme

Sözleşme değiştiğinde yeniden ölç (README başındaki komutlar
`docs/superpowers/plans/2026-08-26-tam-parite-denetimi.md` içinde). Fixture
bayatladığında test SESSİZ kalır — bu yüzden her parite turunda yenilenmeli.
EOF
```

- [ ] **Step 3: Başarısız testi yaz**

`src/lib/api/__tests__/contractCoverage.test.ts`:

```ts
/**
 * Sözleşme kapsaması — sunucunun döndürdüğü her alan mobilin tipinde var mı?
 *
 * Parite denetimleri iki kez üst üste aynı sınıfı kaçırdı: sunucunun İÇ İÇE ve
 * DTO'suz alanları. `pricing.summary.quantityDiscount` bir serviste kuruluyor,
 * `dto/**` diffinde hiç görünmüyor — sepette kampanya indirimi etiketsiz
 * eriyordu. `rejectionReason` de öyle: satıcı ilanının neden reddedildiğini
 * hiçbir yerde göremiyordu.
 *
 * Bu test o sınıfı kapatıyor: ÖLÇÜLMÜŞ gövdedeki her alan adı, ilgili tip
 * dosyasında geçmiyorsa ya gerekçesiyle `KNOWN_UNDECLARED`'da durur ya da test
 * düşer.
 *
 * SINIRI: alan ADINA bakar, tipe ya da iç içe yapıya DEĞİL. `total: string`
 * yazılmışsa yakalamaz. Yakaladığı tek şey yanıtta olup tipte hiç olmayan alan.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fieldPaths, undeclaredFields } from './contractCoverage';

const ROOT = resolve(__dirname, '../../../..');
const readType = (domain: string) =>
  readFileSync(resolve(ROOT, `src/lib/api/${domain}.ts`), 'utf8');
const readFixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));

/**
 * Yanıtta olup tipte OLMAYAN, ama bilinçli olarak okunmayan alanlar.
 *
 * Her satır bir KARAR: ya "mobil bu alanı hiç kullanmıyor ve kullanmamalı" ya da
 * "Plan B'de kapatılacak boşluk". İkincisi kapatıldığında satır SİLİNİR —
 * ilerleme böyle ölçülür.
 */
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  orders: new Set<string>([]),
};

describe('fieldPaths', () => {
  it('iç içe alanları nokta yoluyla düzler', () => {
    expect(fieldPaths({ a: { b: 1 } })).toContain('a.b');
  });

  it('dizi indislerini atlar — 0. ve 1. eleman aynı yolu üretir', () => {
    expect(fieldPaths({ items: [{ id: 1 }, { id: 2 }] })).toEqual(['items.id']);
  });

  it('null taşıyan alanı da alan sayar (varlık ≠ değer)', () => {
    // Sunucu `rejectionReason: null` döndürüyordu; alan VARDI, mobilde yoktu.
    expect(fieldPaths({ rejectionReason: null })).toEqual(['rejectionReason']);
  });

  it('boş dizide alanın KENDİSİNİ raporlar, iç şeklini değil', () => {
    // `feeDiscounts` her ölçümde `[]` döndü. Alan VAR ve mobil onu bildirmeli;
    // bildirilmesi gereken tek şey bu — iç satırın şekli ölçülemedi, oradan tip
    // çıkarmak uydurmak olurdu.
    expect(fieldPaths({ feeDiscounts: [] })).toEqual(['feeDiscounts']);
  });
});

describe('undeclaredFields', () => {
  it('tipte geçen alanı bildirilmiş sayar', () => {
    const src = 'export type X = { total: number };';
    expect(undeclaredFields({ total: 1 }, src, new Set())).toEqual([]);
  });

  it('tipte geçmeyen alanı bildirilmemiş sayar', () => {
    const src = 'export type X = { total: number };';
    expect(undeclaredFields({ quantityDiscount: 5 }, src, new Set())).toEqual([
      'quantityDiscount',
    ]);
  });

  it('allowlist’teki alanı raporlamaz', () => {
    const src = 'export type X = { total: number };';
    const allow = new Set(['quantityDiscount']);
    expect(undeclaredFields({ quantityDiscount: 5 }, src, allow)).toEqual([]);
  });

  it('yaprak adına bakar — `a.b` için `b` tipte geçiyorsa yeter', () => {
    // Tip dosyaları iç içe tipleri ayrı `type` olarak tanımlıyor; tam yolu
    // aramak her iç içe tipte yanlış pozitif üretirdi.
    const src = 'export type Inner = { b: number };';
    expect(undeclaredFields({ a: { b: 1 } }, src, new Set())).toEqual([]);
  });
});

describe('orders sözleşmesi', () => {
  it('ölçülen gövdedeki her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('orders');
    const src = readType('orders');
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.orders);
    // Düşerse: alanı tipe ekle (Plan B task'ı) ya da neden okunmadığını yazıp
    // KNOWN_UNDECLARED'a al. Listeyi gerekçesiz büyütme.
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 4: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="contractCoverage" 2>&1 | tail -20`
Expected: FAIL — `Cannot find module './contractCoverage'`

- [ ] **Step 5: Yardımcıyı yaz**

`src/lib/api/__tests__/contractCoverage.ts`:

```ts
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
```

- [ ] **Step 6: Testi koş — yardımcı testleri geçmeli, `orders` sözleşmesi DÜŞEBİLİR**

Run: `npx jest --testPathPattern="contractCoverage" 2>&1 | tail -30`
Expected: `fieldPaths` ve `undeclaredFields` blokları PASS. `orders sözleşmesi`
bloğu düşerse çıktıdaki alan listesi **denetimin ilk bulgusudur**.

- [ ] **Step 7: Düşen alanları karara bağla**

Her alan için ölç ve karar ver:

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/orders?limit=1" -H "Authorization: Bearer $T" | jq -c '.data[0] | keys'
```

Sonra `KNOWN_UNDECLARED.orders`'a **gerekçesiyle** ekle. İki gerekçe biçimi:

```ts
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  orders: new Set<string>([
    // Mobil bu alanı hiç kullanmıyor ve kullanmamalı: satıcı muhasebesi,
    // alıcı ekranlarında karşılığı yok.
    'data.sellerNetAmount',
    // BOŞLUK — Plan B'de kapatılacak. Kapatılınca bu satır SİLİNİR.
    'data.someMissingField',
  ]),
};
```

- [ ] **Step 8: Fixture'ı maskele**

PII, ölçüm anında `jq walk` ile maskelenir — TypeScript yardımcısıyla değil.
Maskeleme bir yakalama adımı, bir test davranışı değil; testin işi kapsamayı
denetlemek. (`jq 1.7.1` ile doğrulandı.)

```bash
F=src/lib/api/__tests__/fixtures/orders.json
jq 'walk(
  if type == "object" then
    with_entries(
      if (.key | IN("email","phone","contactPhone","guestName","fullName",
                    "displayName","address","addressLine","zipCode","postalCode",
                    "iban","taxId","tcKimlikNo","accountHolder"))
         and (.value | type == "string")
      then .value = "REDACTED" else . end)
  else . end)' "$F" > "$F.tmp" && mv "$F.tmp" "$F"

jq . "$F" > /dev/null && echo "geçerli JSON"
grep -c REDACTED "$F"
```

Beklenen: `REDACTED` sayısı > 0 ve dosya geçerli JSON.

- [ ] **Step 9: Kapıları koş**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
```

Expected: tsc çıktısı boş; eslint **0 errors**; tüm testler PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/api/__tests__/
git commit -m "test(contract): flag response fields the mobile types never declare

Two parity rounds in a row missed the same class: fields the server assembles in
a service never appear in a dto/** diff, so pricing.summary's campaign discounts
and a listing's rejection reason went unread for weeks.

A measured response body is worth more than the DTO here. Each fixture's field
names are checked against the domain's type file; anything undeclared either
carries a reason in the allowlist or fails the suite.

The check reads names, not types or nesting — it catches exactly the class that
bit us and claims nothing more."
```

---

### Task 2: checkout + trades alanlarını kapsama al

**Files:**
- Create: `src/lib/api/__tests__/fixtures/checkout.json`
- Create: `src/lib/api/__tests__/fixtures/trades.json`
- Modify: `src/lib/api/__tests__/contractCoverage.test.ts`

**Interfaces:**
- Consumes: `fieldPaths`, `undeclaredFields` (Task 1)

- [ ] **Step 1: İki gövdeyi ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
PID=$(curl -s "$API/products?limit=1" | jq -r '.data[0].id')

{
  echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["POST /orders/quote (qty 1)", "POST /orders/quote (qty 3)"] },'
  echo -n '  "quoteSingle": '
  curl -s -X POST "$API/orders/quote" -H "Authorization: Bearer $T" \
    -H 'Content-Type: application/json' -d "{\"items\":[{\"productId\":\"$PID\",\"quantity\":1}]}"
  echo ','
  echo -n '  "quoteMulti": '
  curl -s -X POST "$API/orders/quote" -H "Authorization: Bearer $T" \
    -H 'Content-Type: application/json' -d "{\"items\":[{\"productId\":\"$PID\",\"quantity\":3}]}"
  echo '}'
} > src/lib/api/__tests__/fixtures/checkout.json

{
  echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /trades?limit=5", "GET /trades/:id"] },'
  echo -n '  "list": '; curl -s "$API/trades?limit=5" -H "Authorization: Bearer $T"
  echo '}'
} > src/lib/api/__tests__/fixtures/trades.json

TID=$(jq -r '.list.trades[0].id' src/lib/api/__tests__/fixtures/trades.json)
echo "takas detayı için id: $TID  — gövdeyi \"detail\": altına elle ekle"
jq . src/lib/api/__tests__/fixtures/checkout.json > /dev/null && echo "checkout.json geçerli"
jq . src/lib/api/__tests__/fixtures/trades.json > /dev/null && echo "trades.json geçerli"
```

- [ ] **Step 2: Başarısız testleri ekle**

`contractCoverage.test.ts` içinde `KNOWN_UNDECLARED`'a iki boş küme ekle ve iki
describe bloğu yaz:

```ts
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  orders: new Set<string>([/* Task 1'de dolduruldu */]),
  checkout: new Set<string>([]),
  trades: new Set<string>([]),
};

describe('checkout sözleşmesi', () => {
  it('ölçülen quote gövdesindeki her alan tipte bildirilmiş ya da listede', () => {
    const missing = undeclaredFields(
      readFixture('checkout'),
      readType('orders'), // quote tipleri `orders.ts`'te yaşıyor
      KNOWN_UNDECLARED.checkout,
    );
    expect(missing).toEqual([]);
  });
});

describe('trades sözleşmesi', () => {
  it('ölçülen gövdedeki her alan tipte bildirilmiş ya da listede', () => {
    const missing = undeclaredFields(
      readFixture('trades'),
      readType('trades'),
      KNOWN_UNDECLARED.trades,
    );
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 3: Testi koş, düşen alanları oku**

Run: `npx jest --testPathPattern="contractCoverage" 2>&1 | tail -40`
Expected: iki yeni blok düşer; çıktıdaki alan listeleri **bulgudur**.

- [ ] **Step 4: Her alanı karara bağla ve listeye gerekçesiyle ekle**

Kural Task 1 Step 7'deki ile aynı: ya "mobil kullanmamalı" ya "BOŞLUK — Plan B".
Takas için özellikle bak: `cashPayments[]` içindeki alanlar (`tradeFeeAmount`,
`tradeFeeDiscountAmount`, `shippingAmount`, `commission`) mobilin
`app/trade/[id]/_lib/types.ts`'inde yaşıyor, `src/lib/api/trades.ts`'te değil —
bu yüzden yanlış pozitif verecekler. Gerekçeyi buna göre yaz:

```ts
  trades: new Set<string>([
    // Takas nakit satırı alanları route-local tipte yaşıyor
    // (`app/trade/[id]/_lib/types.ts`), API katmanında değil. Kapsam dışı
    // değil — sadece başka dosyada; oradaki tip Plan B'de ayrıca denetlenir.
    'list.trades.cashPayments.tradeFeeAmount',
  ]),
```

- [ ] **Step 5: Fixture'ları maskele**

Task 1 Step 8'deki `jq walk` filtresini `checkout.json` ve `trades.json` için
tekrarla (`$F` değişkenini değiştir). Sonra doğrula:

```bash
jq . src/lib/api/__tests__/fixtures/checkout.json > /dev/null && echo ok
jq . src/lib/api/__tests__/fixtures/trades.json > /dev/null && echo ok
```

- [ ] **Step 6: Kapıları koş**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/__tests__/
git commit -m "test(contract): cover the checkout quote and trade responses

The quote body is where the first miss lived, so it gets both a single-item and
a multi-item capture: a quantity campaign only shows itself on the second."
```

---

### Task 3: products + membership + user + messaging alanlarını kapsama al

**Files:**
- Create: `src/lib/api/__tests__/fixtures/products.json`
- Create: `src/lib/api/__tests__/fixtures/membership.json`
- Create: `src/lib/api/__tests__/fixtures/user.json`
- Create: `src/lib/api/__tests__/fixtures/messaging.json`
- Modify: `src/lib/api/__tests__/contractCoverage.test.ts`

- [ ] **Step 1: Dört gövdeyi ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
F=src/lib/api/__tests__/fixtures

{ echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /products?limit=2", "GET /products/my?limit=20"] },'
  echo -n '  "list": ';  curl -s "$API/products?limit=2"
  echo ','
  echo -n '  "mine": ';  curl -s "$API/products/my?limit=20" -H "Authorization: Bearer $T"
  echo '}'
} > $F/products.json

{ echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /membership/tiers", "GET /membership/me", "GET /membership/me/limits"] },'
  echo -n '  "tiers": ';  curl -s "$API/membership/tiers" -H "Authorization: Bearer $T"
  echo ','
  echo -n '  "me": ';     curl -s "$API/membership/me" -H "Authorization: Bearer $T"
  echo ','
  echo -n '  "limits": '; curl -s "$API/membership/me/limits" -H "Authorization: Bearer $T"
  echo '}'
} > $F/membership.json

{ echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /users/me", "GET /users/me/addresses"] },'
  echo -n '  "me": ';        curl -s "$API/users/me" -H "Authorization: Bearer $T"
  echo ','
  echo -n '  "addresses": '; curl -s "$API/users/me/addresses" -H "Authorization: Bearer $T"
  echo '}'
} > $F/user.json

{ echo '{'
  echo '  "_meta": { "capturedAt": "2026-08-26", "account": "ahmet@demo.com", "endpoints": ["GET /messages/threads?limit=5"] },'
  echo -n '  "threads": '; curl -s "$API/messages/threads?limit=5" -H "Authorization: Bearer $T"
  echo '}'
} > $F/messaging.json

for f in products membership user messaging; do jq . $F/$f.json > /dev/null && echo "$f ok"; done
```

Uçlardan biri 404 dönerse: gerçek yolu `src/lib/api/<domain>.ts` içinden oku ve
komutu düzelt. **Uydurma yol kullanma** — 404 gövdesi fixture'a girerse test
sözleşmeyi değil hata mesajını denetler.

- [ ] **Step 2: Dört describe bloğu ekle**

```ts
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  // ...önceki alanlar...
  products: new Set<string>([]),
  membership: new Set<string>([]),
  user: new Set<string>([]),
  messaging: new Set<string>([]),
};

describe.each([
  ['products', 'products'],
  ['membership', 'membership'],
  ['user', 'user'],
  ['messaging', 'messaging'],
])('%s sözleşmesi', (fixture, domain) => {
  it('ölçülen gövdedeki her alan tipte bildirilmiş ya da listede', () => {
    const missing = undeclaredFields(
      readFixture(fixture),
      readType(domain),
      KNOWN_UNDECLARED[fixture]!,
    );
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 3: Koş, düşen alanları oku, karara bağla**

Run: `npx jest --testPathPattern="contractCoverage" 2>&1 | tail -60`

Her alan için Task 1 Step 7 kuralı. `products.mine` altındaki alanlara özellikle
bak — `rejectionReason` oradan çıkmıştı; benzer, hiç okunmayan alanlar olabilir.

- [ ] **Step 4: Fixture'ları maskele ve doğrula**

Task 1 Step 8'deki `jq walk` filtresi, dört dosya için sırayla. Sonra `jq .`
ile hepsini doğrula.

- [ ] **Step 5: Kapıları koş**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/__tests__/
git commit -m "test(contract): cover products, membership, user and messaging

products/my is where the rejection reason hid, so the capture takes the whole
page rather than a single row: a field only present on rejected listings needs
a rejected listing in the sample."
```

---

### Task 4: Süzülmüş commit taraması

Sözleşme taramasının göremediği şeyi arar: alan değil DAVRANIŞ farkları
(kural, kapı, metin, akış).

**Files:**
- Create: `docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md`

- [ ] **Step 1: Aday commit listesini üret**

```bash
cd /Users/gorkemsubas/dev/tarodan-app
git fetch --all
FORK=d7df71e80
BASE=94f372e1b3da79ebd1f8be40446e22890a564597
git log --format='%ad %h %s' --date=short --no-merges $FORK..$BASE \
  -- apps/web packages/ui packages/shared packages/types packages/i18n \
  | grep -E " (feat|fix)\(" | grep -viE " \w+\(admin\)" \
  > /tmp/parity-candidates.txt
wc -l /tmp/parity-candidates.txt   # ~147 beklenir
```

- [ ] **Step 2: Web'e özgü olanları gerekçesiyle ele**

Aşağıdaki desenler RN'de karşılığı olmadığı için okunmadan elenir. Elenen her
commit rapora **sayısıyla** yazılır ki "kapsanmadı" ile "bilinçli elendi"
karışmasın:

```bash
grep -viE "csp|content security|cookie|çerez|footer|dropdown|grid|responsive|dvh|vh|safe-area|breakpoint|sentry|dynamic render|zoom|column|width|scroll|popover|dark mode" \
  /tmp/parity-candidates.txt > /tmp/parity-shortlist.txt
wc -l /tmp/parity-shortlist.txt
echo "elenen: $(( $(wc -l < /tmp/parity-candidates.txt) - $(wc -l < /tmp/parity-shortlist.txt) ))"
```

- [ ] **Step 3: Kısa listeyi yürü**

Her commit için:

```bash
cd /Users/gorkemsubas/dev/tarodan-app
git show --stat <sha> | head -12          # neye dokunmuş
git show <sha> -- apps/web | grep -E '^\+' | grep -v '^\+\+\+' | head -30
```

Sonra mobilde karşılığını ara:

```bash
cd /Users/gorkemsubas/dev/tarodan-mobile
grep -rn "<anahtar kavram>" app src --include='*.ts*' | grep -v __tests__ | head
```

Üç sonuç: **mobilde var** (atla) · **mobilde yok, web'e özgü** (gerekçeyle ele) ·
**mobilde yok, geçerli** → ölç, bulgu yaz.

- [ ] **Step 4: Şüpheli her maddeyi staging'den ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/<ilgili-uç>" -H "Authorization: Bearer $T" | jq -c .
```

Alan yoksa madde **"backend bekliyor"** olur; tip yazılmaz, task açılmaz.

- [ ] **Step 5: Denetim raporunu yaz**

`docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md`, şu başlıklarla:

```markdown
# Tam parite denetimi — bulgular

**Tarih:** 2026-08-26
**Referans:** `tarodan-app` `origin/development` @ `9f2f66bfc` (2026-08-22)
**Yöntem:** `docs/superpowers/specs/2026-08-26-tam-parite-denetimi-design.md`

## Kapsam ve elenenler

- Faz 1 sözleşme taraması: <N> uç, <M> fixture.
- Faz 2 commit taraması: <toplam> aday, <elenen> web'e özgü olduğu için
  okunmadan elendi, <yürünen> yürüdü.

## Bulgular

| # | Bulgu | Ölçüm | Kullanıcı etkisi | Öncelik | Sahip |
|---|---|---|---|---|---|

(P0 para/veri kaybı · P1 görünen yanlış bilgi · P2 sessiz yalan · P3 eksik yetenek
· "backend" devredildi)

## Ölçülen ham gövdeler

(her bulgunun altına ilgili `curl` çıktısı)

## Doğrulanamayanlar

(staging'de dolu örneği bulunamayan alanlar — şekli ana repodan alındıysa
açıkça yazılır)

## Test flake gözlemi

(bu turda düşen test varsa adı ve mesajı)
```

- [ ] **Step 6: Kapıları koş**

```bash
npx tsc --noEmit
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
```

Bu task kod değiştirmiyor; kapılar yine de koşulur çünkü Task 1-3 fixture'ları
dosya sistemine dokundu.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md
git commit -m "docs: report the full parity audit findings

Records what was measured, what was deliberately skipped and why, and which
items belong to the backend rather than the client — so a later round can tell
'not covered' from 'covered and dismissed'."
```

---

### Task 5: Bulguları Plan B'ye devret

**Files:**
- Modify: `docs/PARITE_KALAN_ISLER.md`
- Create: `docs/superpowers/plans/2026-08-26-parite-uygulama.md` (Plan B)

- [ ] **Step 1: Backend bekleyenleri devret**

`docs/PARITE_KALAN_ISLER.md`'deki "Backend / ops bekleyen" tablosuna denetimden
çıkan yeni maddeleri ölçümleriyle ekle. Zaten listede olanı tekrarlama.

- [ ] **Step 2: Mobilde kapatılabilir bulguları önceliklendir**

Rapordaki bulguları P0 → P3 sırasına ve akış grubuna (checkout/sepet →
siparişler → takas → ilanlar → üyelik → mesaj/bildirim → profil/ayarlar) diz.

- [ ] **Step 3: Plan B'yi yaz**

`writing-plans` skill'ini yeniden çağır; girdi olarak denetim raporunu ve bu
sıralamayı ver. Plan B'nin her task'ı:
- bir davranış, bir commit, en az bir test,
- test biçimi bulgu sınıfına göre (spec'teki tablo),
- ilgili `KNOWN_UNDECLARED` satırını **siler** (bir alan boşluğuysa),
- akış bittiğinde kullanıcıya elle doğrulama listesi üretir.

- [ ] **Step 4: Commit**

```bash
git add docs/PARITE_KALAN_ISLER.md docs/superpowers/plans/2026-08-26-parite-uygulama.md
git commit -m "docs: hand the audit findings to an implementation plan

Backend-owned items move to the waiting list rather than being worked around on
the client; the rest become tasks ordered by user harm."
```
