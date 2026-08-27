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
