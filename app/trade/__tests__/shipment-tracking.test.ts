/**
 * Takas takip linki GERÇEK kargo koduyla kurulur, iç referansla değil.
 *
 * Ekran her "takip et" butonuna `shipment.trackingNumber` veriyordu — o Tarodan'ın
 * İÇ referansı (`TKS-…`), satıcının şubede verdiği numara. Sürat onu tanımıyor,
 * yani link ölüydü. Gerçek kod aynı gönderide `cargoCode` olarak geliyor
 * (staging'de ölçüldü) ve `TradeShipment` tipi onu hiç bildirmiyordu.
 *
 * Sipariş tarafı bu ayrımı `deriveShipmentView` ile çözmüş; takas tarafı o
 * yardımcıyı hiç çağırmıyordu. Test, çözümün o TEK kaynaktan geçtiğini çiviliyor.
 */
import { deriveShipmentView } from '@/lib/shipping/tracking';

describe('takas gönderisi → takip görünümü', () => {
  it('gerçek kargo kodunu tercih eder, iç referansı DEĞİL', () => {
    const view = deriveShipmentView({
      provider: 'surat',
      trackingNumber: 'TKS-9MQEWD2FKR-WH-INI',
      providerTrackingId: '12516210181141',
    } as any);
    expect(view.cargoCode).toBe('12516210181141');
    expect(view.trackingUrl).toContain('12516210181141');
    expect(view.trackingUrl).not.toContain('TKS-');
  });

  it('kod ayrı alanda geldiğinde de bulur (yanıt şekli iki türlü)', () => {
    const view = deriveShipmentView(
      { provider: 'surat', trackingNumber: 'TKS-X' } as any,
      '99988877766',
    );
    expect(view.cargoCode).toBe('99988877766');
  });

  it('kod henüz yokken link üretmez ve bunu BEKLEMEDE olarak işaretler', () => {
    // Kargo kaydı doğmuş ama taşıyıcı kodu gelmemiş — NORMAL ara durum.
    // Buraya iç referansı koymak, kullanıcıyı çalışmayan bir linke yollardı.
    const view = deriveShipmentView({ provider: 'surat', trackingNumber: 'TKS-X' } as any);
    expect(view.cargoCode).toBeNull();
    expect(view.trackingUrl).toBeNull();
    expect(view.isCodePending).toBe(true);
  });

  it('ekran iç referansı takip fonksiyonuna GEÇİRMEZ', () => {
    // Davranış testi bunu yakalayamaz: link açma native bir çağrı ve testte
    // mock'lanıyor. Kuralı kaynakta çiviliyoruz — regresyon tek satır uzakta.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../[id]/_components/TradeShippingSection.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/openSuratTrack\([^)]*trackingNumber/);
  });
});
