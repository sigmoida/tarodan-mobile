# Parite düzeltmeleri — Plan B (P1 bulguları)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Denetimin bulduğu, kullanıcıya YANLIŞ ya da EKSİK bilgi gösteren sekiz kusuru kapatmak.

**Architecture:** Her kusur bağımsız; ortak bir altyapı değişikliği yok. İkisi (B5, B11) aynı sınıftan — "istemci, yanıtta olmayan bir alanı okuyor" — ve tek task'ta ele alınıyor ki sınıf da belgelensin.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Jest + @testing-library/react-native, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-08-26-tam-parite-denetimi-design.md`
**Bulgular:** `docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md`
**Sıralı iş listesi (her bulgunun kanıtı + risk notu):** `docs/superpowers/reports/2026-08-26-parite-uygulama-sirasi.md`

## Global Constraints

- **Bir task yeşil olup commit'lenmeden sonraki başlamaz.** Commit biriktirme yok.
- Her task'ın kapısı: `npx tsc --noEmit` temiz → `npx eslint . --ext .ts,.tsx` **0 error** (~1000 warning izlenen taban) → `npx jest` tam paket yeşil.
- **Ölçüm kapısı:** bir alan hakkında tip yazmadan önce staging'den ölçülür. Ölçüm göstermiyorsa task durur ve "backend bekliyor"a taşınır.
- Demo hesabı `ahmet@demo.com` / `Demo123!` · `https://staging.tarodan.com.tr/api` · token ömrü **900 sn**.
- Test yorumları Türkçe, kod tanımlayıcıları İngilizce (repo deseni).
- **Para gösteren hiçbir değer istemcide HESAPLANMAZ** (CLAUDE.md). Sunucunun döndürdüğü alan aynen basılır.
- Kullanıcıya görünen her metin katalogdan gelir (`t('...')`), sabit dizgi yazılmaz. Yeni anahtar `src/i18n/lib/catalog/{tr,en}.json`'a eklenir ve `node scripts/gen-keys.mjs` koşulur.
- Sözleşme bekçisinin `KNOWN_UNDECLARED` listesinde ilgili "BOŞLUK" satırı varsa, task onu **siler** — ilerleme böyle ölçülür.

## Kapsam

Bu plan **yalnız P1** bulgularını kapatır. P2/P3 (B6 checkout indirim kırılımı, B7 anlaşmazlık sonucu, B10 grup `packages`, B13 KEP) ayrı bir plana bırakıldı: ikisi ölçüm bekliyor, ikisi kayıp üretmiyor.

| Task | Bulgu | Akış |
|---|---|---|
| 1 | B1 — takas takip linki iç referansla kuruluyor | trades |
| 2 | B5 + B11 — istemci yanıtta olmayan alanı okuyor | membership / security |
| 3 | B3 — `suspended` ilan durumu tanınmıyor | listings |
| 4 | B9 — mesaj listesinde ürün bağlamı kayboluyor | messaging |
| 5 | B8 — `birthDate` haritalanmıyor | profile |
| 6 | B2 — satış kartı alıcının toplamını gösteriyor | orders |
| 7 | B4 — hukuki künye uydurma | legal |

---

### Task 1: Takas takip linki gerçek kargo koduyla kurulsun (B1)

Takas ekranındaki her "takip et" butonu Tarodan'ın İÇ referansını (`TKS-…`/`PKG-…`) Sürat'e gönderiyor. Sürat o numarayı tanımıyor → link ölü. Sipariş tarafı aynı tuzağı `deriveShipmentView` ile çözmüş; takas tarafı o yardımcıyı hiç çağırmıyor.

**Files:**
- Modify: `app/trade/[id]/_lib/types.ts` (`TradeShipment`, satır 4-12)
- Modify: `app/trade/[id]/_components/TradeShippingSection.tsx` (satır 14, 87, 126, 160, 203)
- Test: `app/trade/__tests__/shipment-tracking.test.ts` (yeni)

**Interfaces:**
- Consumes: `deriveShipmentView(s, fallbackCargoCode?)` from `src/lib/shipping/tracking.ts` — döndürdüğü `{ cargoCode, reference, isCodePending, trackingUrl }`.

- [ ] **Step 1: Sözleşmeyi ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/trades?limit=10" -H "Authorization: Bearer $T" \
  | jq -c '[.trades[]?.shipments[]? | {trackingNumber, cargoCode, provider, status}] | .[0:3]'
```

Beklenen: her gönderide hem `trackingNumber` (iç referans) hem `cargoCode`
(gerçek kod) var. `cargoCode` hiçbir satırda yoksa **DUR** — task "backend
bekliyor"a taşınır.

- [ ] **Step 2: Başarısız testi yaz**

`app/trade/__tests__/shipment-tracking.test.ts`:

```ts
/**
 * Takas takip linki GERÇEK kargo koduyla kurulur, iç referansla değil.
 *
 * Ekran her "takip et" butonuna `shipment.trackingNumber` veriyordu — o Tarodan'ın
 * İÇ referansı (`TKS-…`), satıcının şubede verdiği numara. Sürat onu tanımıyor,
 * yani link ölüydü. Gerçek kod aynı gönderide `cargoCode` olarak geliyor
 * (staging'de ölçüldü) ve `TradeShipment` tipi onu hiç bildirmiyordu.
 *
 * Sipariş tarafı bu ayrımı `deriveShipmentView` ile çözmüş; takas tarafı o
 * yardımcıyı hiç çağırmıyordu. Test, çözümün o TEK kaynaktan geçtiğini çiviliyor.
 */
import { deriveShipmentView } from '@/lib/shipping/tracking';

describe('takas gönderisi → takip görünümü', () => {
  it('gerçek kargo kodunu tercih eder, iç referansı DEĞİL', () => {
    const view = deriveShipmentView({
      provider: 'surat',
      trackingNumber: 'TKS-9MQEWD2FKR-WH-INI',
      providerTrackingId: '12516210181141',
    } as any);
    expect(view.cargoCode).toBe('12516210181141');
    expect(view.trackingUrl).toContain('12516210181141');
    expect(view.trackingUrl).not.toContain('TKS-');
  });

  it('kod ayrı alanda geldiğinde de bulur (yanıt şekli iki türlü)', () => {
    const view = deriveShipmentView(
      { provider: 'surat', trackingNumber: 'TKS-X' } as any,
      '99988877766',
    );
    expect(view.cargoCode).toBe('99988877766');
  });

  it('kod henüz yokken link üretmez ve bunu BEKLEMEDE olarak işaretler', () => {
    // Kargo kaydı doğmuş ama taşıyıcı kodu gelmemiş — NORMAL ara durum.
    // Buraya iç referansı koymak, kullanıcıyı çalışmayan bir linke yollardı.
    const view = deriveShipmentView({ provider: 'surat', trackingNumber: 'TKS-X' } as any);
    expect(view.cargoCode).toBeNull();
    expect(view.trackingUrl).toBeNull();
    expect(view.isCodePending).toBe(true);
  });

  it('ekran iç referansı takip fonksiyonuna GEÇİRMEZ', () => {
    // Davranış testi bunu yakalayamaz: link açma native bir çağrı ve testte
    // mock'lanıyor. Kuralı kaynakta çiviliyoruz — regresyon tek satır uzakta.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../[id]/_components/TradeShippingSection.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/openSuratTrack\([^)]*trackingNumber/);
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="shipment-tracking" 2>&1 | tail -20`
Expected: son test FAIL — `openSuratTrack(...trackingNumber)` kaynakta hâlâ var.

- [ ] **Step 4: Tipe gerçek kodu ekle**

`app/trade/[id]/_lib/types.ts`, `TradeShipment` içine:

```ts
  /**
   * Gerçek taşıyıcı kodu — takip bununla yapılır.
   *
   * `trackingNumber` Tarodan'ın İÇ referansı (`TKS-…`); Sürat onu tanımaz ve
   * alıcıya gösterilmez. Ayrım sipariş tarafında `deriveShipmentView` ile
   * çözülüyor, takas tarafı bu alanı hiç bildirmediği için o yardımcıya
   * bağlanamıyordu.
   */
  cargoCode?: string | null;
  /** Sunucunun aynı bilgiyi taşıyan diğer adı; `deriveShipmentView` ikisini de okur. */
  providerTrackingId?: string | null;
  provider?: string | null;
```

- [ ] **Step 5: Ekranı paylaşılan yardımcıya bağla**

`TradeShippingSection.tsx`: `openSuratTrack` çağrılarının HEPSİ
`deriveShipmentView(shipment).cargoCode` üzerinden gitmeli, ve kod yokken
buton **gösterilmemeli** (`isCodePending`). Dört çağrı yeri: satır 87, 126,
160, 203.

Deseni (her çağrı yerine uyarla):

```tsx
const view = deriveShipmentView(myToWarehouseShipment);
// …
{view.trackingUrl ? (
  <Button title={t('trade.trackShipment')} onPress={() => openSuratTrack(view.cargoCode!)} />
) : view.isCodePending ? (
  <Text variant="caption" tone="muted">{t('shipping.codePending')}</Text>
) : null}
```

`t('shipping.codePending')` katalogda YOKSA ekle:
`tr: "Kargo kodu hazırlanıyor"`, `en: "Carrier code is being prepared"`, sonra
`node scripts/gen-keys.mjs`.

- [ ] **Step 6: Testleri koş**

Run: `npx jest --testPathPattern="trade" 2>&1 | tail -20`
Expected: yeni dosya PASS, mevcut takas testleri PASS.

- [ ] **Step 7: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add app/trade src/i18n
git commit -m "fix(trade): build the tracking link from the carrier code

Every track button handed Sürat a Tarodan-internal reference, which the carrier
does not recognise — the link was dead for both sides of every trade. The real
code arrives on the same shipment as cargoCode; the trade types never declared
it, so the screen could not reach the shared helper that resolves exactly this
distinction for orders.

The button now hides while the code is still pending rather than offering a
link that cannot work."
```

---

### Task 2: İstemci, yanıtta olmayan alanı okuyor (B5 + B11)

İki kusur, tek sınıf: kod bir alanı okuyor, sunucu o adı hiç göndermiyor. Sözleşme bekçisi bu yönü taramıyor (yalnız "gövdede var, tipte yok" yakalıyor), o yüzden ikisi de elle bulundu.

**B5:** `useAnalytics.ts:19` `limits?.maxListings === -1` ile premium arıyor. Sunucu `maxListings` diye bir alan döndürmüyor; `useMembershipLimits.ts:44` `maxTotalListings`'i (200) o ada bindiriyor → `200 === -1` sonsuza kadar false → **premium üyeler premium analitiği HİÇ görmüyor.**

**B11:** `useSecurity.ts:194` `payload.qrCode` okuyor; sunucu `qrCodeUrl`/`qrCodeImage` gönderiyor. Üstelik `:149` `const [, setTotpQr]` — yazılan değer zaten atılıyor. İki ayrı kırık; biri düzeltilse QR yine çizilmez.

**Files:**
- Modify: `app/settings/analytics/_hooks/useAnalytics.ts` (satır 19)
- Modify: `app/settings/security/_hooks/useSecurity.ts` (satır 149, 194)
- Modify: `app/settings/security/_components/SecurityDialogs.tsx` (2FA kurulum modalı)
- Test: `app/settings/__tests__/premium-gate.test.ts` (yeni)

- [ ] **Step 1: İki sözleşmeyi de ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
echo "### limits — maxListings var mı, tierType ne:"
curl -s "$API/membership/me/limits" -H "Authorization: Bearer $T" | jq -c .
```

Beklenen: `maxListings` YOK, `tierType: "premium"` VAR.

**2FA için ⚠️ AYRI HESAP GEREKİR.** `POST /auth/2fa/enable` bir mutasyon;
paylaşılan `ahmet@demo.com` hesabında iki adımlı doğrulamayı açar ve sonraki
her turu kilitler. `docs/manual-test/README.md`'deki diğer demo hesaplarından
birini kullan (`zeynep@demo.com`, `mehmet@demo.com`, `ali@demo.com` — hepsi
`Demo123!`) ve gövdeyi ölç:

```bash
T2=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"zeynep@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s -X POST "$API/auth/2fa/enable" -H "Authorization: Bearer $T2" | jq -c 'keys'
```

Beklenen anahtarlar: `secret`, `qrCodeUrl`, `qrCodeImage`, `backupCodes`.
**Gerçekte hangileri geliyorsa tipe O yazılır** — ana repo DTO'sundan
kopyalanmaz. Ölçüm `qrCodeImage` göstermiyorsa B11 durur ve "backend
bekliyor"a taşınır; B5 yine de bu task'ta kapanır.

- [ ] **Step 2: Başarısız testi yaz**

`app/settings/__tests__/premium-gate.test.ts`:

```ts
/**
 * Premium tespiti sunucunun GERÇEKTEN gönderdiği alandan yapılır.
 *
 * Ekran `limits.maxListings === -1` arıyordu. Sunucu `maxListings` diye bir alan
 * döndürmüyor; `useMembershipLimits` `maxTotalListings`'i (200) o ada
 * bindiriyor, yani karşılaştırma `200 === -1` → sonsuza kadar false. Sonuç:
 * PREMIUM ÜYELER premium analitiği hiç görmüyordu. Staging'de ölçüldü:
 * `/membership/me/limits` → `{"maxTotalListings":200,"tierType":"premium"}`.
 *
 * Bu sınıfın adı var: "istemci, yanıtta olmayan bir alanı okuyor". Sözleşme
 * bekçisi (Task 1-3, denetim dalı) yalnız ters yönü tarıyor, bu yüzden bu kusur
 * elle bulundu.
 */
import { isPremiumTier } from '../analytics/_lib/premium';

describe('isPremiumTier', () => {
  it('sunucunun tierType alanından premium okur', () => {
    expect(isPremiumTier({ tierType: 'premium' })).toBe(true);
  });

  it('business da premium yeteneklerini taşır', () => {
    expect(isPremiumTier({ tierType: 'business' })).toBe(true);
  });

  it.each(['free', 'basic'])('%s premium değildir', (tierType) => {
    expect(isPremiumTier({ tierType })).toBe(false);
  });

  it('limits hiç gelmediğinde premium VARSAYMAZ', () => {
    // İlk render'da sorgu çözülmemiş olabilir. Premium varsaymak, ödemeyen
    // kullanıcıya bir an premium bölüm göstermek olurdu.
    expect(isPremiumTier(undefined)).toBe(false);
    expect(isPremiumTier(null)).toBe(false);
  });

  it('`maxListings === -1` deseni bir daha kullanılmaz', () => {
    // Regresyon: sunucu böyle bir alan göndermiyor; yerel taban tablosundaki
    // -1 bindirmeyle her zaman geziliyor. Kuralı kaynakta çiviliyoruz.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../analytics/_hooks/useAnalytics.ts'),
      'utf8',
    );
    expect(source).not.toContain('maxListings === -1');
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="premium-gate" 2>&1 | tail -15`
Expected: FAIL — `Cannot find module '../analytics/_lib/premium'`

- [ ] **Step 4: Saf kapıyı yaz**

`app/settings/analytics/_lib/premium.ts` (yeni):

```ts
/**
 * Premium yeteneklerine sahip mi?
 *
 * Sunucunun `tierType`'ından okunur. Eskiden `limits.maxListings === -1`
 * bakılıyordu; sunucu `maxListings` diye bir alan göndermiyor ve
 * `useMembershipLimits` oraya `maxTotalListings`'i (gerçek bir sayı) yazdığı
 * için karşılaştırma hiçbir zaman tutmuyordu.
 *
 * `limits` yokken `false`: ilk render'da sorgu çözülmemiş olabilir ve premium
 * VARSAYMAK, ödemeyen kullanıcıya bir an premium bölüm göstermek olurdu.
 */
export function isPremiumTier(limits: { tierType?: string } | null | undefined): boolean {
  return limits?.tierType === 'premium' || limits?.tierType === 'business';
}
```

- [ ] **Step 5: Ekranı bağla**

`app/settings/analytics/_hooks/useAnalytics.ts:19`:

```ts
const isPremium = isPremiumTier(limits);
```

Import ekle: `import { isPremiumTier } from '../_lib/premium';`

⚠️ `limits.maxListings` BAŞKA iki yerde "kota sayısı" anlamıyla DOĞRU
okunuyor (`app/settings/my-listings/_hooks/useMyListings.ts`,
`src/stores/authStore.ts`). **Onlara dokunma** — yalnız `useAnalytics.ts`'teki
`-1` karşılaştırması hatalıydı.

- [ ] **Step 6: 2FA QR yolunu onar (ölçüm izin verdiyse)**

`useSecurity.ts`: `const [, setTotpQr] = useState("")` → okunabilir state
yap ve ölçülen alan adını kullan:

```ts
const [totpQrImage, setTotpQrImage] = useState('');
// …
setTotpQrImage(payload.qrCodeImage ?? '');
```

`SecurityDialogs.tsx`'te 2FA kurulum modalına QR'ı çiz:

```tsx
{f.totpQrImage ? (
  <Image
    source={{ uri: f.totpQrImage }}
    style={{ width: 200, height: 200, alignSelf: 'center' }}
    accessibilityLabel={t('security.twoFactorQrAlt')}
  />
) : null}
```

Katalog anahtarı ekle: `tr: "İki adımlı doğrulama QR kodu"`,
`en: "Two-factor authentication QR code"`, sonra `node scripts/gen-keys.mjs`.

Ölçüm `qrCodeImage` göstermediyse bu adımı ATLA ve raporda "backend bekliyor"
olarak yaz.

- [ ] **Step 7: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add app/settings src/i18n
git commit -m "fix(settings): read the tier from a field the server actually sends

The analytics screen looked for maxListings === -1 to decide who is premium.
The server sends no maxListings at all; the limits hook writes maxTotalListings
into that name, so the comparison was 200 === -1 and premium members never saw
the premium section.

The 2FA setup had the same shape twice over: it read payload.qrCode against a
response carrying qrCodeImage, and discarded the value anyway through a setter
with no reader — so fixing either alone would still have drawn nothing.

Both belong to a class the contract guard cannot see: it checks for fields in
the body that no type declares, never for a type or a reader naming a field the
body lacks."
```

---

### Task 3: `suspended` ilan durumu tanınsın (B3)

Askıya alınmış ilanın rozeti ham İngilizce kod basıyor ve eylem menüsü hâlâ "Düzenle" sunuyor. Web bu durumu ele almış. Staging'de hesapta bir `suspended` ilan var.

**Files:**
- Modify: `app/settings/my-listings/_lib/types.ts` (`getStatusColor` 35-46, `statusTextKey` 55-66, `Listing['status']` birleşimi)
- Modify: `app/settings/my-listings/_components/MyListingsSections.tsx` (`FILTER_CHIPS`)
- Modify: `app/settings/my-listings/_components/MyListingsModals.tsx` (satır 30, düzenleme kapısı)
- Test: `app/settings/__tests__/suspended-listing.test.ts` (yeni)

- [ ] **Step 1: Ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/products/my?limit=20" -H "Authorization: Bearer $T" \
  | jq -c '[.data[].status] | group_by(.) | map({(.[0]): length}) | add'
```

Beklenen: `suspended` sayısı ≥ 1.

- [ ] **Step 2: Başarısız testi yaz**

`app/settings/__tests__/suspended-listing.test.ts`:

```ts
/**
 * Askıya alınmış ilan durumu.
 *
 * `suspended` sunucunun döndürdüğü gerçek bir durum (staging'de hesapta bir
 * tane var) ama mobil onu hiç tanımıyordu: rozet ham `suspended` yazısını
 * basıyor, filtre çipleri arasında yer almıyor, ve eylem menüsü hâlâ "Düzenle"
 * sunuyordu — askıdaki bir ilanı düzenlemeye çalışan satıcı sunucudan hata
 * alıyordu. Web bu durumu ele almış.
 */
import { getStatusColor, statusTextKey } from '../my-listings/_lib/types';
import { messages } from '@/i18n/lib';

describe('suspended ilan durumu', () => {
  it('kendi rengi var — tanınmayan durumun gri tonuna düşmez', () => {
    expect(getStatusColor('suspended')).not.toBe(getStatusColor('uydurma_durum'));
  });

  it('katalogda gerçek bir etiketi var (iki dilde)', () => {
    const key = statusTextKey('suspended');
    expect(key).not.toBeNull();
    for (const locale of ['tr', 'en'] as const) {
      const label = key!.split('.').reduce<any>((o, k) => o[k], messages[locale]);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('tanınmayan durum hâlâ null döner — ham kod basılabilsin', () => {
    expect(statusTextKey('uydurma_durum')).toBeNull();
  });

  it('askıdaki ilanda düzenleme sunulmaz', () => {
    // Sunucu askıdaki ilanın düzenlenmesini reddediyor; butonu göstermek
    // kullanıcıyı doğrudan o hataya yürütür.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../my-listings/_components/MyListingsModals.tsx'),
      'utf8',
    );
    expect(source).toContain("'suspended'");
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="suspended-listing" 2>&1 | tail -15`

- [ ] **Step 4: Katalog anahtarını ekle**

```bash
python3 - <<'PY'
import json
from collections import OrderedDict
for loc, val in (('tr','Askıya Alındı'), ('en','Suspended')):
    p = f'src/i18n/lib/catalog/{loc}.json'
    d = json.load(open(p), object_pairs_hook=OrderedDict)
    if 'statusSuspended' not in d['listing']:
        d['listing']['statusSuspended'] = val
    json.dump(d, open(p,'w'), ensure_ascii=False, indent=2); open(p,'a').write('\n')
PY
node scripts/gen-keys.mjs
```

- [ ] **Step 5: Üç yeri de düzelt**

`_lib/types.ts`:
- `Listing['status']` birleşimine `'suspended'` ekle
- `getStatusColor`: `case 'suspended': return colors.warning[700]!;`
- `statusTextKey`: `case 'suspended': return 'listing.statusSuspended';`

**Filtre çipi EKLENMEZ.** Ölçüldü (ön uçuş): `GET /products/my/stats` `counts`
nesnesinde `suspended` sayacı YOK — çip "Askıya Alındı (undefined)" basardı.
Askıdaki ilan "Tümü" altında zaten görünüyor. Çip, sunucu sayacı yayınladığında
açılacak bir "backend bekliyor" maddesi; istemcide saymak sayfalı listede
yanlış sonuç verir.

`MyListingsModals.tsx:30` — düzenleme kapısı:
```tsx
{menu.status !== 'sold' && menu.status !== 'deleted' && menu.status !== 'suspended' && (
```

- [ ] **Step 6: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add app/settings src/i18n
git commit -m "fix(listings): recognise the suspended status

A suspended listing printed its raw status code as a badge, was missing from
the filter row, and still offered Edit — which the server refuses. The account
has one on staging, so this was visible to anyone who looked."
```

---

### Task 4: Mesaj listesinde ürün bağlamı korunsun (B9)

`normalizeThread` sunucunun düz `productTitle`/`productImage` alanlarını `thread.product`'a haritalamıyor; `ThreadRow` o alanı arayıp bulamayınca "Genel mesaj" yazıyor — ürün bağlamı OLAN konuşmalarda bile.

**Files:**
- Modify: `src/lib/messaging/normalize.ts` (`normalizeThread`, satır 24-52)
- Test: `src/lib/messaging/__tests__/normalize-product.test.ts` (yeni)

- [ ] **Step 1: Ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/messages/threads?limit=5" -H "Authorization: Bearer $T" \
  | jq -c '[.threads[]? // .[]? | {productId, productTitle, productImage, product}]'
```

Beklenen: düz `productTitle`/`productImage` dolu, iç içe `product` YOK.

- [ ] **Step 2: Başarısız testi yaz**

`src/lib/messaging/__tests__/normalize-product.test.ts`:

```ts
/**
 * Konuşmanın ürün bağlamı normalize edilirken kaybolmuyor.
 *
 * Sunucu ürün bilgisini DÜZ alanlarda gönderiyor (`productId`, `productTitle`,
 * `productImage`) — ölçüldü. `ThreadRow` ise iç içe `thread.product` arıyor ve
 * bulamayınca "Genel mesaj" yazıyordu. Yani bir ürün üzerinden başlamış her
 * konuşma listede bağlamsız görünüyordu.
 *
 * `normalizeThread` iki şekli de kabul eder: sunucu iç içe göndermeye geçerse
 * o da çalışır.
 */
import { normalizeThread } from '../normalize';

describe('normalizeThread — ürün bağlamı', () => {
  it('düz alanları iç içe `product` şekline taşır', () => {
    const t = normalizeThread({
      id: 't1',
      productId: 'p1',
      productTitle: 'Maisto 1963 Corvette',
      productImage: 'https://x/y.webp',
    });
    expect(t.product).toEqual({
      id: 'p1',
      title: 'Maisto 1963 Corvette',
      imageUrl: 'https://x/y.webp',
    });
  });

  it('sunucu zaten iç içe gönderirse onu KORUR', () => {
    const nested = { id: 'p9', title: 'Hazır', imageUrl: 'u' };
    expect(normalizeThread({ id: 't', product: nested }).product).toEqual(nested);
  });

  it('ürün bağlamı olmayan konuşmada `product` üretmez', () => {
    // Genel mesajlar gerçekten var; boş bir `product` nesnesi üretmek
    // `ThreadRow`'un kapısını yanlış tarafa açardı.
    expect(normalizeThread({ id: 't' }).product).toBeUndefined();
  });

  it('yalnız başlık gelip görsel gelmediğinde de bağlamı kurar', () => {
    const t = normalizeThread({ id: 't', productId: 'p', productTitle: 'X' });
    expect(t.product?.title).toBe('X');
    expect(t.product?.imageUrl).toBeUndefined();
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="normalize-product" 2>&1 | tail -15`

- [ ] **Step 4: Haritalamayı ekle**

`normalize.ts`, `return { ...t, ... }` bloğuna:

```ts
  /**
   * Ürün bağlamı: sunucu DÜZ alanlarda gönderiyor (`productTitle`/
   * `productImage`), `ThreadRow` iç içe `thread.product` arıyor. Haritalama
   * yoktu, o yüzden ürün üzerinden başlamış her konuşma listede "Genel mesaj"
   * görünüyordu. Sunucu iç içe göndermeye geçerse onu bozmuyoruz.
   */
  product:
    t.product ??
    (t.productId || t.productTitle
      ? { id: t.productId ?? '', title: t.productTitle ?? '', imageUrl: t.productImage ?? undefined }
      : undefined),
```

- [ ] **Step 5: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add src/lib/messaging
git commit -m "fix(messages): keep a conversation's product context

The server sends the product as flat fields; the row looks for a nested object
and, finding none, labelled every product conversation 'Genel mesaj'. The
normaliser now maps one onto the other and leaves an already-nested shape
alone."
```

---

### Task 5: `birthDate` haritalansın (B8)

Sunucu `birthDate` döndürüyor, `mapApiUserToUser` ~40 alan haritalıyor ama onu taşımıyor. Profil düzenleme ekranı onu okuyor → alan HER ZAMAN boş açılıyor, ve kaydedince kayıtlı değer siliniyor.

**Files:**
- Modify: `src/stores/authStore.ts` (`User` arayüzü + `mapApiUserToUser`, ~239-317)
- Test: `src/stores/__tests__/user-birthdate.test.ts` (yeni)

- [ ] **Step 1: Ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/users/me" -H "Authorization: Bearer $T" | jq -c '{birthDate}'
```

Beklenen: alan VAR (değeri `null` olabilir — varlık yeterli).

- [ ] **Step 2: Başarısız testi yaz**

`src/stores/__tests__/user-birthdate.test.ts`:

```ts
/**
 * Doğum tarihi sunucudan kullanıcıya taşınır.
 *
 * `mapApiUserToUser` kırk kadar alan haritalıyor, `birthDate`'i taşımıyordu.
 * Profil düzenleme ekranı (`useEditProfile.ts:54`) onu okuyor, yani alan HER
 * ZAMAN boş açılıyordu — ve form kaydedilince (satır 99) o boş değer geri
 * gönderiliyor, kayıtlı tarih sessizce siliniyordu.
 */
import { mapApiUserToUser } from '../authStore';

describe('mapApiUserToUser — birthDate', () => {
  it('sunucudan gelen doğum tarihini taşır', () => {
    expect(mapApiUserToUser({ id: 'u1', birthDate: '1990-01-15' } as any).birthDate)
      .toBe('1990-01-15');
  });

  it('alan null geldiğinde undefined bırakır — "1970-01-01" uydurmaz', () => {
    expect(mapApiUserToUser({ id: 'u1', birthDate: null } as any).birthDate).toBeUndefined();
  });

  it('alan hiç gelmediğinde de çökmez', () => {
    expect(mapApiUserToUser({ id: 'u1' } as any).birthDate).toBeUndefined();
  });
});
```

`mapApiUserToUser` dışa aktarılmamışsa bu adımda dışa aktar (test edilebilirlik
için; başka davranış değişmez).

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="user-birthdate" 2>&1 | tail -15`

- [ ] **Step 4: Haritalamayı ve tipi ekle**

`User` arayüzüne:
```ts
  /** `YYYY-MM-DD`. Profil düzenleme formu bunu ön-doldurur. */
  birthDate?: string;
```

`mapApiUserToUser` içine, diğer düz alanların yanına:
```ts
    birthDate: apiUser.birthDate ?? undefined,
```

- [ ] **Step 5: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add src/stores
git commit -m "fix(profile): carry birthDate through to the user

The mapper moved forty fields and not this one, so the edit-profile form always
opened with an empty date — and submitted that emptiness back, quietly clearing
whatever the account had stored."
```

---

### Task 6: Satış kartı satıcının payını göstersin (B2)

Satış listesi `sale.totalAmount` basıyor — ALICININ ödediği toplam (kargo + alıcı hizmet bedeli + KDV dahil). Satıcının gördüğü sayı olmamalı. Satış DETAYI zaten doğrusunu okuyor (`pricing.subtotal`).

> ⚠️ **Bu bir parite düzeltmesi DEĞİL.** Web'in en yakın karşılığı aynı alıcı toplamını basıyor; web yalnız sipariş KARTLARINDA `pricing.subtotal`'a geçti, satış özet listesinde geçmedi. Bu bir DOĞRULUK düzeltmesi — mobilin web'in bilinen hatasını miras almamasıdır. Commit mesajı bunu böyle söylemeli.

**Files:**
- Modify: `app/sales/_lib/types.ts` (`Sale` tipine `pricing`)
- Modify: `app/sales/_components/SaleCard.tsx` (satır 43)
- Test: `app/sales/__tests__/sale-card-amount.test.tsx` (yeni)

- [ ] **Step 1: Ölç**

```bash
API=https://staging.tarodan.com.tr/api
T=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$API/orders/seller?limit=3" -H "Authorization: Bearer $T" \
  | jq -c '[.data[]? | {totalAmount, subtotal: .pricing.subtotal, sellerNet: .pricing.sellerNetAmount}]'
```

Uç 404 dönerse gerçek yolu `src/lib/api/orders.ts`'ten oku. Beklenen: aynı
satırda `totalAmount` > `pricing.subtotal`.

- [ ] **Step 2: Başarısız testi yaz**

`app/sales/__tests__/sale-card-amount.test.tsx`:

```tsx
/**
 * Satış kartı SATICININ payını gösterir, alıcının ödediği toplamı değil.
 *
 * Kart `sale.totalAmount` basıyordu — kargo, alıcı hizmet bedeli ve KDV dahil,
 * alıcının ödediği rakam. Satıcı için anlamlı olan ürün bedeli; satış DETAYI
 * zaten `pricing.subtotal` okuyor. Ölçüldü: aynı siparişte
 * `{subtotal: 449.1, totalAmount: 557.6}` — `items[0].price` de 557.6, yani
 * yedek değil aynı yanlış tutar.
 *
 * NOT: bu düzeltme web'e yakınsamıyor, ondan AYRIŞIYOR — web'in satış özet
 * listesi de alıcı toplamını basıyor. Bu bir doğruluk düzeltmesi.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { SaleCard } from '../_components/SaleCard';

const sale = (over: Record<string, unknown> = {}) =>
  ({
    id: 's1',
    orderNumber: 'ORD-1',
    status: 'paid',
    totalAmount: 557.6,
    createdAt: '2026-08-01T00:00:00.000Z',
    product: { id: 'p1', title: 'Test' },
    ...over,
  }) as any;

describe('SaleCard tutarı', () => {
  it('ürün bedelini basar, alıcının toplamını DEĞİL', () => {
    render(<SaleCard sale={sale({ pricing: { subtotal: 449.1 } })} />);
    expect(screen.getByText('449,10 TL')).toBeTruthy();
    expect(screen.queryByText('557,60 TL')).toBeNull();
  });

  it('`pricing` hiç gelmediğinde çökmez ve uydurma sayı basmaz', () => {
    // Eski gövde şekli hâlâ dolaşımda olabilir. Para değeri istemcide
    // HESAPLANMAZ — alan yoksa yer tutucu basılır.
    const { toJSON } = render(<SaleCard sale={sale()} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.queryByText('557,60 TL')).toBeNull();
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="sale-card-amount" 2>&1 | tail -20`

- [ ] **Step 4: Tipi ve kartı düzelt**

`app/sales/_lib/types.ts`, `Sale` içine:
```ts
  /**
   * Sunucunun kırılımı. `subtotal` SATICININ ürün bedeli; `totalAmount` alıcının
   * ödediği toplam (kargo + alıcı hizmet bedeli + KDV) ve satıcı ekranında
   * yanıltıcı. Satış detayı da bu kırılımı okuyor.
   */
  pricing?: { subtotal?: number; sellerNetAmount?: number };
```

`SaleCard.tsx:43`:
```tsx
<Text variant="h3" style={styles.price}>
  {sale.pricing?.subtotal != null ? formatPrice(sale.pricing.subtotal) : '—'}
</Text>
```

- [ ] **Step 5: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add app/sales
git commit -m "fix(sales): show the seller their own figure, not the buyer's total

The card printed totalAmount — shipping, buyer service fee and VAT included —
on a screen the seller reads to see what they earned. The detail view already
reads pricing.subtotal; the list now does too.

This diverges from web rather than converging on it: web's sales summary prints
the same buyer total. It moved order cards to pricing.subtotal and left this
one behind, so matching it would mean inheriting the bug."
```

---

### Task 7: Hukuki künye gerçek tüzel kişiyi göstersin (B4)

Mesafeli satış sözleşmesi ve gizlilik metni "Tarodan Teknoloji A.Ş. / İstanbul / info@tarodan.com" diyor. Gerçek tüzel kişi ana repoda tek kaynakta yazılı ve farklı: **Serhatlar Oyuncak … Ltd. Şti., Torbalı/İZMİR, `destek@tarodan.com.tr`**. Mobil ayrıca yedi kutuyu `@tarodan.com` (yanlış TLD) olarak tanımlıyor.

> ⚠️ Bu bir hukuki metin. Değerler ana repodaki TEK KAYNAKTAN (`apps/web/src/lib/legal/platform-entity.ts`) **birebir** kopyalanır; hiçbiri uydurulmaz veya "düzeltilmez".

**Files:**
- Modify: `src/constants/legalFacts.ts`
- Modify: `app/distance-sales.tsx` (satır ~31-35)
- Modify: `app/privacy.tsx` (satır ~126)
- Test: `src/constants/__tests__/legalFacts.test.ts` (yeni)

- [ ] **Step 1: Tek kaynağı oku**

```bash
cd /Users/gorkemsubas/dev/tarodan-app && git fetch --all -q
git show origin/development:apps/web/src/lib/legal/platform-entity.ts
cd /Users/gorkemsubas/dev/tarodan-mobile
```

Çıkan değerleri AYNEN kullan.

- [ ] **Step 2: Başarısız testi yaz**

`src/constants/__tests__/legalFacts.test.ts`:

```ts
/**
 * Hukuki künye gerçek tüzel kişiyi gösterir.
 *
 * Mesafeli satış sözleşmesi ve gizlilik metni var olmayan bir şirket adı, yanlış
 * şehir ve MX kaydı olmayan bir alan adındaki e-posta kutularını yayınlıyordu.
 * Tüzel kişi bilgisi ana repoda tek kaynakta yazılı
 * (`apps/web/src/lib/legal/platform-entity.ts`) ve bu dosya onun kopyasıdır.
 *
 * Test alanların DOLU ve tutarlı olduğunu çiviliyor; doğruluk ancak tek kaynakla
 * karşılaştırarak korunur, o yüzden değerler elle DEĞİŞTİRİLMEZ.
 */
import { LEGAL_ENTITY, SUPPORT_EMAIL } from '../legalFacts';

describe('hukuki künye', () => {
  it('artık uydurma şirket adını taşımıyor', () => {
    expect(LEGAL_ENTITY.name).not.toMatch(/Tarodan Teknoloji A\.Ş\./);
  });

  it('e-posta kutuları doğru alan adında', () => {
    // `@tarodan.com` MX taşımıyor; gerçek alan adı `@tarodan.com.tr`.
    expect(SUPPORT_EMAIL).toMatch(/@tarodan\.com\.tr$/);
  });

  it('her künye alanı dolu — boş bir hukuki metin yayınlanmaz', () => {
    for (const [key, value] of Object.entries(LEGAL_ENTITY)) {
      expect(`${key}: ${String(value)}`.length).toBeGreaterThan(key.length + 2);
    }
  });

  it('ekranlar künyeyi bu sabitten okur, kendi metnini yazmaz', () => {
    for (const file of ['app/distance-sales.tsx', 'app/privacy.tsx']) {
      const source = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../..', file),
        'utf8',
      );
      expect(source).not.toMatch(/Tarodan Teknoloji A\.Ş\./);
      expect(source).not.toMatch(/@tarodan\.com[^.]/);
    }
  });
});
```

- [ ] **Step 3: Testi koş, düştüğünü gör**

Run: `npx jest --testPathPattern="legalFacts" 2>&1 | tail -20`

- [ ] **Step 4: Sabitleri tek kaynaktan güncelle**

`src/constants/legalFacts.ts`: `LEGAL_ENTITY` ve e-posta sabitlerini Step 1'de
okuduğun değerlerle değiştir. Dosyanın başına, değerlerin nereden geldiğini
söyleyen bir yorum koy:

```ts
/**
 * Hukuki künye — ana repodaki TEK KAYNAĞIN kopyası:
 * `apps/web/src/lib/legal/platform-entity.ts` (origin/development).
 *
 * Değerler burada DÜZENLENMEZ. Tüzel kişi bilgisi değişirse önce orada
 * değişir, sonra buraya kopyalanır — iki yerde bağımsız düzenlenen bir künye
 * tam olarak bu kusuru doğurdu.
 */
```

- [ ] **Step 5: İki ekranı sabite bağla**

`app/distance-sales.tsx` ve `app/privacy.tsx`: gömülü şirket adı/adres/e-posta
dizgilerini `LEGAL_ENTITY` alanlarıyla değiştir. Metin katalogdan geliyorsa
ICU argümanı olarak geç (`t('legal.sellerLine', { name: LEGAL_ENTITY.name })`),
dizgi birleştirme yapma.

- [ ] **Step 6: Kapılar + commit**

```bash
npx tsc --noEmit
npx eslint . --ext .ts,.tsx 2>/dev/null | tail -1
npx jest --silent 2>&1 | grep -aE "^(Test Suites|Tests):|FAIL"
git add src/constants app/distance-sales.tsx app/privacy.tsx
git commit -m "fix(legal): publish the real trading entity

The distance-selling contract and the privacy notice named a company that does
not exist, in the wrong city, with support addresses on a domain that has no MX
record. The entity is recorded once in the main repo; these constants are now a
copy of it, with a note saying so, because two independently edited copies are
what produced this."
```
