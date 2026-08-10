/**
 * Kargo numarası tek kaynak.
 *
 * Sunucu aynı gönderi için İKİ numara veriyor ve ikisinin işi farklı:
 *   - `trackingNumber` (`PKG-…`/`ORD-…`) → Tarodan iç referansı. Satıcı bunu
 *     şubede verir. Sürat bu numarayı TANIMAZ.
 *   - `providerTrackingId` → gerçek Sürat kodu. Takip bununla yapılır.
 *
 * `trackingUrl` OKUNMAZ. 2026-08-10 ölçümü (13 kayıt, istisnasız): gerçek kod
 * varsa alan `null`; yoksa iç referansı taşıyan BOZUK bir link
 * (`…?kargotakipno=PKG-3BQ2W4JPJ3`). Link `providerTrackingId`'den kurulur.
 */
import { buildTrackingUrl, deriveShipmentView } from '../tracking';
import type { Shipment } from '@/lib/api';

const BASE = {
  id: 's1',
  orderId: 'o1',
  provider: 'surat',
  trackingNumber: 'PKG-CMRGW9D6ZH',
  providerTrackingId: null,
  trackingUrl: null,
  status: 'label_created',
} as Shipment;

describe('buildTrackingUrl', () => {
  it('Sürat kodundan takip URL"i kurar', () => {
    expect(buildTrackingUrl('surat', '79174212154116')).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116',
    );
  });

  it('kod yoksa null döner', () => {
    expect(buildTrackingUrl('surat', null)).toBeNull();
    expect(buildTrackingUrl('surat', '')).toBeNull();
  });

  it('bilinmeyen sağlayıcıda null döner', () => {
    expect(buildTrackingUrl('yurtici', '79174212154116')).toBeNull();
    expect(buildTrackingUrl(null, '79174212154116')).toBeNull();
  });

  it('kodu URL"e güvenli şekilde gömer', () => {
    expect(buildTrackingUrl('surat', 'a b&c')).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=a%20b%26c',
    );
  });
});

describe('deriveShipmentView', () => {
  it('gerçek kod varken takip numarası ve link üretir', () => {
    const v = deriveShipmentView({ ...BASE, providerTrackingId: '79174212154116' });
    expect(v.cargoCode).toBe('79174212154116');
    expect(v.isCodePending).toBe(false);
    expect(v.trackingUrl).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116',
    );
  });

  it('kod yokken bekliyor sayar ve link üretmez', () => {
    const v = deriveShipmentView(BASE);
    expect(v.cargoCode).toBeNull();
    expect(v.isCodePending).toBe(true);
    expect(v.trackingUrl).toBeNull();
  });

  it('sunucunun trackingUrl"ünü ASLA kullanmaz', () => {
    // Ölçülmüş bozuk hâli: iç referansı taşıyan Sürat linki.
    const v = deriveShipmentView({
      ...BASE,
      trackingUrl: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=PKG-3BQ2W4JPJ3',
    });
    expect(v.trackingUrl).toBeNull();
  });

  it('referans olarak iç numarayı taşır', () => {
    expect(deriveShipmentView(BASE).reference).toBe('PKG-CMRGW9D6ZH');
  });

  it('shipment yoksa her şey boş, bekliyor DEĞİL', () => {
    const v = deriveShipmentView(null);
    expect(v.cargoCode).toBeNull();
    expect(v.reference).toBeNull();
    expect(v.trackingUrl).toBeNull();
    // Kargo kaydı hiç yokken "kod hazırlanıyor" demek yanlış olurdu.
    expect(v.isCodePending).toBe(false);
  });

  it('sipariş yanıtındaki cargoCode yedeğini kullanır', () => {
    // Sipariş/grup yanıtları aynı bilgiyi `shipment.cargoCode` adıyla veriyor.
    const v = deriveShipmentView(null, '11079211193731');
    expect(v.cargoCode).toBe('11079211193731');
    expect(v.trackingUrl).toBeNull(); // sağlayıcı bilinmiyor
  });

  it('providerTrackingId yedeğe göre önceliklidir', () => {
    const v = deriveShipmentView(
      { ...BASE, providerTrackingId: '79174212154116' },
      '11079211193731',
    );
    expect(v.cargoCode).toBe('79174212154116');
  });
});
