# iOS Universal Links (AASA) — kurulum

`https://tarodan.com.tr/product/123` linkine tıklandığında Safari yerine
uygulamanın açılması. **Android'de zaten çalışıyor** (`app.json` →
`android.intentFilters`, `autoVerify: true`); iOS'ta çalışmıyor.

Durum tespiti (2026-08-03):

| Parça | Sorumlu | Durum |
|---|---|---|
| 1. AASA dosyası yayını | **web / infra** | ❌ `https://tarodan.com.tr/.well-known/apple-app-site-association` → **404** (staging'de de 404) |
| 2. Apple `Associated Domains` capability | Apple Developer / EAS | ❓ doğrulanmadı |
| 3. `ios.associatedDomains` | bu repo | ❌ yok (bilerek — aşağıya bak) |

---

## Sıra ÖNEMLİ: 1 → 2 → 3

3. adımı önce yapmak **zarar verir**:

- iOS, uygulama kurulurken AASA dosyasını **bir kez** çeker ve **başarısızlığı
  önbelleğe alır**. Dosya 404 iken `associatedDomains` yayınlanırsa,
  kullanıcının cihazında "bu alan adı doğrulanamadı" sonucu takılı kalır ve
  dosya sonradan yayına girse bile bir süre çalışmaz.
- `Associated Domains` capability App ID'de açık değilse, entitlement ile
  provisioning profile uyuşmaz ve **build imzalanamaz**.

Bu yüzden bu repoda 3. adım **kasıtlı olarak yapılmadı**; 1 ve 2 bitince tek
satırlık bir değişiklik kalıyor (aşağıda hazır).

---

## 1. Web'in yayınlayacağı dosya

**Konum:** `https://tarodan.com.tr/.well-known/apple-app-site-association`

**Kurallar** (Apple bunlara uymayan dosyayı sessizce reddeder):

- `Content-Type: application/json`
- **Uzantı YOK** — dosya adı tam olarak `apple-app-site-association`
- **Yönlendirme YOK** — 301/302 kabul edilmez, doğrudan 200 dönmeli
- HTTPS ve geçerli sertifika zorunlu
- Kimlik doğrulaması olmadan erişilebilir olmalı

**İçerik:**

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["P2628CQK26.com.tarodan.app"],
        "components": [
          { "/": "/product/*",         "comment": "ürün detayı" },
          { "/": "/products/*",        "comment": "ürün listeleri" },
          { "/": "/listing/*",         "comment": "ilan" },
          { "/": "/listings/*",        "comment": "ilanlarım" },
          { "/": "/orders/*",          "comment": "sipariş detayı ve grupları" },
          { "/": "/order-track*",      "comment": "misafir sipariş takibi" },
          { "/": "/offers*",           "comment": "teklifler" },
          { "/": "/trade/*",           "comment": "takas detayı" },
          { "/": "/trades*",           "comment": "takaslar" },
          { "/": "/messages*",         "comment": "mesajlar" },
          { "/": "/refund-requests*",  "comment": "iade talepleri" },
          { "/": "/collections/*",     "comment": "koleksiyonlar" },
          { "/": "/seller/*",          "comment": "satıcı profili" },
          { "/": "/category/*",        "comment": "kategori" },
          { "/": "/brands/*",          "comment": "marka" },
          { "/": "/membership*",       "comment": "üyelik" },
          { "/": "/sayfa/*",           "comment": "CMS sayfaları" },
          { "/": "/verify-email*",     "comment": "e-posta doğrulama linki" },
          { "/": "/reset-password*",   "comment": "şifre sıfırlama linki" },
          { "/": "/corporate-invite*", "comment": "kurumsal davet" },

          { "/": "/checkout*", "exclude": true, "comment": "ödeme web'de kalsın" },
          { "/": "/payment*",  "exclude": true, "comment": "PayTR dönüşü web'de kalmalı" },
          { "/": "/admin/*",   "exclude": true },
          { "/": "/api/*",     "exclude": true }
        ]
      }
    ]
  }
}
```

> `appIDs` = `<Apple Team ID>.<bundleIdentifier>` = `P2628CQK26.com.tarodan.app`
> (Team ID `eas.json` ve `ios/Tarodan.xcodeproj/project.pbxproj`'ten, bundle
> `app.json`'dan.)

**Staging için** aynı dosya `https://staging.tarodan.com.tr/.well-known/…`
adresine de konmalı — `app.json`'daki Android intent filter'ları iki alan adını
da sayıyor, iOS tarafı da simetrik olsun.

⚠️ **`checkout` ve `payment` bilerek dışarıda.** PayTR 3DS akışı tarayıcıda
başlayıp tarayıcıda bitiyor; ortasında uygulamaya atlamak akışı bozar.

### Doğrulama

Yayına girdikten sonra:

```bash
curl -sI https://tarodan.com.tr/.well-known/apple-app-site-association \
  | grep -i 'HTTP/\|content-type'
# HTTP/2 200
# content-type: application/json

# Apple'ın kendi CDN'i dosyayı görüyor mu (cihazlar buradan çeker):
curl -s "https://app-site-association.cdn-apple.com/a/v1/tarodan.com.tr" | head -c 400
```

---

## 2. Apple `Associated Domains` capability

App ID `com.tarodan.app` üzerinde açık olmalı. İki yol:

- **EAS** — `eas credentials` çalıştırıldığında capability'yi otomatik
  yönetebilir; `associatedDomains` `app.json`'a eklendikten sonraki ilk
  build'de sorar.
- **Elle** — Apple Developer → Certificates, Identifiers & Profiles →
  Identifiers → `com.tarodan.app` → **Associated Domains** işaretle → kaydet →
  provisioning profile'ı yenile.

---

## 3. Bu repodaki tek değişiklik

1 ve 2 bittikten **sonra** `app.json` → `expo.ios`:

```jsonc
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.tarodan.app",
  "associatedDomains": [
    "applinks:tarodan.com.tr",
    "applinks:staging.tarodan.com.tr"
  ],
  ...
}
```

Sonra yeni bir **build** gerekir — `associatedDomains` bir entitlement, OTA
güncellemesiyle geçmez.

### Uygulama tarafında başka iş YOK

Yönlendirme mantığı hazır ve Android'de çalışıyor:

- `expo-linking` cold/warm start'ı ele alıyor
- push bildirimleri ve derin bağlantılar aynı çözücüyü paylaşıyor
  (`src/utils/notificationRoute.ts`)
- `tarodan://` custom scheme çalışıyor ve çalışmaya devam edecek

Universal link açıldığında uygulama zaten doğru ekrana gidiyor; eksik olan tek
şey iOS'un linki uygulamaya **teslim etmesi**.

---

## Bu bitene kadar iOS'ta ne oluyor

E-posta ve web linkleri Safari'de açılıyor. `tarodan://` şemasıyla gelen
derin bağlantılar (push bildirimleri dahil) **çalışıyor** — kayıp yalnız
`https://` linklerinin uygulamaya düşmemesi.
