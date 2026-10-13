import { offerStatusConfig, useStatusConfig, type StatusConfig, type StatusConfigDefMap } from './status-configs';

/**
 * Teklif durumu — TEK kaynak. Web `offerStatusConfig` + sunucunun eski eş adı
 * `counter_offered` (= `countered`). Takma ad burada çözülür; liste kartı,
 * detay banner'ı ve her yeni çağrı yeri aynı sonucu alır.
 */
export const offerStatusMeta: StatusConfigDefMap = {
  ...offerStatusConfig,
  counter_offered: offerStatusConfig.countered!,
};

/** `StatusBadge` için çevrilmiş teklif durumu config'i. */
export function useOfferStatusConfig(): Record<string, StatusConfig> {
  return useStatusConfig(offerStatusMeta);
}
