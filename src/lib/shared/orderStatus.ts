import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { orderStatusConfig, type StatusConfig, type StatusConfigDef } from './status-configs';

/**
 * Sipariş durumu → rozet varyantı + KATALOG ANAHTARI. **Tek kaynak: web.**
 *
 * Değerler web `orderStatusConfig`'ten (`@/lib/shared/status-configs`) gelir;
 * burada yalnız mobil arayüz durum adlarının (`apiStatusToUi`) web adlarına
 * eşlemesi ve web'de bulunmayan tek durum (`mixed`, çok satıcılı grup) durur.
 * Hem mobil arayüz adları (`pending`, `processing`, `awaiting_confirmation`)
 * hem de ham API/web adları (`pending_payment`, `preparing`,
 * `awaiting_buyer_confirmation`) aynı etiketi çözer.
 *
 * Etiketler sabit metin DEĞİL, katalog anahtarıdır — modül saf olduğu için
 * `useTranslation` çağıramaz; çeviri `useOrderStatusConfig` ile render
 * anında yapılır.
 */
export const uiOrderStatusMeta: Record<string, StatusConfigDef> = {
  ...orderStatusConfig,
  pending: orderStatusConfig.pending_payment!,
  processing: orderStatusConfig.preparing!,
  awaiting_confirmation: orderStatusConfig.awaiting_buyer_confirmation!,
  // Web'de yok: çok satıcılı grupta paketlerin durumu birbirinden farklı.
  mixed: { labelKey: 'order.statusMixed', variant: 'default' },
};

/** `StatusBadge`'in beklediği, çevrilmiş config. */
export function useOrderStatusConfig(): Record<string, StatusConfig> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(uiOrderStatusMeta).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}

/** Rozet dışında düz metin gerektiğinde (filtre çipi, boş durum başlığı…). */
export function useStatusText(): (status: string) => string {
  const config = useOrderStatusConfig();
  return (status) => config[status]?.label ?? String(status);
}
