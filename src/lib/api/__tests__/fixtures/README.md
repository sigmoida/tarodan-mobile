# Sözleşme fixture'ları

Staging'den ÖLÇÜLMÜŞ ham yanıt gövdeleri. Elle yazılmazlar — `_meta.capturedAt`
ve `_meta.endpoints` neyin, ne zaman, hangi uçtan alındığını söyler.

## Ne işe yarıyorlar

`contractCoverage.test.ts` her fixture'ın alan adlarını, o gövdeyi deklare eden
BÜTÜN tip kaynaklarına karşı tarıyor — TEK bir dosyaya değil. `orders` için bu
`src/lib/api/orders.ts` (axios yüzeyi) + `app/orders/[id]/_lib/types.ts`
(`OrderDetail`) + `app/orders/group/[id]/_lib/types.ts` (`GroupOrder`) demek
(bkz. testteki `ORDERS_TYPE_SOURCES`). Sebep: `src/lib/api/<domain>.ts`
genelde yalnız axios çağrılarını taşıyor, gövdenin GERÇEK tipi çoğu zaman
rota-yerel bir `_lib/types.ts`'te yaşıyor — yalnız domain dosyasını okumak
guard'ın yanlış yere bakmasına, zaten bildirilmiş alanları "eksik" diye
listelemesine yol açtı (fix round 1). Herhangi bir kaynakta adı geçmeyen alan
ya `KNOWN_UNDECLARED` listesinde gerekçesiyle duruyor ya da test düşüyor.

Sebep: parite denetimleri iki kez üst üste sunucunun İÇ İÇE ve DTO'suz
alanlarını kaçırdı (`pricing.summary.quantityDiscount`, `rejectionReason`).
`dto/**` diffi bunları göstermiyor çünkü gövde serviste kuruluyor. Ölçülmüş
gövde gösteriyor.

## Sınırı — abartma

Test alan ADININ (herhangi bir tip kaynağında) geçip geçmediğine bakar; iç içe
yapıyı, tipi, ya da alanın HANGİ tip kaynağında/hangi konumda bildirildiğini
DOĞRULAMAZ. Yani `total: string` yazılmışsa yakalamaz. Konum-körlüğün somut
sonucu: bir alan adı bir yapıda (mesela `orders[]`) bildirilmişse, sunucunun
AYNI adı taşıyan ama mobilin hiç dokunmadığı BAŞKA bir yapıda (mesela
`packages[].orders[]`) döndürdüğü aynı isimli alanı da "bildirilmiş" sayar —
adı kontrol ediyoruz, konumu değil. Yakaladığı tek şey, tam olarak bizi iki kez
yakalayan şey: yanıtta olup HİÇBİR tip kaynağında hiç bulunmayan alan.

## PII

Fixture'lar `jq walk` filtresiyle maskelenmiş hâlde commit'lenir. Ham gövdeyi
repoya koyma.

## Yenileme

Sözleşme değiştiğinde yeniden ölç (README başındaki komutlar
`docs/superpowers/plans/2026-08-26-tam-parite-denetimi.md` içinde). Fixture
bayatladığında test SESSİZ kalır — bu yüzden her parite turunda yenilenmeli.
