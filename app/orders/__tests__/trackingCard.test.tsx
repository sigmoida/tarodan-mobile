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
import { Clipboard } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';
import { OrderTrackingCard } from '../[id]/_components/OrderInfoCards';
import { OrderRefundBanner } from '../[id]/_components/OrderActionCards';

type BannerProps = React.ComponentProps<typeof OrderRefundBanner>;

function renderCard({ role, shipment }: { role: 'buyer' | 'seller'; shipment: any }) {
  const order = { id: 'o1', status: 'shipped', shipment: null } as any;
  const view = { isDelivered: false, isDigitalOrder: false } as any;
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

/**
 * `providerTrackingId` hiçbir zaman gelmediği için "kod yok" dalı HER siparişte
 * çalışıyor. Durum kapısı olmadan teslim edilmiş bir siparişte kartın sağı
 * "Teslim edildi" derken gövdesi paketin hazırlandığını söylüyordu.
 * 2026-08-11 Metro turunda gerçek ekranda görüldü (`ORD-M9ED69QWAT`).
 */
it('ALICI: paket yola çıktıysa "hazırlanıyor" notunu GÖRMEZ', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-NKSQYKP256', providerTrackingId: null, status: 'delivered' } });
  expect(screen.queryByText(/hazırlıyor/)).toBeNull();
  expect(screen.getByText('Teslim edildi')).toBeTruthy();
});

it('ALICI: paket hâlâ satıcıdayken "hazırlanıyor" notunu görür', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-NKSQYKP256', providerTrackingId: null, status: 'label_created' } });
  expect(screen.getByText('Satıcı paketinizi hazırlıyor. Sürat şubesine teslim edildiği anda takip bilgileri burada görünecek.')).toBeTruthy();
});

it('bilinmeyen durumda ham kod basılmaz', () => {
  renderCard({ role: 'buyer', shipment: { providerTrackingId: '79174212154116', status: 'yeni_bir_durum' } });
  expect(screen.queryByText('yeni_bir_durum')).toBeNull();
  expect(screen.getByText('Kargo durumu güncelleniyor')).toBeTruthy();
});

describe('Kopyala düğmesi (web ShippingInfoCard CopyButton)', () => {
  let setString: jest.SpyInstance;
  beforeEach(() => {
    setString = jest.spyOn(Clipboard, 'setString').mockImplementation(() => undefined);
    jest.spyOn(toast, 'success').mockImplementation(() => 1);
  });
  afterEach(() => jest.restoreAllMocks());

  it('ALICI: takip numarasını kopyalar ve "Takip numarası kopyalandı" der', () => {
    renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-X', providerTrackingId: '79174212154116' } });
    fireEvent.press(screen.getByTestId('order-tracking-copy'));
    expect(setString).toHaveBeenCalledWith('79174212154116');
    expect(toast.success).toHaveBeenCalledWith('Takip numarası kopyalandı');
  });

  it('ALICI: kod yokken kopyala düğmesi yok', () => {
    renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-X', providerTrackingId: null } });
    expect(screen.queryByTestId('order-tracking-copy')).toBeNull();
    expect(screen.queryByTestId('order-cargo-reference-copy')).toBeNull();
  });

  it('SATICI: şube referansını kopyalar', () => {
    renderCard({ role: 'seller', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null } });
    fireEvent.press(screen.getByTestId('order-cargo-reference-copy'));
    expect(setString).toHaveBeenCalledWith('PKG-CMRGW9D6ZH');
    expect(toast.success).toHaveBeenCalledWith('Kargo numarası kopyalandı');
  });

  it('İADE: iade kargo kodu kopyalanır', () => {
    const order = {
      id: 'o1',
      status: 'delivered',
      activeRefundRequest: {
        id: 'r1', status: 'return_shipment_open', returnProvider: 'surat',
        returnTrackingNumber: 'IADE-12345', createdAt: new Date('2026-01-01').toISOString(),
      },
    } as unknown as BannerProps['order'];
    const view = { isCancelled: false } as BannerProps['view'];
    renderWithProviders(
      <OrderRefundBanner order={order} view={view} onCancelRefund={jest.fn()} cancelRefundPending={false} />,
    );
    fireEvent.press(screen.getByTestId('refund-return-tracking-copy'));
    expect(setString).toHaveBeenCalledWith('IADE-12345');
    expect(toast.success).toHaveBeenCalledWith('Kargo numarası kopyalandı');
  });
});
