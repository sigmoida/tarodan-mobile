# Derin Bağlantı Doğrulama Paketi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `https://` linklerinin uygulamayı açması için gereken iki doğrulama dosyasını (`apple-app-site-association`, `assetlinks.json`) repodaki tek bir yol tablosundan üretmek, tabloyu `toMobileRoute` ile testle senkron tutmak ve web/infra'ya yorum gerektirmeyen bir teslim paketi bırakmak.

**Architecture:** `src/lib/deeplinks/paths.json` tek doğruluk kaynağıdır. `src/lib/deeplinks/index.ts` saf fonksiyonlarla (ağ yok, fs yok) tabloya tipli erişim + Android intent girdileri verir; **AASA/assetlinks üretimi yalnız `scripts/gen-wellknown.mjs`'dedir** (tek-uygulama tadili, Task 1). `scripts/*.mjs` yalnız I/O yapar. Jest testleri tabloyu üç ayrı bekçiyle kilitler: çözücü senkronu, gerçek rota varlığı, `app.json` senkronu.

**Tech Stack:** TypeScript (`resolveJsonModule: true`), Jest + jest-expo, Node ESM script'leri (`.mjs`, `scripts/gen-keys.mjs` deseni), Expo SDK 54 `app.json`.

**Spec:** `docs/superpowers/specs/2026-08-03-deep-links-design.md`

## Global Constraints

- Apple App ID: `P2628CQK26.com.tarodan.app` (Team ID `eas.json:80`, bundle `app.json` → `expo.ios.bundleIdentifier`).
- Android paket: `com.tarodan.app`. Tabloda tutulur ve testle `app.json` → `expo.android.package` ile eşitlenir — ikinci elle kopya olmaz.
- Alan adları: `tarodan.com.tr` ve `staging.tarodan.com.tr`. Aynı dosya ikisine de konur.
- `LOCALES = ['tr', 'en']`. Her yayınlanan desen çıplak + her locale ön ekli varyantıyla üretilir.
- **`app.json` → `expo.ios.associatedDomains` bu planda EKLENMEZ.** AASA 404 iken eklenirse iOS başarısızlığı önbelleğe alır. Kapı: spec §5.
- Dosya yolları `@/` alias'ıyla import edilir (CLAUDE.md §10).
- Renk/stil dokunuşu yok — bu plan hiç UI değiştirmiyor.
- Her task sonunda `npx tsc --noEmit` yeni hata üretmemeli (CLAUDE.md §13).

---

## Dosya Yapısı

| Dosya | Sorumluluk |
| --- | --- |
| `src/lib/deeplinks/paths.json` | **Veri.** Web yol tablosu + locale/appID/paket sabitleri. Kod yok. |
| `src/lib/deeplinks/index.ts` | **Saf fonksiyonlar.** Tabloyu tipli okur; Android intent girdileri (`buildAndroidPathEntries`), locale varyantları, URL→yol normalleştirme, dışlama eşleştirmesi. **AASA/assetlinks üretimi burada YOK** — tek uygulama `scripts/gen-wellknown.mjs`'de (tek-uygulama tadili, Task 1). Ağ ve fs yok → tam test edilebilir. |
| `src/lib/deeplinks/__tests__/paths.test.ts` | Çözücü senkronu, dışlama, locale, regresyon kilidi. |
| `src/lib/deeplinks/__tests__/routes.test.ts` | Çözülen rotanın `app/` ağacında gerçekten var olması. |
| `src/lib/deeplinks/__tests__/appConfig.test.ts` | `app.json` Android yolları + paket adı senkronu. |
| `src/utils/notificationRoute.ts` | Locale ön eki soyma (tek küçük ekleme). |
| `scripts/gen-wellknown.mjs` | `paths.json` → `docs/wellknown/*`. Yalnız I/O. |
| `scripts/check-deeplinks.mjs` | Yayındaki dosyaları ölçer (ağ). |
| `docs/wellknown/fingerprints.json` | Android SHA-256'ları — elle doldurulur. |
| `docs/wellknown/apple-app-site-association` | Üretilir, commit'lenir. |
| `docs/deep-links.md` | `docs/ios-universal-links.md`'nin yerine — teslim dökümanı. |

---

## Task 1: Yol tablosu ve saf üreteçler

**Files:**
- Create: `src/lib/deeplinks/paths.json`
- Create: `src/lib/deeplinks/index.ts`
- Test: `src/lib/deeplinks/__tests__/paths.test.ts`

**Interfaces:**
- Consumes: `toMobileRoute` from `@/utils/notificationRoute` (mevcut, imza `(link: string) => string | null`).
- Produces:
  - `type DeepLinkPath = { pattern: string; sample: string; include: boolean; confirmed: boolean; comment: string }`
  - `deepLinkConfig: { locales: string[]; appIDs: string[]; androidPackage: string; hosts: string[]; paths: DeepLinkPath[] }`
  - `shippablePaths(): DeepLinkPath[]` — `confirmed === true` olanlar
  - `pendingConfirmation(): DeepLinkPath[]` — `confirmed === false` olanlar
  - `withLocaleVariants(pattern: string): string[]`
  - `toAndroidPathEntry(pattern: string): AndroidPathEntry`
  - `buildAndroidPathEntries(): AndroidPathEntry[]`

> **AASA/assetlinks üretimi burada YOK — bilerek.** Tek uygulama `scripts/gen-wellknown.mjs`'de durur; `index.ts`'e ikinci bir kopya konmaz (CLAUDE.md §5). Üretilen dosyanın doğruluğu Task 4'te **özellik testleriyle** (her teyitli desen dosyada var, teyitsiz hiçbiri yok, dışlamalar başta) doğrulanır — ikinci bir üreteçle karşılaştırılarak değil. `buildAndroidPathEntries` burada kalır çünkü `app.json` script'le üretilmiyor; onun `.mjs` ikizi yok, kopya doğmuyor.

- [ ] **Step 1: Yol tablosunu yaz**

`src/lib/deeplinks/paths.json` — `sample` alanları `toMobileRoute`'a birebir verilecek gerçek URL'lerdir.

```json
{
  "locales": ["tr", "en"],
  "appIDs": ["P2628CQK26.com.tarodan.app"],
  "androidPackage": "com.tarodan.app",
  "hosts": ["tarodan.com.tr", "staging.tarodan.com.tr"],
  "paths": [
    { "pattern": "/checkout*", "sample": "/checkout", "include": false, "confirmed": true,
      "comment": "odeme web'de kalsin" },
    { "pattern": "/payment/*", "sample": "/payment/success", "include": false, "confirmed": true,
      "comment": "PayTR 3DS turu tarayicida baslar tarayicida biter" },
    { "pattern": "/admin/*", "sample": "/admin/users", "include": false, "confirmed": true,
      "comment": "yonetim paneli uygulamada yok" },
    { "pattern": "/api/*", "sample": "/api/products", "include": false, "confirmed": true,
      "comment": "API yuzeyi" },

    { "pattern": "/verify-email", "sample": "/verify-email?token=abc123", "include": true, "confirmed": true,
      "comment": "e-posta dogrulama linki -> (auth)/verify-email" },
    { "pattern": "/reset-password", "sample": "/reset-password?token=xyz", "include": true, "confirmed": true,
      "comment": "sifre sifirlama linki -> (auth)/reset-password" },
    { "pattern": "/forgot-password", "sample": "/forgot-password", "include": true, "confirmed": true,
      "comment": "sifremi unuttum -> (auth)/forgot-password" },
    { "pattern": "/corporate/invite", "sample": "/corporate/invite?token=inv-1", "include": true, "confirmed": true,
      "comment": "kurumsal davet -> (auth)/corporate-invite" },
    { "pattern": "/listings/*", "sample": "/listings/123", "include": true, "confirmed": true,
      "comment": "urun detayi -> product/[id]; /listings/:id/edit -> listing/[id]/edit" },
    { "pattern": "/collections/*", "sample": "/collections/9", "include": true, "confirmed": true,
      "comment": "koleksiyon -> collections/[id]" },
    { "pattern": "/trades/*", "sample": "/trades/5", "include": true, "confirmed": true,
      "comment": "web cogul -> mobil trade/[id]" },
    { "pattern": "/track-order", "sample": "/track-order?orderNumber=ORD-1&email=a%40b.com", "include": true, "confirmed": true,
      "comment": "misafir takip -> order-track" },
    { "pattern": "/messages", "sample": "/messages?thread=42", "include": true, "confirmed": true,
      "comment": "mesajlar; ?thread= -> messages/[threadId]" },
    { "pattern": "/offers", "sample": "/offers?tab=received", "include": true, "confirmed": true,
      "comment": "teklifler -> offers" },
    { "pattern": "/profile/orders/*", "sample": "/profile/orders/12", "include": true, "confirmed": true,
      "comment": "siparis detayi -> orders/[id]" },
    { "pattern": "/profile/refund-requests/*", "sample": "/profile/refund-requests/7", "include": true, "confirmed": true,
      "comment": "iade detayi -> refund-requests/[id]" },
    { "pattern": "/profile/trades/*", "sample": "/profile/trades/5", "include": true, "confirmed": true,
      "comment": "takas detayi -> trade/[id]" },
    { "pattern": "/profile/listings", "sample": "/profile/listings", "include": true, "confirmed": true,
      "comment": "ilanlarim -> settings/my-listings" },
    { "pattern": "/profile/earnings", "sample": "/profile/earnings", "include": true, "confirmed": true,
      "comment": "kazanclar -> settings/payments" },
    { "pattern": "/profile", "sample": "/profile", "include": true, "confirmed": true,
      "comment": "profil -> (tabs)/profile" },

    { "pattern": "/seller/*", "sample": "/seller/12", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi VE mobilde seller/[id] rotasi yok" },
    { "pattern": "/category/*", "sample": "/category/tofas", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi; toMobileRoute eslemesi yok" },
    { "pattern": "/brands/*", "sample": "/brands/bmw", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi; toMobileRoute eslemesi yok" },
    { "pattern": "/sayfa/*", "sample": "/sayfa/hakkimizda", "include": true, "confirmed": false,
      "comment": "TEYIT: CMS sayfalari; toMobileRoute eslemesi yok" },
    { "pattern": "/membership", "sample": "/membership", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi; toMobileRoute eslemesi yok" },
    { "pattern": "/pricing", "sample": "/pricing", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi (mobil rota var, cozucu geciriyor)" },
    { "pattern": "/favorites", "sample": "/favorites", "include": true, "confirmed": false,
      "comment": "TEYIT: web yolu dogrulanmadi (mobil rota var, cozucu geciriyor)" }
  ]
}
```

> `comment` alanları ASCII — üretilen AASA dosyasına aynen giriyor ve bazı CDN'ler
> UTF-8 gövdeyi yeniden kodlayarak byte-exact karşılaştırmayı bozabiliyor.

- [ ] **Step 2: Başarısız testi yaz**

`src/lib/deeplinks/__tests__/paths.test.ts`:

```ts
/**
 * Web yol tablosu ile toMobileRoute arasindaki senkron. Bu tablo AASA ve
 * assetlinks.json'un TEK kaynagi; elle yazilan ikinci bir liste yok.
 */
import { toMobileRoute } from '@/utils/notificationRoute';
import {
  deepLinkConfig,
  shippablePaths,
  pendingConfirmation,
  withLocaleVariants,
  toAndroidPathEntry,
} from '../index';

const shipped = shippablePaths();
const included = shipped.filter((p) => p.include);
const excluded = shipped.filter((p) => !p.include);

describe('paths.json — cozucu senkronu', () => {
  it('yayinlanacak en az bir yol var', () => {
    expect(included.length).toBeGreaterThan(0);
  });

  it.each(included.map((p) => [p.pattern, p.sample]))(
    'teyitli %s ornegi (%s) bir mobil rotaya cozulur',
    (_pattern, sample) => {
      expect(toMobileRoute(sample)).not.toBeNull();
    },
  );

  it.each(excluded.map((p) => [p.pattern, p.sample]))(
    'dislanan %s ornegi (%s) cozulmez',
    (_pattern, sample) => {
      expect(toMobileRoute(sample)).toBeNull();
    },
  );

  it('teyit bekleyen satirlar tabloda durur (sessizce silinmez)', () => {
    expect(pendingConfirmation().length).toBeGreaterThan(0);
  });
});

describe('paths.json — regresyon kilidi', () => {
  // Eski docs/ios-universal-links.md listesi MOBIL rota adlariyla yazilmisti.
  // Bunlar web URL'si degil; yayinlansaydi Apple dosyayi kabul eder, linkler
  // yine Safari'de acilirdi. Tabloya geri sizmalarini engelle.
  const MOBILE_ONLY = [
    '/order-track',
    '/corporate-invite',
    '/trade/5',
    '/product/123',
  ];

  it.each(MOBILE_ONLY)('%s bir WEB yolu degil, tabloda yer almaz', (sample) => {
    const patterns = deepLinkConfig.paths.map((p) => p.pattern);
    const head = `/${sample.split('/').filter(Boolean)[0]}`;
    expect(patterns).not.toContain(head);
    expect(patterns).not.toContain(`${head}/*`);
    expect(patterns).not.toContain(`${head}*`);
  });
});

describe('locale varyantlari', () => {
  it('cipiak + her locale onekli varyanti uretir', () => {
    expect(withLocaleVariants('/listings/*')).toEqual([
      '/listings/*',
      '/tr/listings/*',
      '/en/listings/*',
    ]);
  });
});

describe('Android yol girdisi donusumu', () => {
  it('* ile biten deseni pathPrefix yapar', () => {
    expect(toAndroidPathEntry('/listings/*')).toEqual({ pathPrefix: '/listings/' });
  });

  it('* olmayan deseni path yapar', () => {
    expect(toAndroidPathEntry('/track-order')).toEqual({ path: '/track-order' });
  });
});

describe('tablo sabitleri', () => {
  it('appIDs Team ID + bundle birlesimidir', () => {
    expect(deepLinkConfig.appIDs).toEqual(['P2628CQK26.com.tarodan.app']);
  });

  it('her iki alan adi da sayilir', () => {
    expect(deepLinkConfig.hosts).toEqual(['tarodan.com.tr', 'staging.tarodan.com.tr']);
  });
});
```

> AASA ve assetlinks üretimine dair testler burada **yok** — üretim `.mjs`
> script'inde ve testleri Task 4'te üretilen dosyanın üstünde koşuyor.

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npx jest src/lib/deeplinks --no-coverage`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 4: `index.ts`'i yaz**

```ts
/**
 * Derin baglanti yol tablosu — AASA, assetlinks.json ve app.json Android
 * intent filter'larinin TEK kaynagi. Saf: ag ve fs erisimi yok.
 *
 * Neden tek kaynak: eski docs/ios-universal-links.md listesi elle yazilmisti ve
 * MOBIL rota adlarina kaymisti (/product/* vs web /listings/:id). Dosya oyle
 * yayinlansaydi Apple onu kabul eder, dogrulama yesil gorunur, linklerin cogu
 * yine Safari'de acilirdi.
 */
import raw from './paths.json';

export type DeepLinkPath = {
  /** Web URL deseni — AASA components + Android path girdisi kaynagi. */
  pattern: string;
  /** Gercek ornek URL — testte toMobileRoute'a birebir verilir. */
  sample: string;
  /** false → tarayicida kalsin. Dislama da bir karardir, tabloda durur. */
  include: boolean;
  /** Web'de var oldugu teyitli mi. false → uretilen dosyalara girmez. */
  confirmed: boolean;
  comment: string;
};

export type DeepLinkConfig = {
  locales: string[];
  appIDs: string[];
  androidPackage: string;
  hosts: string[];
  paths: DeepLinkPath[];
};

export type AndroidPathEntry = { path: string } | { pathPrefix: string };

// resolveJsonModule JSON'u dar literal tiplerle cikarir; DeepLinkConfig'e
// dogrudan cast TS'i rahatsiz ederse `raw as unknown as DeepLinkConfig` kullan.
export const deepLinkConfig = raw as DeepLinkConfig;

export const shippablePaths = (): DeepLinkPath[] =>
  deepLinkConfig.paths.filter((p) => p.confirmed);

export const pendingConfirmation = (): DeepLinkPath[] =>
  deepLinkConfig.paths.filter((p) => !p.confirmed);

/** `/listings/*` → ['/listings/*', '/tr/listings/*', '/en/listings/*'] */
export function withLocaleVariants(pattern: string): string[] {
  return [pattern, ...deepLinkConfig.locales.map((l) => `/${l}${pattern}`)];
}

// AASA/assetlinks uretimi BILEREK burada degil: tek uygulama
// scripts/gen-wellknown.mjs'de. Buraya bir kopya konursa iki taraf ayri ayri
// bakim ister ve sessizce ayrisir — tam da elle yazilan AASA listesinin
// basina gelen sey. Uretilen dosyanin dogrulugu paths.test.ts'te ozellik
// testleriyle olculur.

export function toAndroidPathEntry(pattern: string): AndroidPathEntry {
  return pattern.endsWith('*')
    ? { pathPrefix: pattern.slice(0, -1) }
    : { path: pattern };
}

/** Android'de dislama kavrami yok: listelenmeyen yol zaten talep edilmez. */
export function buildAndroidPathEntries(): AndroidPathEntry[] {
  return shippablePaths()
    .filter((p) => p.include)
    .flatMap((p) => withLocaleVariants(p.pattern).map(toAndroidPathEntry));
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx jest src/lib/deeplinks --no-coverage`
Expected: PASS.

- [ ] **Step 6: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: Tracked baseline'ın üstünde yeni hata yok.

- [ ] **Step 7: Commit**

```bash
git add src/lib/deeplinks
git commit -m "feat(deeplinks): make the web path table the single source

The AASA draft was hand-written against mobile route names, so publishing it
would verify green and still send most links to Safari. Put the table in the
repo, generate every artifact from it, and let a test tie each sample to
toMobileRoute so the two cannot drift again."
```

---

## Task 2: Locale ön ekini çözücüde soy

**Files:**
- Modify: `src/utils/notificationRoute.ts:12-16`
- Test: `src/utils/__tests__/notificationRoute.test.ts` (mevcut dosyaya ekleme)

**Interfaces:**
- Consumes: `deepLinkConfig.locales` from `@/lib/deeplinks` (Task 1).
- Produces: `toMobileRoute` artık `/en/listings/123` gibi locale ön ekli web URL'lerini de çözer. İmza değişmez.

**Neden:** Web `apps/web/src/app/[locale]/…` yapısında. `/en/listings/123` uygulamaya teslim edilirse bugün `null` döner — uygulama açılır, hiçbir yere gitmez. AASA locale varyantlarını yayınlıyorsa çözücü de onları anlamak zorunda.

- [ ] **Step 1: Başarısız testi yaz**

`src/utils/__tests__/notificationRoute.test.ts` dosyasının sonuna ekle:

```ts
describe('toMobileRoute — locale oneki', () => {
  it('en onekli urun linkini cozer', () => {
    expect(toMobileRoute('/en/listings/123')).toBe('/product/123');
  });

  it('tr onekli urun linkini cozer', () => {
    expect(toMobileRoute('/tr/listings/123')).toBe('/product/123');
  });

  it('onekli sorgu parametresini korur', () => {
    expect(toMobileRoute('/en/verify-email?token=abc')).toBe('/verify-email?token=abc');
  });

  it('onekli dislanan yolu yine cozmez', () => {
    expect(toMobileRoute('/en/payment/success')).toBeNull();
  });

  it('locale olmayan ilk segmenti soymaz', () => {
    // /offers bir rota; yanlislikla "locale" sanilip soyulursa /offers kaybolur
    expect(toMobileRoute('/offers')).toBe('/offers');
  });

  it('cipiak locale kokunu profil sekmesine dusurmez', () => {
    // /en tek basina bir icerik yolu degil → eslesme yok
    expect(toMobileRoute('/en')).toBeNull();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx jest src/utils/__tests__/notificationRoute.test.ts --no-coverage`
Expected: FAIL — `/en/listings/123` için `null` döndü, `/product/123` bekleniyordu.

- [ ] **Step 3: Soyma mantığını ekle**

`src/utils/notificationRoute.ts` içinde, dosya başına import ekle:

```ts
import { deepLinkConfig } from '@/lib/deeplinks';
```

`toMobileRoute` gövdesinde `const path = rawPath.replace(/\/+$/, '');` satırını şununla değiştir:

```ts
  const rawPathNoSlash = rawPath.replace(/\/+$/, '');
  // Web [locale] segmenti: /en/listings/123 → /listings/123. YALNIZ segment tam
  // olarak bilinen bir locale ise soyulur; rota agacinda ilk segmenti tr/en olan
  // rota yok, carpisma riski yok. Cipiak /en kok sayfasidir, esleme uretmez.
  const seg0 = rawPathNoSlash.split('/')[1];
  const path =
    seg0 && deepLinkConfig.locales.includes(seg0)
      ? rawPathNoSlash.slice(seg0.length + 1)
      : rawPathNoSlash;
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx jest src/utils/__tests__/notificationRoute.test.ts --no-coverage`
Expected: PASS — mevcut 11 test dahil hepsi yeşil.

- [ ] **Step 5: Locale varyantı bekçisini tabloya bağla**

`src/lib/deeplinks/__tests__/paths.test.ts` içindeki `paths.json — cozucu senkronu` describe'ına ekle:

```ts
  it.each(
    included.flatMap((p) =>
      deepLinkConfig.locales.map((l) => [l, p.pattern, `/${l}${p.sample}`] as const),
    ),
  )('%s onekli %s ornegi (%s) de cozulur', (_locale, _pattern, sample) => {
    expect(toMobileRoute(sample)).not.toBeNull();
  });
```

- [ ] **Step 6: Tüm etkilenen testleri koş**

Run: `npx jest src/lib/deeplinks src/utils/__tests__/notificationRoute.test.ts --no-coverage`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/notificationRoute.ts src/utils/__tests__/notificationRoute.test.ts src/lib/deeplinks/__tests__/paths.test.ts
git commit -m "fix(deeplinks): resolve locale-prefixed web URLs

The web routes under [locale], so /en/listings/123 is a real URL a user can
tap. It resolved to null: the app opened and went nowhere. Strip a leading
segment only when it is exactly a known locale."
```

---

## Task 3: Çözülen rota gerçekten var mı

**Files:**
- Create: `src/lib/deeplinks/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `shippablePaths()` (Task 1), `toMobileRoute` (Task 2 sonrası hâli).
- Produces: yok (yalnız bekçi).

**Neden:** "Uygulama açıldı" ile "doğru ekran açıldı" farklı şeyler. Çözücü var olmayan bir rota döndürürse (`case 'seller'` → `/seller/12`, ama `app/` altında `seller/[id]` yok) kullanıcı 404 ekranı görür. Test `app/` ağacını fs ile tarar — ikinci bir liste tutmaz.

- [ ] **Step 1: Testi yaz**

```ts
/**
 * Cozulen rotanin app/ agacinda gercekten var olmasi. "Uygulama acildi" ile
 * "dogru ekran acildi" ayni sey degil; bu test ikincisini kilitler.
 */
import fs from 'fs';
import path from 'path';
import { toMobileRoute } from '@/utils/notificationRoute';
import { shippablePaths } from '../index';

const APP_DIR = path.join(__dirname, '../../../../app');

/** app/ agacindaki rota desenlerini toplar: app/product/[id]/index.tsx → /product/[id] */
function collectRoutePatterns(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectRoutePatterns(full, `${prefix}/${entry.name}`));
    } else if (entry.name.endsWith('.tsx')) {
      const base = entry.name.replace(/\.tsx$/, '');
      out.push(base === 'index' ? prefix || '/' : `${prefix}/${base}`);
    }
  }
  return out;
}

/** Rota gruplarini ((tabs), (auth)) ve sorgu dizisini atar. */
function segments(route: string): string[] {
  return route
    .split('?')[0]
    .split('/')
    .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')));
}

const PATTERNS = collectRoutePatterns(APP_DIR);

function routeExists(route: string): boolean {
  const target = segments(route);
  return PATTERNS.some((pattern) => {
    const segs = segments(pattern);
    if (segs.length !== target.length) return false;
    return segs.every((s, i) => s.startsWith('[') || s === target[i]);
  });
}

describe('cozulen rota app/ agacinda var', () => {
  it('rota agaci okunabildi', () => {
    expect(PATTERNS.length).toBeGreaterThan(50);
  });

  const included = shippablePaths().filter((p) => p.include);

  it.each(included.map((p) => [p.pattern, p.sample]))(
    '%s ornegi (%s) var olan bir rotaya cozulur',
    (_pattern, sample) => {
      const route = toMobileRoute(sample);
      expect(route).not.toBeNull();
      expect({ sample, route, exists: routeExists(route!) }).toEqual({
        sample,
        route,
        exists: true,
      });
    },
  );
});
```

> `toEqual` ile obje karşılaştırması bilinçli: test kırmızı olduğunda hangi
> örneğin hangi rotaya çözüldüğü hata çıktısında görünür, yalnız `false` değil.

- [ ] **Step 2: Testi koş**

Run: `npx jest src/lib/deeplinks/__tests__/routes.test.ts --no-coverage`
Expected: PASS. Kırmızı çıkarsa, hata çıktısındaki `route` alanı hangi eşlemenin bozuk olduğunu söyler.

**Eğer kırmızı çıkarsa kapsam kuralı:** yalnız `confirmed: true` + `include: true` satırını bozan eşleme bu turda düzeltilir. Başka bir eşleme bozuksa (ör. `/seller/*`, ki tabloda `confirmed: false`) Task 7'de `docs/deep-links.md`'ye takip maddesi olarak yazılır — bu planda düzeltilmez.

- [ ] **Step 3: Commit**

```bash
git add src/lib/deeplinks/__tests__/routes.test.ts
git commit -m "test(deeplinks): assert every shipped path lands on a real screen

A resolver can return a route that no longer exists, and the user gets a 404
screen instead of the product. Walk app/ at test time rather than keeping a
second list that would drift the same way the AASA list did."
```

---

## Task 4: Well-known dosyalarını üret

**Files:**
- Create: `scripts/gen-wellknown.mjs`
- Create: `docs/wellknown/fingerprints.json`
- Create: `docs/wellknown/apple-app-site-association` (üretilir, commit'lenir)
- Modify: `package.json` (`scripts` bölümü)
- Test: `src/lib/deeplinks/__tests__/paths.test.ts` (drift testi ekleme)

**Interfaces:**
- Consumes: `src/lib/deeplinks/paths.json` (Task 1) — script onu doğrudan okur; testler `shippablePaths()`, `pendingConfirmation()`, `withLocaleVariants()`, `deepLinkConfig` kullanır.
- Produces: `pnpm gen:wellknown` komutu; `docs/wellknown/apple-app-site-association` dosyası.

**Not — üretim mantığının TEK yeri burasıdır.** `index.ts`'te AASA/assetlinks üreteci yok (Task 1). Script `paths.json`'ı okur ve dosyaları üretir; doğruluğu Step 5'teki **özellik testleriyle** ölçülür — üretilen dosyanın kendisi üstünde, ikinci bir üreteçle karşılaştırılarak değil. Böylece kopya doğmaz (CLAUDE.md §5) ve drift koruması kalır: tabloya satır eklenip `wellknown:gen` koşulmazsa "her teyitli desen dosyada var" testi kırmızı olur.

- [ ] **Step 1: Parmak izi dosyasını oluştur**

`docs/wellknown/fingerprints.json`:

```json
{
  "eas_upload_keystore": {
    "sha256": "",
    "source": "eas credentials -p android --profile production → Keystore → SHA256 Fingerprint"
  },
  "play_app_signing": {
    "sha256": "",
    "source": "Play Console → Test and release → App integrity → App signing key certificate → SHA-256"
  }
}
```

> `play_app_signing` bugün boş ve **boş kalmalı** — uygulama henüz Play'de değil.
> İlk mağaza yüklemesinden sonra doldurulması zorunlu; doldurulmazsa mağazadan
> kuran herkeste Android doğrulaması düşer.

- [ ] **Step 2: Üreteç script'ini yaz**

`scripts/gen-wellknown.mjs`:

```js
#!/usr/bin/env node
/**
 * paths.json → docs/wellknown/{apple-app-site-association, assetlinks.json}
 *
 * Uretim mantiginin TEK yeri burasi. src/lib/deeplinks/index.ts'te AASA/
 * assetlinks ureteci BILEREK yok — ikinci bir kopya iki tarafi ayri bakima
 * mahkum eder ve sessizce ayrisir. Uretilen dosyanin dogrulugu paths.test.ts'te
 * OZELLIK testleriyle olculur (her teyitli desen dosyada var, teyitsiz hicbiri
 * yok, dislamalar basta) — ikinci bir ureteçle karsilastirilarak degil.
 *
 * Kullanim:
 *   node scripts/gen-wellknown.mjs           # parmak izi yoksa UYARI + cikis 0
 *   node scripts/gen-wellknown.mjs --strict  # parmak izi yoksa HATA + cikis 1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/wellknown');
const strict = process.argv.includes('--strict');

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/lib/deeplinks/paths.json'), 'utf8'),
);

const withLocaleVariants = (pattern) => [
  pattern,
  ...config.locales.map((l) => `/${l}${pattern}`),
];

const shipped = config.paths.filter((p) => p.confirmed);
// AASA v2: ilk eslesen component kazanir → dislamalar basa.
const ordered = [
  ...shipped.filter((p) => !p.include),
  ...shipped.filter((p) => p.include),
];
const components = ordered.flatMap((p) =>
  withLocaleVariants(p.pattern).map((pattern) =>
    p.include
      ? { '/': pattern, comment: p.comment }
      : { '/': pattern, exclude: true, comment: p.comment },
  ),
);
const aasa = {
  applinks: { details: [{ appIDs: config.appIDs, components }] },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const aasaPath = path.join(OUT_DIR, 'apple-app-site-association');
fs.writeFileSync(aasaPath, `${JSON.stringify(aasa, null, 2)}\n`);
console.log(`yazildi: ${path.relative(ROOT, aasaPath)} (${components.length} component)`);

const fingerprintsFile = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, 'fingerprints.json'), 'utf8'),
);
const fingerprints = Object.values(fingerprintsFile)
  .map((f) => f.sha256)
  .filter((s) => s && s.trim().length > 0);

const assetLinksPath = path.join(OUT_DIR, 'assetlinks.json');
if (fingerprints.length === 0) {
  // Bos sha256_cert_fingerprints yayinlanirsa Android dogrulamasi "basarisiz"
  // olarak KESINLESIR — hic dosya olmamasindan kotudur.
  if (fs.existsSync(assetLinksPath)) fs.rmSync(assetLinksPath);
  const message =
    'assetlinks.json YAZILMADI — hic parmak izi yok. ' +
    'docs/wellknown/fingerprints.json doldurulmali (eas credentials -p android).';
  if (strict) {
    console.error(`HATA: ${message}`);
    process.exit(1);
  }
  console.warn(`UYARI: ${message}`);
} else {
  const statements = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  fs.writeFileSync(assetLinksPath, `${JSON.stringify(statements, null, 2)}\n`);
  console.log(
    `yazildi: ${path.relative(ROOT, assetLinksPath)} (${fingerprints.length} parmak izi)`,
  );
}

const pending = config.paths.filter((p) => !p.confirmed);
if (pending.length > 0) {
  console.warn(
    `UYARI: ${pending.length} yol TEYIT bekliyor, yayina konmadi: ` +
      pending.map((p) => p.pattern).join(', '),
  );
}
```

- [ ] **Step 3: Script'i koş ve çıktıyı gör**

Run: `node scripts/gen-wellknown.mjs`
Expected: exit 0. Çıktıda `yazildi: docs/wellknown/apple-app-site-association`, ardından `UYARI: assetlinks.json YAZILMADI` ve `UYARI: 7 yol TEYIT bekliyor`.

Run: `node scripts/gen-wellknown.mjs --strict`
Expected: exit 1, `HATA: assetlinks.json YAZILMADI`.

- [ ] **Step 4: package.json script'lerini ekle**

`package.json` → `scripts` içine, `i18n:codegen` satırının yanına:

```json
    "wellknown:gen": "node scripts/gen-wellknown.mjs",
    "wellknown:check": "node scripts/check-deeplinks.mjs"
```

> `wellknown:check` Task 6'da yazılacak script'i gösterir; ikisi tek yerde
> dursun diye şimdi ekleniyor.

- [ ] **Step 5: Üretilen dosyanın özellik testlerini yaz**

`src/lib/deeplinks/__tests__/paths.test.ts` sonuna ekle. Bu testler dosyanın
**kendisini** sorgular; ikinci bir üreteç yazmaz.

```ts
describe('uretilen AASA dosyasi', () => {
  const fs = require('fs');
  const path = require('path');
  const FILE = path.join(
    __dirname,
    '../../../../docs/wellknown/apple-app-site-association',
  );
  const aasa = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const detail = aasa.applinks.details[0];
  const components: Array<{ '/': string; exclude?: boolean }> = detail.components;
  const patterns = components.map((c) => c['/']);

  it('appIDs Team ID + bundle birlesimidir', () => {
    expect(detail.appIDs).toEqual(deepLinkConfig.appIDs);
  });

  // Tabloya satir eklenip `pnpm wellknown:gen` kosulmazsa bu test kirmizi olur.
  it.each(
    shippablePaths().flatMap((p) =>
      withLocaleVariants(p.pattern).map((v) => [p.pattern, v] as const),
    ),
  )('%s icin %s varyanti dosyada var', (_pattern, variant) => {
    expect(patterns).toContain(variant);
  });

  it.each(pendingConfirmation().map((p) => [p.pattern]))(
    'teyit bekleyen %s dosyaya girmemis',
    (pattern) => {
      expect(patterns).not.toContain(pattern);
    },
  );

  it('dislamalar listenin basinda (AASA v2: ilk eslesen kazanir)', () => {
    const firstInclude = components.findIndex((c) => c.exclude !== true);
    const lastExclude = components.map((c) => c.exclude === true).lastIndexOf(true);
    expect(lastExclude).toBeLessThan(firstInclude);
  });

  it('dislanan her yol exclude bayragiyla isaretli', () => {
    const excludedPatterns = shippablePaths()
      .filter((p) => !p.include)
      .flatMap((p) => withLocaleVariants(p.pattern));
    for (const pattern of excludedPatterns) {
      expect(components.find((c) => c['/'] === pattern)?.exclude).toBe(true);
    }
  });
});
```

- [ ] **Step 6: Testin geçtiğini gör**

Run: `npx jest src/lib/deeplinks --no-coverage`
Expected: PASS. Kırmızı çıkarsa `node scripts/gen-wellknown.mjs` çalıştırılmamış demektir.

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-wellknown.mjs docs/wellknown package.json src/lib/deeplinks/__tests__/paths.test.ts
git commit -m "feat(deeplinks): generate the well-known files from the table

Hand-maintaining these is what put mobile route names in the AASA draft.
The generator refuses to write assetlinks.json with an empty fingerprint
list, because publishing that makes Android verification fail for good --
worse than having no file at all."
```

---

## Task 5: Android intent filter'ını yollarla daralt

**Files:**
- Modify: `app.json` → `expo.android.intentFilters`
- Test: `src/lib/deeplinks/__tests__/appConfig.test.ts`

**Interfaces:**
- Consumes: `buildAndroidPathEntries()`, `deepLinkConfig` (Task 1).
- Produces: yok.

**Neden:** `intentFilters.data` bugün yalnız `scheme` + `host`; yol kısıtı yok. `assetlinks.json` yayına girdiği an uygulama `/checkout` ve `/payment/*` dahil host'un **her** yolunu talep eder. iOS'ta bilerek dışlanan şey Android'de açık kalıyor. Risk in-app WebView değil (WebView navigasyonu intent filter'a düşmez); e-posta/SMS/Chrome'dan gelen dış tıklama — 3DS turunun ortasında uygulamaya atlar.

Android `<data>` elemanlarının nitelikleri birleştirilir: URI'nin scheme'i scheme kümesinde, host'u host kümesinde, yolu yol kümesinde ise eşleşir. Bu yüzden scheme bir kez, host'lar birer kez, yollar birer kez yazılır.

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/deeplinks/__tests__/appConfig.test.ts`:

```ts
/**
 * app.json Android intent filter'i ile yol tablosunun senkronu. app.json elle
 * duzenlenen bir dosya oldugu icin uretilmiyor; bekcisi bu test.
 */
import appJson from '../../../../app.json';
import { buildAndroidPathEntries, deepLinkConfig } from '../index';

// app.json src/ disinda; tsconfig include'u onu kapsamiyorsa
// `const appJson = require('../../../../app.json');` ile oku.

const android = (appJson as any).expo.android;
const filter = android.intentFilters[0];
const data: Array<Record<string, string>> = filter.data;

describe('app.json — Android App Links', () => {
  it('paket adi tabloyla ayni (tek kaynak)', () => {
    expect(android.package).toBe(deepLinkConfig.androidPackage);
  });

  it('autoVerify acik', () => {
    expect(filter.autoVerify).toBe(true);
  });

  it('scheme bir kez, her host bir kez bildirilir', () => {
    expect(data.filter((d) => d.scheme).map((d) => d.scheme)).toEqual(['https']);
    expect(data.filter((d) => d.host).map((d) => d.host)).toEqual(deepLinkConfig.hosts);
  });

  it('yol girdileri tablodan uretilenle birebir ayni', () => {
    const declared = data.filter((d) => d.path || d.pathPrefix);
    expect(declared).toEqual(buildAndroidPathEntries());
  });

  it('odeme ve checkout yollarini TALEP ETMEZ', () => {
    const prefixes = data.map((d) => d.pathPrefix ?? d.path ?? '');
    expect(prefixes.some((p) => p.startsWith('/payment'))).toBe(false);
    expect(prefixes.some((p) => p.startsWith('/checkout'))).toBe(false);
  });

  it('host genelini talep eden yolsuz bir data girdisi kalmadi', () => {
    // Eski hali: {scheme, host} tek objede, yol kisiti yok → tum host talep edilir
    const hostWithScheme = data.filter((d) => d.scheme && d.host);
    expect(hostWithScheme).toEqual([]);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx jest src/lib/deeplinks/__tests__/appConfig.test.ts --no-coverage`
Expected: FAIL — `yol girdileri tablodan uretilenle birebir ayni` boş dizi aldı, ve `host genelini talep eden yolsuz bir data girdisi kalmadi` iki girdi buldu.

- [ ] **Step 3: Üretilecek `data` dizisini yazdır**

Run:

```bash
node -e "
const c=require('./src/lib/deeplinks/paths.json');
const v=p=>[p,...c.locales.map(l=>'/'+l+p)];
const e=p=>p.endsWith('*')?{pathPrefix:p.slice(0,-1)}:{path:p};
const paths=c.paths.filter(p=>p.confirmed&&p.include).flatMap(p=>v(p.pattern).map(e));
console.log(JSON.stringify([{scheme:'https'},...c.hosts.map(h=>({host:h})),...paths],null,2));
"
```

Çıktıyı `app.json` → `expo.android.intentFilters[0].data` dizisinin **yerine** yapıştır. `action`, `autoVerify`, `category` alanlarına dokunma.

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npx jest src/lib/deeplinks --no-coverage`
Expected: PASS.

- [ ] **Step 5: Üretilen manifest'i doğrula**

`/android` gitignore'da (prebuild çıktısı), tracked dosya bozulmaz.

Run:
```bash
npx expo prebuild --platform android --no-install
grep -c 'android:pathPrefix\|android:path=' android/app/src/main/AndroidManifest.xml
grep -c 'android:host' android/app/src/main/AndroidManifest.xml
```
Expected: yol sayısı `buildAndroidPathEntries().length` ile aynı, host sayısı 2. Manifest'te `/payment` veya `/checkout` geçmemeli:
```bash
grep -c 'payment\|checkout' android/app/src/main/AndroidManifest.xml
```
Expected: `0`.

- [ ] **Step 6: Prebuild çıktısını temizle**

Run: `rm -rf android`
(Gitignore'da olduğu için commit'e girmez; yine de artık bırakma.)

- [ ] **Step 7: Commit**

```bash
git add app.json src/lib/deeplinks/__tests__/appConfig.test.ts
git commit -m "fix(android): stop claiming every path on the host

The shipped intent filter declared only scheme and host, so once
assetlinks.json goes live the app would capture /checkout and /payment/*
too -- the exact paths iOS deliberately excludes. A PayTR return URL tapped
from an email would jump into the app mid-3DS. Narrow it to the table, and
land it before the verification file, not after."
```

---

## Task 6: Yayındaki dosyaları ölçen kontrol script'i

**Files:**
- Create: `scripts/check-deeplinks.mjs`

**Interfaces:**
- Consumes: `docs/wellknown/*`, `src/lib/deeplinks/paths.json`.
- Produces: `pnpm wellknown:check` (Task 4 Step 4'te package.json'a eklendi).

- [ ] **Step 1: Script'i yaz**

`scripts/check-deeplinks.mjs`:

```js
#!/usr/bin/env node
/**
 * Yayindaki dogrulama dosyalarini olcer. Tek basina "dosya var mi" yetmez:
 * Apple yonlendirmeyi ve yanlis content-type'i SESSIZCE reddeder, cihazlar
 * dosyayi origin'den degil Apple CDN'inden ceker, Android tarafinda eksik
 * parmak izi dogrulamayi sessizce dusurur. Hepsini ayri ayri sorar.
 *
 * Kullanim: node scripts/check-deeplinks.mjs
 * Cikis kodu: herhangi bir kontrol basarisizsa 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/wellknown');
const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/lib/deeplinks/paths.json'), 'utf8'),
);

const results = [];
const record = (host, check, ok, detail) => results.push({ host, check, ok, detail });

const readLocal = (name) => {
  const file = path.join(OUT_DIR, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

async function fetchNoRedirect(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const body = res.status === 200 ? await res.text() : '';
    return { status: res.status, type: res.headers.get('content-type') ?? '', body };
  } catch (err) {
    return { status: 0, type: '', body: '', error: String(err) };
  }
}

const expectedAasa = readLocal('apple-app-site-association');
const expectedLinks = readLocal('assetlinks.json');

for (const host of config.hosts) {
  const aasa = await fetchNoRedirect(`https://${host}/.well-known/apple-app-site-association`);
  record(host, 'AASA 200', aasa.status === 200, `HTTP ${aasa.status}${aasa.error ?? ''}`);
  record(host, 'AASA content-type json', aasa.type.includes('application/json'), aasa.type || '(yok)');
  record(host, 'AASA yonlendirme yok', ![301, 302, 303, 307, 308].includes(aasa.status), `HTTP ${aasa.status}`);
  if (aasa.status === 200 && expectedAasa) {
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(aasa.body)) === JSON.stringify(expectedAasa);
    } catch {
      same = false;
    }
    record(host, 'AASA icerik uretilenle ayni', same, same ? 'ayni' : 'FARKLI');
  } else {
    record(host, 'AASA icerik uretilenle ayni', false, 'karsilastirilamadi');
  }

  const links = await fetchNoRedirect(`https://${host}/.well-known/assetlinks.json`);
  record(host, 'assetlinks 200', links.status === 200, `HTTP ${links.status}${links.error ?? ''}`);
  if (links.status === 200 && expectedLinks) {
    const served = links.body;
    const missing = expectedLinks[0].target.sha256_cert_fingerprints.filter(
      (fp) => !served.includes(fp),
    );
    record(host, 'assetlinks parmak izleri tam', missing.length === 0, missing.join(', ') || 'tam');
  } else {
    record(host, 'assetlinks parmak izleri tam', false, expectedLinks ? 'karsilastirilamadi' : 'yerel dosya yok');
  }

  const cdn = await fetchNoRedirect(`https://app-site-association.cdn-apple.com/a/v1/${host}`);
  record(host, 'Apple CDN gordu', cdn.status === 200, `HTTP ${cdn.status}`);

  const gUrl =
    'https://digitalassetlinks.googleapis.com/v1/statements:list' +
    `?source.web.site=https://${host}` +
    '&relation=delegate_permission%2Fcommon.handle_all_urls';
  const google = await fetchNoRedirect(gUrl);
  let gOk = false;
  let gDetail = `HTTP ${google.status}`;
  if (google.status === 200) {
    try {
      const parsed = JSON.parse(google.body);
      gOk = Array.isArray(parsed.statements) && parsed.statements.length > 0;
      gDetail = gOk ? `${parsed.statements.length} statement` : (parsed.errorCode ?? 'statement yok');
    } catch {
      gDetail = 'yanit ayristirilamadi';
    }
  }
  record(host, 'Google dogrulayici', gOk, gDetail);
}

const pending = config.paths.filter((p) => !p.confirmed);
console.log('');
for (const r of results) {
  console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${r.host.padEnd(26)} ${r.check.padEnd(32)} ${r.detail}`);
}
console.log('');
if (pending.length > 0) {
  console.log(`TEYIT BEKLEYEN ${pending.length} yol (yayina konmadi): ${pending.map((p) => p.pattern).join(', ')}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} kontrol gecti.`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Script'i koş — bugünkü dürüst durumu gör**

Run: `node scripts/check-deeplinks.mjs`
Expected: exit 1. Her iki host için `AASA 200` ve `assetlinks 200` satırları `FAIL HTTP 404`, `Apple CDN gordu` `FAIL HTTP 404`, `Google dogrulayici` FAIL. Sonda `TEYIT BEKLEYEN 7 yol` satırı.

Bu çıktı beklenen sonuçtur — dosyalar henüz yayınlanmadı. Script'in işi bunu yalanlamamak.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-deeplinks.mjs
git commit -m "feat(deeplinks): measure what is actually published

Existence is not enough: Apple silently rejects a redirect or a wrong
content-type, devices fetch from Apple's CDN rather than the origin, and a
missing fingerprint fails Android verification quietly. Ask each question
separately and compare the served body against what we generated."
```

---

## Task 7: Teslim dökümanı

**Files:**
- Delete/rename: `docs/ios-universal-links.md` → `docs/deep-links.md` (`git mv`, sonra yeniden yaz)
- Modify: `docs/superpowers/reports/2026-08-03-parite-p1-p2-kapanis.md` (§4'e tek satır referans)

**Interfaces:**
- Consumes: Task 1-6 çıktıları.
- Produces: web/infra ve Apple/Play tarafının yorum gerektirmeden uygulayacağı teslim dökümanı.

- [ ] **Step 1: Dosyayı taşı**

```bash
git mv docs/ios-universal-links.md docs/deep-links.md
```

- [ ] **Step 2: Dökümanı yeniden yaz**

`docs/deep-links.md` şu bölümleri içerir — her biri yazılacak, hiçbiri atlanmayacak:

1. **Başlık ve amaç** — `https://tarodan.com.tr/...` linkine tıklandığında uygulamanın açılması; iOS Universal Links + Android App Links.
2. **Durum tablosu (düzeltilmiş).** Eski dosyanın "Android'de zaten çalışıyor" iddiası **yanlıştı**: `assetlinks.json` 404 olduğu için `autoVerify` doğrulaması düşüyor ve Android'de de linkler tarayıcıda kalıyor. Tabloya `node scripts/check-deeplinks.mjs` çıktısındaki ölçümler ve ölçüm tarihi (2026-08-03) yazılır.
3. **Yolların tek kaynağı.** `src/lib/deeplinks/paths.json` — elle AASA listesi yazılmaz. Eski listenin neden yanlış olduğu (mobil rota adları vs web URL'leri, altı satırlık tablo spec §2'den) ve bunu tekrar etmeyi engelleyen üç bekçi testi.
4. **Web/infra teslim bölümü.** İki dosyanın konumu (`/.well-known/apple-app-site-association` — **uzantısız**, `/.well-known/assetlinks.json`), `Content-Type: application/json`, **yönlendirme yok** (301/302 kabul edilmez), kimlik doğrulaması yok, HTTPS + geçerli sertifika, **her iki alan adı** (`tarodan.com.tr` ve `staging.tarodan.com.tr`), içerik `docs/wellknown/` altından **birebir** alınır.
5. **Android parmak izleri.** `eas credentials -p android --profile production` ile EAS keystore SHA-256'sı alınır, `docs/wellknown/fingerprints.json`'a yazılır, `pnpm wellknown:gen` koşulur. **Sürüm kontrol listesi maddesi:** ilk Play yüklemesinden sonra Play Console → App integrity → App signing key certificate SHA-256'sı `play_app_signing` alanına eklenmek **zorunda**; eklenmezse mağazadan kuran herkeste doğrulama düşer.
6. **Apple `Associated Domains` capability.** App ID `com.tarodan.app` üzerinde açılır — `eas credentials` ile veya Apple Developer → Identifiers → Associated Domains → provisioning profile yenilenir.
7. **Sıra kuralı 1 → 2 → 3 ve neden.** 3'ü önce yapmak zarar verir: iOS AASA başarısızlığını önbelleğe alır ve dosya sonradan yayına girse bile bir süre çalışmaz; capability açık değilse entitlement provisioning profile'la uyuşmaz ve build imzalanamaz.
8. **Bekleyen `app.json` yaması** — uygulanmadan, olduğu gibi:

```jsonc
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.tarodan.app",
  "associatedDomains": [
    "applinks:tarodan.com.tr",
    "applinks:staging.tarodan.com.tr"
  ]
}
```

   Ardından **yeni build** gerekir — `associatedDomains` bir entitlement, OTA ile geçmez.

9. **Android farkı.** `autoVerify` zaten shipping. `assetlinks.json` yayına girdiğinde **mevcut kurulumlar kendiliğinden doğrulanmaz**; uygulama güncellemesi veya yeniden kurulum gerekir. Geliştiricide zorlamak için:
   `adb shell pm verify-app-links --re-verify com.tarodan.app` ve durumu okumak için `adb shell pm get-app-links com.tarodan.app`.
10. **Doğrulama.** `pnpm wellknown:check` — ne ölçtüğü ve exit kodu.
11. **Teyit bekleyenler.** `confirmed: false` yollar listesi ve web'e sorulacak iki soru: (a) bu yollar web'de gerçekten var mı, (b) locale ön ek biçimi — `/en/listings/123` geçerli mi, varsayılan dil `tr` ön eksiz mi (`localePrefix: 'as-needed'`). Cevap "ön ek yok" ise `paths.json` → `locales` boşaltılır.
12. **Takip maddeleri.** Task 3'ün ortaya çıkardığı, bu turda düzeltilmeyen çözücü eşlemeleri (ör. `case 'seller'` `/seller/:id` döndürüyor ama `app/` altında böyle bir rota yok). Task 3 kırmızı vermediyse bu bölüme "Task 3 tüm teyitli yollarda yeşil; `/seller/*` teyit beklediği için kapsam dışı kaldı" yazılır.
13. **Bu bitene kadar ne oluyor.** E-posta ve web linkleri tarayıcıda açılıyor; `tarodan://` şemasıyla gelen derin bağlantılar (push bildirimleri dahil) **çalışıyor** — kayıp yalnız `https://` linklerinin uygulamaya düşmemesi. Bu **iki platformda da** böyle.

- [ ] **Step 3: Kapanış raporuna referans ekle**

`docs/superpowers/reports/2026-08-03-parite-p1-p2-kapanis.md` → §4'ün sonuna:

```markdown
> **Güncelleme:** derin bağlantı kalemi ayrı bir tura alındı —
> `docs/superpowers/specs/2026-08-03-deep-links-design.md` (tasarım) ve
> `docs/deep-links.md` (teslim). Android'in "zaten çalıştığı" iddiası
> düzeltildi: `assetlinks.json` da 404, o da aynı doğrulama dosyasını bekliyor.
```

- [ ] **Step 4: Ölü referansları temizle**

Run: `grep -rn "ios-universal-links" --include="*.md" . --exclude-dir=node_modules`
Expected: hiç sonuç yok. Çıkan her satır `docs/deep-links.md` olarak güncellenir.

- [ ] **Step 5: Tam doğrulama**

Run:
```bash
npx tsc --noEmit
pnpm lint
pnpm test
node scripts/gen-wellknown.mjs
node scripts/check-deeplinks.mjs || true
```
Expected: `tsc` yeni hata yok; lint 0 error; test suite yeşil (yeni 3 dosya dahil); `gen-wellknown` exit 0 + iki uyarı; `check-deeplinks` exit 1 + hepsi 404 (beklenen).

- [ ] **Step 6: Commit**

```bash
git add docs/deep-links.md docs/superpowers/reports/2026-08-03-parite-p1-p2-kapanis.md
git commit -m "docs(deep-links): hand off both platforms, correct the Android claim

The old doc said Android already worked. It does not: assetlinks.json is 404
too, so autoVerify fails and https links stay in the browser on both
platforms. Give web/infra byte-exact files and the ordering that keeps iOS
from caching a failed verification."
```

---

## Kapanış

Plan tamamlandığında repo şunları içerir:

- Yol tablosunun tek kaynağı ve ondan üretilen `apple-app-site-association`
- Üç bekçi testi: çözücü senkronu, gerçek rota varlığı, `app.json` senkronu
- Locale ön ekli web URL'lerini çözen `toMobileRoute`
- `/checkout` ve `/payment/*`'ı artık talep etmeyen Android intent filter'ı
- Yayındaki durumu ölçen `wellknown:check`
- Web/infra ve Apple/Play'in soru sormadan uygulayacağı `docs/deep-links.md`

**Kapı (bu planın dışında):** web iki dosyayı yayınlar → Apple capability açılır →
`pnpm wellknown:check` yeşil olur → **ancak o zaman** `app.json` →
`ios.associatedDomains` eklenir + yeni build.
