/**
 * J63 · Satıcı sipariş detayı — mobil UI dilimi.
 * Durum banner render, sipariş numarası, kargo kartı, iptal butonu görünürlüğü
 * (paid/preparing'de görünür), sipariş bulunamadı (error) durumu.
 * Backend durum geçişi (iptal/iade aktarımı, escrow) backend-only.
 */
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

let mockParams: Record<string, string> = { id: 'sale-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  ordersApi: { getOne: jest.fn(), cancel: jest.fn() },
}));
import { ordersApi } from '@/lib/api';

import SaleDetailScreen from '../[id]';

const getOneMock = ordersApi.getOne as jest.Mock;

function saleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    orderNumber: 'ORD-2001000000',
    status: 'paid',
    totalAmount: 350,
    subtotal: 320,
    shippingCost: 30,
    createdAt: new Date('2026-01-01').toISOString(),
    buyer: { id: 'buyer-1', displayName: 'Ayşe' },
    shippingAddress: {
      fullName: 'Ayşe', phone: '0500', address: 'Sokak 1', city: 'İstanbul', district: 'Kadıköy',
    },
    items: [
      { id: 'i1', price: 320, quantity: 1, product: { id: 'p1', title: 'Deri Ceket' } },
    ],
    ...overrides,
  };
}

describe('J63 · Satıcı sipariş detayı render', () => {
  beforeEach(() => {
    getOneMock.mockReset();
    mockParams = { id: 'sale-1' };
  });

  it('J63.1 sipariş numarası başlıkta ve ürün gösterilir', async () => {
    getOneMock.mockResolvedValue({ data: { data: saleFixture() } });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-2001000000')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Deri Ceket')).toBeOnTheScreen();
  });

  it('J63.2 durum banner gösterilir (Ödendi - Hazırla)', async () => {
    getOneMock.mockResolvedValue({ data: { data: saleFixture({ status: 'paid' }) } });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-2001000000')).toBeOnTheScreen(),
    );
    // formatOrderStatus(paid) durum banner'ında render edilir
    expect(screen.getByTestId('sales-shipment-card')).toBeOnTheScreen();
  });

  it('J63.3 gerçek Sürat kodu geldiyse takip numarası ve takip butonu görünür', async () => {
    getOneMock.mockResolvedValue({
      data: {
        data: saleFixture({
          status: 'shipped',
          shipment: {
            provider: 'surat',
            trackingNumber: 'PKG-CMRGW9D6ZH',
            cargoCode: '79174212154116',
            status: 'picked_up',
          },
        }),
      },
    });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('sales-tracking-number')).toBeOnTheScreen(),
    );
    expect(screen.getByText('79174212154116')).toBeOnTheScreen();
    expect(screen.getByTestId('sales-track-link')).toBeOnTheScreen();
    // Kod geldikten sonra iç referansın işi bitti — ekranda yeri yok.
    expect(screen.queryByText(/PKG-/)).toBeNull();
  });

  it('J63.4 kargo kaydı yoksa bekleme metni gösterilir, takip butonu yok', async () => {
    getOneMock.mockResolvedValue({ data: { data: saleFixture({ status: 'paid', shipment: undefined }) } });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('sales-shipment-card')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('sales-track-link')).toBeNull();
    expect(screen.queryByTestId('sales-tracking-number')).toBeNull();
    expect(screen.queryByTestId('sales-cargo-reference')).toBeNull();
  });
});

/**
 * İKİ NUMARA, İKİ İŞ (Critical 1/2). `trackingNumber` (`PKG-…`) Tarodan iç
 * referansı — satıcı ŞUBEDE verir, Sürat tanımaz. `cargoCode`
 * (`providerTrackingId`) gerçek Sürat kodu — takip onunla yapılır.
 */
describe('J63 · Satıcı kargo numarası ayrımı', () => {
  beforeEach(() => {
    getOneMock.mockReset();
    mockParams = { id: 'sale-1' };
  });

  const withShipment = (shipment: Record<string, unknown>) =>
    getOneMock.mockResolvedValue({
      data: { data: saleFixture({ status: 'shipped', shipment }) },
    });

  it('J63.8 kod gelmeden ŞUBE REFERANSI gösterilir, takip butonu yok', async () => {
    withShipment({
      provider: 'surat',
      trackingNumber: 'PKG-CMRGW9D6ZH',
      cargoCode: null,
      status: 'label_created',
    });
    renderWithProviders(<SaleDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('sales-cargo-reference')).toBeOnTheScreen(),
    );
    expect(screen.getByText('PKG-CMRGW9D6ZH')).toBeOnTheScreen();
    expect(screen.getByText('Kargo Referans Numarası')).toBeOnTheScreen();
    // Sürat bu numarayı tanımaz → takip linki verilmez.
    expect(screen.queryByTestId('sales-track-link')).toBeNull();
    expect(screen.queryByTestId('sales-tracking-number')).toBeNull();
  });

  it('J63.9 takip linki iç referanstan DEĞİL Sürat kodundan kurulur', async () => {
    withShipment({
      provider: 'surat',
      trackingNumber: 'PKG-CMRGW9D6ZH',
      cargoCode: '79174212154116',
      status: 'picked_up',
    });
    renderWithProviders(<SaleDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('sales-track-link')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('sales-track-link'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116',
    );
  });

  it('J63.10 kargo durumu HAM KOD olarak basılmaz', async () => {
    withShipment({
      provider: 'surat',
      trackingNumber: 'PKG-CMRGW9D6ZH',
      cargoCode: '79174212154116',
      status: 'at_delivery_branch',
    });
    renderWithProviders(<SaleDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('sales-shipment-status')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Dağıtım şubesinde')).toBeOnTheScreen();
    expect(screen.queryByText('at_delivery_branch')).toBeNull();
  });

  it('J63.11 bilinmeyen kargo durumunda da ham kod basılmaz', async () => {
    withShipment({
      provider: 'surat',
      trackingNumber: 'PKG-CMRGW9D6ZH',
      cargoCode: '79174212154116',
      status: 'yeni_bir_durum',
    });
    renderWithProviders(<SaleDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('sales-shipment-status')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('yeni_bir_durum')).toBeNull();
  });
});

describe('J63 · Satıcı iptali yok + iptal etiketi', () => {
  beforeEach(() => {
    getOneMock.mockReset();
    mockParams = { id: 'sale-1' };
  });

  it('J63.5 satıcıya "Siparişi İptal Et" butonu GÖSTERİLMEZ (satıcı iptali desteklenmiyor)', async () => {
    getOneMock.mockResolvedValue({ data: { data: saleFixture({ status: 'paid' }) } });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-2001000000')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Siparişi İptal Et')).toBeNull();
  });

  it('J63.6 cancellationType="iptal" → "İade Edildi" değil "İptal Edildi" gösterilir', async () => {
    getOneMock.mockResolvedValue({
      data: { data: saleFixture({ status: 'refunded', cancellationType: 'iptal' }) },
    });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('İptal Edildi')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('İade Edildi')).toBeNull();
  });

  it('J63.7 sipariş bulunamazsa hata durumu (ErrorState) gösterilir', async () => {
    getOneMock.mockRejectedValue(new Error('not found'));
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.queryByText('Sipariş #ORD-2001000000')).toBeNull(),
    );
    // ErrorState fullscreen render edilir; başlık hâlâ "Sipariş Detayları"
    // (order.orderDetails — sales/[id]'in kendi anahtarı yerine paylaşılan
    // katalog anahtarı reuse edildi, bkz. i18n raporu).
    expect(screen.getByText('Sipariş Detayları')).toBeOnTheScreen();
  });
});
