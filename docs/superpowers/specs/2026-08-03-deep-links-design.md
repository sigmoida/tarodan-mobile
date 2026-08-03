# Derin bağlantı doğrulama paketi — tasarım (2026-08-03)

Kapsam: `https://` linklerinin uygulamayı açması (iOS Universal Links + Android
App Links). Bu tur **teslime hazır paket** üretir; dosyaları web/infra yayınlar,
`ios.associatedDomains` flip'i sonraki tura kalır.

Öncül: `docs/ios-universal-links.md` (yerini alacak) ·
`docs/superpowers/reports/2026-08-03-parite-p1-p2-kapanis.md` §4 ·
`mobile-parity docs/12-mobile-platform.md` §2

---

## 1. Ölçülen durum

| Kontrol | Sonuç (2026-08-03) |
| --- | --- |
| `https://tarodan.com.tr/.well-known/apple-app-site-association` | 404 (`text/html`) |
| `https://tarodan.com.tr/.well-known/assetlinks.json` | 404 (`text/html`) |
| `https://app-site-association.cdn-apple.com/a/v1/tarodan.com.tr` | 404 |
| `app.json` → `android.intentFilters` `autoVerify: true` | var, doğrulama dosyası yok → sessizce başarısız |
| `app.json` → `ios.associatedDomains` | yok (bilerek) |
| Google Play yayını | henüz yok (`versionCode: 1`) |

**Android da çalışmıyor.** `docs/ios-universal-links.md:4` "Android'de zaten
çalışıyor" diyor; `assetlinks.json` 404 olduğu için `autoVerify` doğrulaması
düşüyor ve `https://` linkleri tarayıcıda kalıyor. Bu iddia düzeltilecek.

## 2. Asıl bulgu — hazır sanılan AASA listesi eşleşmiyor

`docs/ios-universal-links.md:55-79`'daki `components` listesi **mobil
expo-router yol adlarıyla** yazılmış. Gerçek web yolları
`mobile-parity docs/12-mobile-platform.md` §2 tablosunda:

| AASA'da yazan | Gerçek web yolu | Sonuç |
| --- | --- | --- |
| `/product/*` | `/listings/:id` | eşleşmez |
| `/order-track*` | `/track-order` | eşleşmez |
| `/corporate-invite*` | `/corporate/invite` | eşleşmez |
| `/orders/*` | `/profile/orders/:id` | eşleşmez |
| `/refund-requests*` | `/profile/refund-requests/:id` | eşleşmez |
| `/trade/*` | `/profile/trades/:id` | eşleşmez |

Dosya bu hâliyle yayınlansa Apple onu **kabul eder**, doğrulama yeşil görünür ve
linklerin çoğu yine Safari'de açılır. 404'ten kötü: "kurdum" sanılır.

Kök neden: `src/utils/notificationRoute.ts#toMobileRoute` bu eşlemeyi zaten
biliyor, parite dökümanı da "aynı eşlemeyi derin bağlantı için de kullan — iki
kopya tutma" diye yazmış. AASA listesi o kuralın ihlali olarak elle yazıldı ve
ayrıştı. **Bu tasarımın merkezi kararı: liste bir daha elle yazılmaz.**

## 3. Mimari

```
src/lib/deeplinks/
  paths.json          # TEK KAYNAK — web yol tablosu
  index.ts            # tipli erişim + AASA/Android üreteçleri (saf fonksiyonlar)
  __tests__/paths.test.ts
scripts/
  gen-wellknown.mjs   # paths.json → docs/wellknown/*
  check-deeplinks.mjs # yayındaki dosyaları ölçer (ağ)
docs/wellknown/
  fingerprints.json               # Android imza parmak izleri (elle doldurulur)
  apple-app-site-association      # ÜRETİLİR — uzantısız
  assetlinks.json                 # ÜRETİLİR — parmak izi varsa
docs/deep-links.md    # ios-universal-links.md'nin yerini alır
```

Sınırlar: `index.ts` saf (ağ yok, fs yok) → Jest'te tam test edilir. Script'ler
yalnız I/O yapar. `paths.json` veri, kod değil — hem Node script'i hem TS
(`resolveJsonModule: true`, doğrulandı) okur.

### 3.1 `paths.json` satır şekli

```jsonc
{
  "pattern": "/listings/*",        // AASA components + Android pathPrefix kaynağı
  "sample":  "/listings/123",      // teste verilir; sorgu taşıyabilir
  "include": true,                 // false → tarayıcıda kalsın (karar, ihmal değil)
  "confirmed": true,               // web'de var olduğu teyitli mi
  "comment": "ürün detayı → product/[id]"
}
```

`include: false` satırları tabloda **kalır** — dışlama da bir karardır ve
testle korunur.

**`confirmed: false` olan satır üretilen dosyalara girmez.** Eski dökümandan
gelen ama web'de varlığı teyit edilmemiş yollar (`/seller/*`, `/category/*`,
`/brands/*`, `/membership*`, `/sayfa/*`, `/pricing`, `/favorites`, `/orders/*`,
`/product/*`, `/listing/*`, `/refund-requests/*`, `/trade/*`) tabloya
`confirmed: false` ile yazılır. `check-deeplinks` kaç satırın teyit beklediğini
**her koşuda basar** — sessiz kırpma olmaz.

Teyitli başlangıç seti (kaynak: parite §2 tablosu + `toMobileRoute`):
`/verify-email`, `/reset-password`, `/forgot-password`, `/corporate/invite`,
`/listings/*`, `/collections/*`, `/profile/orders/*`,
`/profile/refund-requests/*`, `/profile/trades/*`, `/trades/*`, `/track-order`,
`/messages`, `/offers`, `/profile` (+ `/profile/listings`, `/profile/earnings`).
Dışlananlar: `/checkout*`, `/payment/*`, `/admin/*`, `/api/*`.

### 3.2 Locale ön eki

Web `apps/web/src/app/[locale]/…` yapısında; `/en/listings/123` geçerli bir URL
olabilir. Site SPA kabuğu döndüğü için ön ek biçimi HTTP'den ölçülemedi (her yol
200 + aynı `<title>`) — **web'den teyit gerekiyor.**

Karar: `LOCALES = ['tr', 'en']`. Üreteç her teyitli yol için çıplak ve ön ekli
varyantları ayrı ayrı yazar (`/listings/*`, `/tr/listings/*`, `/en/listings/*`);
AASA `components` alternasyon desteklemez, ayrı satır gerekir.

Bunun zorunlu eşi: `toMobileRoute` bugün `/en/listings/123` için `null` döner —
uygulama açılır, hiçbir yere gitmez. Çözücüye **baştaki locale segmentini soyma**
eklenir; yalnız segment tam olarak `tr`/`en` ise soyulur. Rota ağacında ilk
segmenti `tr`/`en` olan rota yok (tüm ağaç tarandı) → çarpışma riski yok.

Web "ön ek yok" derse `LOCALES` boşaltılır; soyma kodu zararsız kalır.

### 3.3 Üretilen dosyalar

**`apple-app-site-association`** — uzantısız, `appIDs: ["P2628CQK26.com.tarodan.app"]`
(Team ID `eas.json:80`, bundle `app.json`).

AASA v2'de **ilk eşleşen component kazanır**, bu yüzden üreteç `exclude: true`
satırlarını **listenin başına** yazar. Eski döküman onları sona koymuştu; bugün
desenler ayrık olduğu için zarar vermiyor ama kural kırılgan, üreteç doğrusunu
uygular.

**`assetlinks.json`** — `fingerprints.json`'daki **boş olmayan** SHA-256'lardan
üretilir. Hiç parmak izi yoksa **dosya yazılmaz**. Sebep:
`sha256_cert_fingerprints: []` içeren bir dosya yayınlanırsa Android doğrulaması
"başarısız" olarak **kesinleşir** — hiç dosya olmamasından kötüdür.

Parmak izi bugün elde yok, yani "yazılmadı" **beklenen** durum: üreteç bu hâlde
uyarı basar ve **0 ile çıkar** (aksi hâlde `gen:wellknown` her koşuda kırmızı
olurdu ve uyarı anlamını yitirirdi). Sürüm anında `--strict` bayrağı aynı durumu
1'e çevirir — kapıyı orada tutar.

```jsonc
// docs/wellknown/fingerprints.json
{
  "eas_upload_keystore": { "sha256": "", "source": "eas credentials -p android --profile production" },
  "play_app_signing":    { "sha256": "", "source": "Play Console → App integrity → App signing key certificate" }
}
```

Play'de yayın **henüz yok**: şimdilik yalnız EAS keystore parmak izi alınabilir.
**İlk Play yüklemesinden sonra Play App Signing sertifikası eklenmek zorunda** —
eklenmezse mağazadan kuran herkeste doğrulama düşer. Bu, dökümanda sürüm
kontrol listesi maddesi olarak yazılır.

### 3.4 Android intent filter daraltması

`app.json` → `intentFilters.data` bugün yalnız `scheme` + `host`; **yol kısıtı
yok** → `assetlinks.json` yayına girdiği an uygulama `/checkout` ve `/payment/*`
dahil host'un her yolunu talep eder. iOS'ta bilerek dışlanan şey Android'de
açık.

Risk in-app WebView değil (WebView navigasyonu intent filter'a düşmez);
**e-posta/SMS/Chrome'dan gelen dış tıklama** — 3DS turunun ortasında uygulamaya
atlar.

Düzeltme: `data` dizisi `include: true` + `confirmed: true` satırlarından
üretilir. Dönüşüm kuralı tek: `pattern` `*` ile bitiyorsa `*` atılır ve
`pathPrefix` olur (`/listings/*` → `pathPrefix: "/listings/"`); bitmiyorsa
`path` olur (`/track-order` → `path: "/track-order"`). Locale varyantları aynı
kuralla ayrı `data` girdileri olur. Doğrulama zaten düşük olduğu için daraltma regresyon
üretmez ve **`assetlinks.json` yayına girmeden önce shipping olmalıdır.**
`app.json` elle düzenlenen bir dosya olduğu için üretilmez; **test** onu tabloyla
karşılaştırır.

## 4. Doğrulama

### 4.1 `scripts/check-deeplinks.mjs` (ağ — Jest dışı)

`tarodan.com.tr` ve `staging.tarodan.com.tr` için:

| Kontrol | Neden |
| --- | --- |
| AASA → 200, `application/json`, **yönlendirme yok** | Apple 301/302'yi sessizce reddeder |
| Gövde üretilen dosyayla birebir aynı | "yayınladık" ≠ "doğrusunu yayınladık" |
| `assetlinks.json` → 200 + her parmak izi var | eksik parmak izi = sessiz doğrulama hatası |
| `app-site-association.cdn-apple.com/a/v1/<host>` | cihazlar dosyayı origin'den değil buradan çeker |
| `digitalassetlinks.googleapis.com/v1/statements:list` | Google'ın kendi doğrulayıcısı, hata metnini o verir |
| Teyit bekleyen satır sayısı | sessiz kırpma olmasın |

Herhangi bir hata → çıkış kodu 1. Bugün koşarsa hepsi kırmızı; dürüst başlangıç.

### 4.2 Jest (`src/lib/deeplinks/__tests__/paths.test.ts`)

1. Her `include: true` örneği `toMobileRoute`'ta **null olmayan** rota döndürür.
2. Her `include: false` örneği `null` döner.
3. Her `include: true` örneğinin **locale ön ekli** varyantı da çözülür (§3.2 bekçisi).
4. Çözülen rota, `app/` ağacındaki gerçek bir rotayla eşleşir — test `app/`'i
   fs ile tarar, ikinci bir liste tutmaz. Bu, "uygulama açıldı ama 404 ekranı"
   sınıfını yakalar.
5. Üretilen AASA/assetlinks içeriği commit'lenmiş dosyalarla aynı (JSON'u
   düzenleyip üretmeyi unutmayı yakalar).
6. `app.json` Android yol listesi tabloyla aynı (§3.4 bekçisi).

7. §2'deki altı yanlış yol (`/product/*`, `/order-track*`, `/corporate-invite*`,
   `/orders/*`, `/refund-requests*`, `/trade/*`) web URL'si olarak **çözülmez** —
   listenin neden değiştiğini kilitleyen regresyon testi.

`app.json`'ın yol kısıtsızlığı 6. testin ilk koşusunda **kırmızı** çıkar;
daraltmanın kanıtı odur. Yanlış yollar ise `paths.json`'a hiç girmediği için
kendiliğinden kırmızı olmaz — 7. madde onları bilerek kilitler.

**Kapsam sınırı:** 4. madde mevcut çözücü hatalarını da ortaya çıkarabilir
(ör. `case 'seller'` yolu aynen döndürüyor ama `app/` altında `seller/[id]`
rotası yok). Bu turda yalnız **teyitli `include`** satırlarını bozan eşlemeler
düzeltilir; kalanlar `docs/deep-links.md`'ye takip maddesi olarak yazılır.

## 5. Sıra ve kapı

1. **Web/infra** iki dosyayı yayınlar (byte-exact, `docs/wellknown/`'dan).
   Aynı iki dosya **hem** `tarodan.com.tr` **hem** `staging.tarodan.com.tr`
   altına konur — içerik özdeş (`appIDs` ve parmak izleri ortak), `app.json`
   Android intent filter'ları da iki alan adını sayıyor.
2. **Apple** `Associated Domains` capability'si App ID'de açılır.
3. `check-deeplinks` yeşil olur.
4. **Ancak o zaman** `app.json` → `ios.associatedDomains` eklenir + yeni build
   (entitlement, OTA ile geçmez).

3. adımı önce yapmak zarar verir: iOS AASA başarısızlığını önbelleğe alır, dosya
sonradan yayına girse bile bir süre çalışmaz; capability açık değilse build
imzalanamaz. Bu yüzden **bu turda `ios.associatedDomains` eklenmez.**

Android farkı: `autoVerify` zaten shipping. `assetlinks.json` yayına girdiğinde
**mevcut kurulumlar kendiliğinden doğrulanmaz** — uygulama güncellemesi veya
yeniden kurulum gerekir (geliştiricide `adb shell pm verify-app-links --re-verify
com.tarodan.app`). Dökümana yazılır.

## 6. Bu turda yapılanlar

- `src/lib/deeplinks/{paths.json,index.ts}` + testler
- `src/utils/notificationRoute.ts` — locale ön eki soyma (TDD)
- `app.json` — Android `intentFilters` yol daraltması
- `scripts/{gen-wellknown,check-deeplinks}.mjs` + `package.json` script girdileri
- `docs/wellknown/{fingerprints.json, apple-app-site-association}` (assetlinks
  parmak izi gelince)
- `docs/deep-links.md` — `docs/ios-universal-links.md`'nin yerine (`git mv` +
  yeniden yazım); düzeltilmiş Android durumu, sıra kuralı, parmak izi komutları,
  Play App Signing maddesi, web/infra teslim bölümü, bekleyen `app.json` yaması

## 7. Kapsam dışı

- `ios.associatedDomains` eklenmesi (§5 kapısı)
- Parmak izlerinin gerçekten alınması — `eas credentials` etkileşimli; komut
  dökümanda, çalıştırma kullanıcıda
- PKG- takip numarası hizalaması ve cihazda doğrulama turu — kategori 3'ün
  diğer iki kalemi, ayrı tur
- Teyitli olmayan yolları teyit etmek — web ekibine soru

## 8. Riskler

| Risk | Karşılık |
| --- | --- |
| Web yol tablosu güncel değil | `confirmed` bayrağı; teyitsiz satır yayına girmez, sayısı her koşuda basılır |
| Locale ön ek biçimi bilinmiyor | Her iki varyant üretilir; çözücü soyma yapar; "ön ek yok" cevabı gelirse `LOCALES` boşaltılır |
| Parmak izi eksik yayınlanır | Üreteç boş listeyle dosya yazmaz, 1 ile çıkar |
| `app.json` daraltması bir yolu kaçırır | Test `app.json`'ı tabloyla karşılaştırır |
| Web dosyayı düzenleyerek yayınlar | `check-deeplinks` gövdeyi üretilenle birebir karşılaştırır |
