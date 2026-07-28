# Mobil API parite bağlantıları — tasarım

**Tarih:** 2026-07-28
**Kapsam:** API katmanında hazır olan üç ucun ekranlara bağlanması. Sepet
(`/cart/*`), reklam (`/ads/*`) ve `/admin/settings/public` kapsam dışı — bunlar
mimari karar gerektiriyor, ayrı iş.

## Bağlam

`mobile-api-reference.html` (27 Tem 2026) 16 uç için "mobil eksik" işaretliyordu.
Bunların 11'i API katmanına eklendi (`src/lib/api/*`), 2'si zaten eşdeğer bir
rotayla karşılanıyordu, 5'i hiç yok. Bu tasarım, eklenmiş ama hiçbir ekranın
çağırmadığı uçlardan düşük riskli üçünü devreye alır.

## 1) Boost paket seçenekleri

**Sorun:** `BoostModal` eski düz-fiyat ucunu (`GET /products/boost/pricing`)
çağırıyor; web paket modelini (`GET /products/:id/boost/options`) kullanıyor.
Fiyatlar ayrışabilir.

**Çözüm:** Modal `productsApi.getBoostOptions(listingId)` çağırır. Yanıt boş
gelir ya da hata verirse `getBoostPricing()`'e düşer (geriye uyum). Paket
seçildiyse `initiateBoost`'a `packageId` de gönderilir.

**Ek:** Dosya `useState` + `useEffect` + doğrudan `api` ile veri çekiyor;
CLAUDE.md §6 React Query'yi tek server-state olarak şart koşuyor. Dosyaya
dokunulduğu için veri çekme `useQuery`'ye taşınır.

**Dosya:** `src/components/product/BoostModal.tsx`

## 2) Anasayfa popüler ürünler

**Sorun:** `PopularProducts` bölümü genel `/products` listesini gösteriyor —
yani "popüler" değil, son eklenenler.

**Çözüm:** `useHomeData`'ya `popularQuery` eklenir
(`productsApi.getPopular({ limit: 20 })`), bölüm bu veriyi alır. Hata → boş
dizi (mevcut desen). `qk.products.popular` anahtarı merkezi kayda eklenir.

**Dosyalar:** `app/(tabs)/_hooks/useHomeData.ts`, `app/(tabs)/index.tsx`,
`src/lib/query/keys.ts`

## 3) Teklif / takas rozetleri

**Sorun:** Profil menüsündeki "Tekliflerim" ve "Takaslarım" satırlarında bekleyen
iş sayacı yok; web'de var.

**Çözüm:** `useHomeBadges`'e iki query eklenir (`offersApi.getPendingCount`,
`tradesApi.getPendingCount`). Mevcut bildirim sayacıyla aynı desen:
`enabled: isAuthenticated`, 60 sn `refetchInterval`, hata → 0. Menü satırı tipine
opsiyonel `badgeKey` alanı gelir; rozet yalnız sayı > 0 iken çizilir.

**Dosyalar:** `app/(tabs)/_hooks/useHomeBadges.ts`,
`app/(tabs)/_lib/profileConstants.ts`, `app/(tabs)/_components/ProfileSections.tsx`,
`src/lib/query/keys.ts`

## Kapsam dışı bırakılan — gerekçeli

- **`GET /orders/:id/my-review`:** Sipariş detayı zaten `hasProductRating` ve
  `hasSellerRating` alanlarıyla geliyor; `OrderActionCards` butonları buna göre
  gizliyor. Ayrı uç fazladan istek olur. API katmanında parite için durur.
- **`/cart/*` (6 uç):** Mobil sepet zustand store'da lokal; sunucu sepetine geçiş
  checkout akışını etkileyen mimari değişiklik.
- **`/ads/*` (3 uç):** Mobilde reklam alanı yok.
- **`GET /admin/settings/public`:** Mesajlaşma limitleri için; mobilde karşılığı yok.

## Doğrulama

- `npx tsc --noEmit` — mevcut baseline dışında yeni hata yok (baseline:
  `AppTabBar.tsx` 2 hata).
- `npx jest` — mevcut baseline korunur (3 suite / 13 test, flaky timeout'lar).
- Değişen ekranlar Metro'da elle gözden geçirilir.
