/**
 * Takip kartı — İKİ NUMARA, İKİ İŞ.
 *
 *   - `trackingNumber` (`PKG-…`): Tarodan iç referansı. SATICI bunu şubede
 *     verir. Sürat TANIMAZ, alıcının hiçbir işine yaramaz.
 *   - `providerTrackingId`: gerçek Sürat kodu; takip bununla yapılır.
 *
 * Bugünkü hata: `PKG-` alıcıya "Takip Numarası" diye basılıyor ve sunucunun
 * bozuk `trackingUrl`'ü ile link veriliyor.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { OrderTrackingCard } from '../[id]/_components/OrderInfoCards';

function renderCard({ role, shipment }: { role: 'buyer' | 'seller'; shipment: any }) {
  const order = { id: 'o1', status: 'shipped', shipment: null } as any;
  const view = { isDelivered: false, showTrackingCard: true } as any;
  return renderWithProviders(
    <OrderTrackingCard
      order={order}
      view={view}
      shipment={{ id: 's1', orderId: 'o1', provider: 'surat', status: 'in_transit',
                  trackingUrl: null, ...shipment }}
      isSeller={role === 'seller'}
    />,
  );
}

it('ALICI: kod gelmeden PKG- referansını GÖRMEZ', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null } });
  expect(screen.queryByText(/PKG-/)).toBeNull();
  expect(screen.getByText('Satıcı paketinizi hazırlıyor. Sürat şubesine teslim edildiği anda takip bilgileri burada görünecek.')).toBeTruthy();
});

it('ALICI: kod gelince takip numarasını ve linki görür', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: '79174212154116' } });
  expect(screen.getByText('79174212154116')).toBeTruthy();
  expect(screen.getByText('Kargoyu takip et')).toBeTruthy();
});

it('SATICI: kod gelmeden PKG- referansını yönergesiyle görür', () => {
  renderCard({ role: 'seller', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null } });
  expect(screen.getByText('PKG-CMRGW9D6ZH')).toBeTruthy();
  expect(screen.getByText('Kargo Referans Numarası')).toBeTruthy();
});

it('sunucunun bozuk trackingUrl"ü kullanılmaz', () => {
  renderCard({
    role: 'buyer',
    shipment: {
      trackingNumber: 'PKG-3BQ2W4JPJ3', providerTrackingId: null,
      trackingUrl: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=PKG-3BQ2W4JPJ3',
    },
  });
  expect(screen.queryByText('Kargoyu takip et')).toBeNull();
});

it('bilinmeyen durumda ham kod basılmaz', () => {
  renderCard({ role: 'buyer', shipment: { providerTrackingId: '79174212154116', status: 'yeni_bir_durum' } });
  expect(screen.queryByText('yeni_bir_durum')).toBeNull();
  expect(screen.getByText('Kargo durumu güncelleniyor')).toBeTruthy();
});
