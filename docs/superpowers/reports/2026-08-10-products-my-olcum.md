# `GET /products/my` Ölçümü — Görev 0 kapısı

**Tarih:** 2026-08-10
**Ortam:** `https://staging.tarodan.com.tr/api`
**Hesap:** `ahmet@demo.com` (premium, satıcı)
**Plan:** `docs/superpowers/plans/2026-08-10-ilan-formu-sozlesmesi.md` → Görev 0

Delta 18 §2e, `GET /products/my` satırlarında sipariş/takas bağlamının artık açık
alanlarla geldiğini söylüyor (`relatedOrder`, `relatedTrade`). Bu rapor, mobilin
o alanlara kod bağlamadan önce alanların gerçekten yayınlandığını doğrulamak için
yazıldı.

## Kapı kararı

| Madde | Staging'de var mı | Karar |
| --- | --- | --- |
| `relatedOrder` / `relatedTrade` | **HAYIR** | **Görev 7 DÜŞTÜ** — backend bekliyor |

## Kanıt

`GET /products/my?limit=20` → `{ data, meta }`, `meta.total: 7`.

Satır durumları:

```json
{ "active": 2, "reserved": 2, "sold": 1, "suspended": 1, "rejected": 1 }
```

Bir satırın tam alan listesi (40 alan):

```
attributes, availableQuantity, boostedUntil, bundleSize, category, color,
condition, createdAt, description, discountPercent, editionNumber, editionTotal,
id, images, isBoosted, isBoxed, isLimited, isOnSale, isPreorder, isSet,
isTradeEnabled, likeCount, modelCode, oldPrice, originalPrice, price,
productCode, quantity, rating, releaseDate, saleEndDate, salePrice,
saleStartDate, sellerId, status, title, tradeAvailable, updatedAt, viewCount, year
```

`relatedOrder` ve `relatedTrade` **yok**. Yedi satırın hiçbirinde de yok:

```bash
jq -r '[.data[] | select(has("relatedOrder") or has("relatedTrade"))] | length'
# → 0
```

## Bu "örnek veri yok" DEĞİL

Ayrım önemli, çünkü ikisi farklı sonuçlar doğurur:

- **Örnek veri yok** olsaydı, alanı taşıyacak bir satır bulunamadığı için ölçüm
  belirsiz kalırdı ve madde ertelenirdi.
- **Alan yok:** hesapta **1 `sold` ve 2 `reserved`** ilan var — yani bağlamı
  taşıması beklenen satırlar mevcut ve yine de alan gelmiyor.

Dolayısıyla sonuç kesin: uç bu alanları yayınlamıyor.

## Sonuç ve devir

Görev 7 uygulanmaz. Mobil bugünkü davranışını korur (satılmış/rezerve ilan
aksiyonu mevcut kaynağından türetilir).

Bu madde **backend bekleyen** listesine geçer: `docs/PARITE_KALAN_ISLER.md`
P2 #8 satırı "backend bekliyor" olarak işaretlenmelidir. Mobil tarafta
workaround yazılmaz — tahminî bir `orderId` alanından türetmek, delta 18 §2e'nin
tam olarak bitirmek istediği davranıştır.

**Backend'e sorulacak:** `relatedOrder`/`relatedTrade` yalnız belirli bir
role/filtreye mi açık, yoksa henüz deploy edilmedi mi?
