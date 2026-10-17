/**
 * Durum haritaları web (`packages/shared/src/status-configs.ts`) ile tek dil:
 * aynı model ({labelKey, variant}), 5'li varyant sözlüğü, her etiket anahtarı
 * iki katalogda da var. Web'den bilinçli sapmalar (takas `countered`, sipariş
 * `mixed`, satıcı `paid`) kendi modüllerinde ve burada kilitli.
 */
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';
import {
  orderStatusConfig,
  tradeStatusConfig,
  refundRequestStatusConfig,
  offerStatusConfig,
  paymentStatusConfig,
  productStatusConfig,
  shipmentStatusConfig,
  ticketStatusConfig,
  resolveStatusConfig,
  enumLabel,
  type StatusConfigDefMap,
} from '../status-configs';
import { tradeStatusMeta } from '../tradeStatus';
import { refundStatusMeta } from '../refundStatus';
import { uiOrderStatusMeta } from '../orderStatus';
import { statusVariantColors, statusVariantSolid } from '../status-colors';
import { paymentStatusMeta } from '@/lib/payment/status';

const MAPS: Record<string, StatusConfigDefMap> = {
  orderStatusConfig,
  tradeStatusConfig,
  refundRequestStatusConfig,
  offerStatusConfig,
  paymentStatusConfig,
  productStatusConfig,
  shipmentStatusConfig,
  ticketStatusConfig,
};

const VARIANTS = ['default', 'success', 'warning', 'danger', 'outline'];

function lookup(catalog: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((cur, part) => (cur as Record<string, unknown> | undefined)?.[part], catalog);
}

describe('web ile aynı durum haritaları', () => {
  it.each(Object.entries(MAPS))('%s: yalnız 5 web varyantı kullanır', (_name, map) => {
    for (const def of Object.values(map)) {
      expect(VARIANTS).toContain(def.variant);
    }
  });

  it.each(Object.entries(MAPS))('%s: her etiket anahtarı tr + en kataloğunda var', (_name, map) => {
    for (const def of Object.values(map)) {
      expect(typeof lookup(tr, def.labelKey)).toBe('string');
      expect(typeof lookup(en, def.labelKey)).toBe('string');
    }
  });

  it('web örnekleri: paid = success "Ödendi", refund_requested = warning, cancelled = danger', () => {
    expect(orderStatusConfig.paid).toEqual({ labelKey: 'status.order.paid', variant: 'success' });
    expect(orderStatusConfig.refund_requested!.variant).toBe('warning');
    expect(orderStatusConfig.cancelled!.variant).toBe('danger');
    expect(lookup(tr, orderStatusConfig.paid!.labelKey)).toBe('Ödendi');
    expect(offerStatusConfig.countered!.variant).toBe('default');
    expect(offerStatusConfig.expired!.variant).toBe('outline');
    expect(tradeStatusConfig.disputed!.variant).toBe('danger');
  });

  it('resolveStatusConfig etiketi çeviriciyle çözer, varyantı korur', () => {
    const resolved = resolveStatusConfig(offerStatusConfig, (key) => `T(${key})`);
    expect(resolved.accepted).toEqual({ label: 'T(status.offer.accepted)', variant: 'success' });
  });

  it('enumLabel eşleşme yoksa ham değeri / fallback\'i döner', () => {
    const resolved = resolveStatusConfig(offerStatusConfig, (key) => key);
    expect(enumLabel(resolved, 'accepted')).toBe('status.offer.accepted');
    expect(enumLabel(resolved, 'bilinmeyen')).toBe('bilinmeyen');
    expect(enumLabel(resolved, null)).toBe('—');
  });
});

describe('mobil modüller web haritasına bağlı', () => {
  it('takas: web satırları aynen + yalnız `countered` eklenir', () => {
    for (const [status, def] of Object.entries(tradeStatusConfig)) {
      expect(tradeStatusMeta[status]).toEqual(def);
    }
    expect(Object.keys(tradeStatusMeta).filter((k) => !(k in tradeStatusConfig))).toEqual(['countered']);
  });

  it('iade talebi: web haritasının kendisi', () => {
    expect(refundStatusMeta).toBe(refundRequestStatusConfig);
  });

  it('sipariş: `mixed` dışında her satır web kaynaklı', () => {
    const own = Object.entries(uiOrderStatusMeta).filter(
      ([, def]) => !Object.values(orderStatusConfig).includes(def),
    );
    expect(own.map(([k]) => k)).toEqual(['mixed']);
  });

  it('ödeme: eş adlar ödendi/iptal/iade bağlı', () => {
    expect(paymentStatusMeta.paid).toEqual(paymentStatusConfig.completed);
    expect(paymentStatusMeta.hold_payment).toEqual(paymentStatusConfig.completed);
    expect(paymentStatusMeta.failed).toEqual(paymentStatusConfig.failed);
  });
});

describe('statusVariantColors / statusVariantSolid', () => {
  it('her varyant için bg/fg ve dolu renk döner; bilinmeyen outline sayılır', () => {
    for (const v of VARIANTS) {
      const c = statusVariantColors(v as never);
      expect(c.bg).toBeTruthy();
      expect(c.fg).toBeTruthy();
      expect(statusVariantSolid(v as never)).toBeTruthy();
    }
    expect(statusVariantColors('bilinmeyen' as never)).toEqual(statusVariantColors('outline'));
  });
});
