/**
 * İlan payload'ının, boş bırakıldığında GÖNDERİLMEMESİ gereken parçaları.
 *
 * `shippingPackageTier` bunun tek örneği ve sebebi ölçülmüş: sunucu satıcının
 * kendi ürün okumasında (`GET /products/my/:id`) mevcut kademeyi geri
 * döndürmüyor (staging, 2026-08-03 — 46 alan, hiçbiri kargo alanı değil).
 * Dolayısıyla düzenleme formu alanı BOŞ açıyor.
 *
 * Boş değeri payload'a koymak, satıcı kargo bölümüne hiç dokunmadan bir yazım
 * hatası düzelttiğinde sunucudaki gerçek kademeyi silerdi; sunucu da kademe
 * gelmediğinde `small` varsayıyor. Canlı tarifede bu, büyük bir üründe paket
 * başına 60 TL fark demek — kullanıcının görmediği bir alanın, dokunmadığı
 * hâlde değişmesi.
 */
export function buildTierPayloadField(
  tier: string,
): { shippingPackageTier?: string } {
  return tier ? { shippingPackageTier: tier } : {};
}
