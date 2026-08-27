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
