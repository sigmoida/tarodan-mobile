# Sözleşme fixture'ları

Staging'den ÖLÇÜLMÜŞ ham yanıt gövdeleri. Elle yazılmazlar — `_meta.capturedAt`
ve `_meta.endpoints` neyin, ne zaman, hangi uçtan alındığını söyler.

## Ne işe yarıyorlar

`contractCoverage.test.ts` her fixture'ın alan adlarını, o fixture için AD
VERİLMİŞ tip dosyalarına karşı tarıyor — TEK bir dosyaya değil, ama "BÜTÜN
tip kaynakları" da değil. `orders` için bu dosyalar testteki
`ORDERS_TYPE_SOURCES`'ta SAYILI olarak duruyor: `src/lib/api/orders.ts`
(axios yüzeyi) + `app/orders/[id]/_lib/types.ts` (`OrderDetail`) +
`app/orders/group/[id]/_lib/types.ts` (`GroupOrder`) +
`app/orders/_lib/ordersStatus.ts` (`Order`/`OrderGroup`). Sebep:
`src/lib/api/<domain>.ts` genelde yalnız axios çağrılarını taşıyor, gövdenin
GERÇEK tipi çoğu zaman rota-yerel bir `_lib/types.ts`'te yaşıyor — yalnız
domain dosyasını okumak guard'ın yanlış yere bakmasına, zaten bildirilmiş
alanları "eksik" diye listelemesine yol açtı (fix round 1). AD VERİLMİŞ
kaynakların hiçbirinde geçmeyen alan ya `KNOWN_UNDECLARED` listesinde
gerekçesiyle duruyor ya da test düşüyor.

⚠️ `ORDERS_TYPE_SOURCES` gövdeyi deklare eden dosyaların BİLİNEN listesidir,
KANITLANMIŞ TAM listesi değil — hiçbir mekanizma bu listenin eksiksiz
olduğunu doğrulamıyor. Listeyi güncel tutmak İNSAN sorumluluğu: yeni bir
rota-yerel tip dosyası eklenirse (ya da bir alan yalnız yeni bir dosyada
bildirilirse) `ORDERS_TYPE_SOURCES`'a elle eklenmesi gerekir, unutulursa test
SESSİZ kalır — uyarmaz (fix round 2'de `ordersStatus.ts` tam da böyle eksik
kalmıştı; bugün fark etmedi çünkü içerdiği alan adları zaten başka bir
kaynakta vardı, ama tesadüfti).

Sebep: parite denetimleri iki kez üst üste sunucunun İÇ İÇE ve DTO'suz
alanlarını kaçırdı (`pricing.summary.quantityDiscount`, `rejectionReason`).
`dto/**` diffi bunları göstermiyor çünkü gövde serviste kuruluyor. Ölçülmüş
gövde gösteriyor.

## Sınırı — abartma

İki farklı sınır var, ikisini de karıştırma:

1. Alan ADININ (ad verilmiş tip kaynaklarının herhangi birinde) geçip
   geçmediğine bakar; iç içe yapıyı ya da tipi DOĞRULAMAZ. `total: string`
   yazılmışsa yakalamaz.
2. Eşleşme YAPRAK ADI bazlı ve KONUM-KÖR: bir ad tip kaynaklarının
   HERHANGİ BİRİNDE, HERHANGİ BİR ALAKASIZ yapıda geçiyorsa "bildirilmiş"
   sayılır. Guard'ın YAKALADIĞI TEK ŞEY: kod tabanının hiçbir yerde hiç
   görmediği bir alan adı. YAKALAYAMADIĞI: bilinen bir adın YENİ bir konumda
   belirmesi. Somut örnek — guard'ın kendisi bunu YAKALAMADI, review turu
   2'de elle bulundu: `list.meta.total` / `groups.meta.total` (sayfalama
   alanları) `declared` sayıldı çünkü `total` adı `orders.ts`'de
   `OrderQuotePricingSummary.total` olarak — TAMAMEN alakasız bir checkout
   fiyat alanı — zaten geçiyordu. Guard adı gördü, konumun sayfalama meta'sı
   değil fiyat özeti olduğunu bilemedi. Bu iki satır `KNOWN_UNDECLARED`'da
   bu yüzden elle duruyor.

Özetle guard'ın yakaladığı tek şey — tam olarak bizi iki kez yakalayan şey —
yanıtta olup ad verilmiş kaynakların HİÇBİRİNDE hiç bulunmayan bir alan adı.

## PII

Fixture'lar `jq walk` filtresiyle maskelenmiş hâlde commit'lenir. Ham gövdeyi
repoya koyma.

## Yenileme

Sözleşme değiştiğinde yeniden ölç (README başındaki komutlar
`docs/superpowers/plans/2026-08-26-tam-parite-denetimi.md` içinde). Fixture
bayatladığında test SESSİZ kalır — bu yüzden her parite turunda yenilenmeli.
