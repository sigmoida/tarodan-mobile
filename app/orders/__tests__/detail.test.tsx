/**
 * J67/J78/J79 · Sipariş detayı — mobil UI dilimi.
 * Durum rozeti render, "Teslimatı Onayla" buton görünürlüğü (alıcı + delivered),
 * iade talep butonu görünürlüğü (ödeme tamamlandı + alıcı), sipariş bulunamadı durumu.
 * Backend onay/iade aktarımı (escrow, transfer, webhook) backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'order-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));

// Yeni mimaride hook'lar `@/lib/api`'den import ediyor (services/api artık barrel).
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  ordersApi: { cancel: jest.fn(), confirm: jest.fn(), confirmReceipt: jest.fn() },
  refundsApi: { create: jest.fn(), cancel: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
  paymentsApi: { initiate: jest.fn(), bypassComplete: jest.fn() },
  elogoInvoicesApi: { byOrderAll: jest.fn(() => Promise.resolve({ data: [] })), pdf: jest.fn() },
  sellerInvoiceApi: { status: jest.fn(() => Promise.resolve({ data: null })), download: jest.fn() },
}));
import { router } from 'expo-router';
import { api, elogoInvoicesApi } from '@/lib/api';

import { useAuthStore } from '@/stores/authStore';
import OrderDetailScreen from '../[id]';

const getMock = api.get as jest.Mock;

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1001000000',
    status: 'delivered',
    totalAmount: 350,
    shippingCost: 30,
    product: { id: 'p1', title: 'Deri Ceket', price: 320, condition: 'used', images: [] },
    seller: { id: 'seller-1', displayName: 'Mehmet' },
    shippingAddress: {
      fullName: 'Ayşe', phone: '0500', address: 'Sokak 1', city: 'İstanbul',
    },
    createdAt: new Date('2026-01-01').toISOString(),
    isBuyer: true,
    payment: { status: 'completed' },
    ...overrides,
  };
}

describe('J67 · Sipariş detayı render', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('J67.1 sipariş numarası ve durum rozeti gösterilir', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture() } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen(),
    );
    // "Teslim Edildi" hem rozet hem timeline etiketinde geçer
    expect(screen.getAllByText('Teslim Edildi').length).toBeGreaterThan(0);
  });

  it('J67.2 sipariş bulunamazsa (404) "bulunamadı" gösterilir', async () => {
    getMock.mockRejectedValue(Object.assign(new Error('not found'), { response: { status: 404 } }));
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByText('Sipariş bulunamadı')).toBeOnTheScreen();
  });

  it('J67.2b ağ/sunucu hatası "bulunamadı" değil, ErrorState + yeniden dene', async () => {
    getMock.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByTestId('error-state', {}, { timeout: 10000 })).toBeOnTheScreen();
    expect(screen.queryByText('Sipariş bulunamadı')).toBeNull();
  }, 15000);
});

describe('J78 · Alıcı onay butonu KALDIRILDI + escrow bilgisi', () => {
  // Yeni escrow kuralı: alıcı "Teslim Aldım/Onayla" butonu artık YOK; satıcıya
  // ödeme teslim+14 gün sonra otomatik serbest kalır. Onay butonu hiçbir durumda
  // görünmemeli; yerine teslimden sonra escrow bilgi kartı çıkmalı.
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('J78.1 alıcı + delivered → "Teslimatı Onayla" butonu ARTIK yok, escrow kartı var', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status: 'delivered', isBuyer: true }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('order-escrow-info')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('order-confirm-delivery-button')).toBeNull();
  });

  it('J78.2 escrow metni iade süresini (14 gün) ve ödemeyi ayrı anlatır; "onaylayınca para serbest" DEMEZ', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status: 'delivered', isBuyer: true }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('order-escrow-info')).toBeOnTheScreen(),
    );
    expect(screen.getByText(/14 gün içinde iade talep edebilirsiniz/)).toBeOnTheScreen();
    expect(screen.getByText(/1 gün sonra serbest bırakılır/)).toBeOnTheScreen();
    expect(screen.queryByText(/onayla/i)).toBeNull();
  });

  it('J78.3 alıcı değilse escrow kartı görünmez', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status: 'delivered', isBuyer: false }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('order-escrow-info')).toBeNull();
    expect(screen.queryByTestId('order-confirm-delivery-button')).toBeNull();
  });

  // A-3 inceleme #6 · web `EscrowInfoCard` görünürlüğü: yalnız alıcı +
  // delivered / awaiting_buyer_confirmation (UI `awaiting_confirmation`).
  it.each([
    ['delivered', true],
    ['awaiting_buyer_confirmation', true],
    ['shipped', false],
    ['completed', false],
    ['refunded', false],
    ['cancelled', false],
  ])('escrow kartı API statüsü %s → görünür: %s', async (status, visible) => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status, isBuyer: true }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen());
    if (visible) expect(screen.getByTestId('order-escrow-info')).toBeOnTheScreen();
    else expect(screen.queryByTestId('order-escrow-info')).toBeNull();
  });

  it('isBuyer alanı yoksa (bilinmiyorsa) escrow kartı görünmez (web gibi)', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status: 'delivered', isBuyer: undefined }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen());
    expect(screen.queryByTestId('order-escrow-info')).toBeNull();
  });

  it('a digital (membership) order shows no escrow card', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ status: 'delivered', isBuyer: true, isMembership: true }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen());
    expect(screen.queryByTestId('order-escrow-info')).toBeNull();
  });

  it('J78.4 kargo öncesi (processing) alıcıya "Siparişi İptal Et" gösterilir', async () => {
    getMock.mockResolvedValue({ data: { data: orderFixture({ status: 'processing', isBuyer: true }) } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('order-cancel-button')).toBeOnTheScreen(),
    );
    // Kargo öncesi iade kartı çıkmaz
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });
});

describe('Değerlendirme', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
    (router.push as jest.Mock).mockClear();
  });

  it('"Satıcıyı Değerlendir" değerlendirme ekranını iter (eskiden modal)', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ status: 'delivered', isBuyer: true, hasProductRating: true, hasSellerRating: false }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    fireEvent.press(await screen.findByText('Satıcıyı Değerlendir'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/orders/[id]/review',
      params: { id: 'order-1', type: 'seller' },
    });
    expect(screen.queryByText('Ürünü Değerlendir')).toBeNull();
  });
});

describe('J79 · İade talep butonu görünürlüğü', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('J79.1 alıcı + ödeme tamamlandı + aktif iade yok → "İade Talep Et" görünür', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ isBuyer: true, payment: { status: 'completed' }, activeRefundRequest: null }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('refund-request-button')).toBeOnTheScreen(),
    );
  });

  it('J79.2 "İade Talep Et" iade talebi ekranını iter (eskiden modal)', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ isBuyer: true, payment: { status: 'completed' } }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('refund-request-button')).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('refund-request-button'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/orders/[id]/refund', params: { id: 'order-1' } });
  });

  it('J79.3 ödeme tamamlanmadıysa "İade Talep Et" görünmez', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ isBuyer: true, payment: { status: 'pending' } }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });

  it('J79.4 iade penceresi geçmiş teslimde modal açılamaz (bilgi kartı gösterilir)', async () => {
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    getMock.mockResolvedValue({
      data: { data: orderFixture({ isBuyer: true, payment: { status: 'completed' }, deliveredAt: old }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByText('İade Süresi Doldu')).toBeOnTheScreen();
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });
});

// Parite A-1.4 · İade kanıtı kuralı (kusur nedeninde kanıt + açıklama zorunlu) iade talebi
// ekranına taşındı: `app/orders/[id]/__tests__/refundScreen.test.tsx`.

describe('Digital order (membership): physical-goods actions are hidden', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  // Membership order: virtual product, platform seller, "MEM-" number, isMembership true
  const membershipFixture = (overrides: Record<string, unknown> = {}) =>
    orderFixture({
      orderNumber: 'MEM-1781257318265-BENIPST9F',
      isMembership: true,
      status: 'completed',
      isBuyer: true,
      payment: { status: 'completed' },
      activeRefundRequest: null,
      hasProductRating: false,
      hasSellerRating: false,
      shippingAddress: null,
      ...overrides,
    });

  it('değerlendirme bölümü gösterilmez', async () => {
    getMock.mockResolvedValue({ data: { data: membershipFixture() } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('Sipariş #MEM-1781257318265-BENIPST9F'),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Değerlendirme')).toBeNull();
    expect(screen.queryByText('Ürünü Değerlendir')).toBeNull();
  });

  it('iade talep butonu gösterilmez', async () => {
    getMock.mockResolvedValue({ data: { data: membershipFixture() } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('Sipariş #MEM-1781257318265-BENIPST9F'),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });

  it('teslimat adresi bölümü gösterilmez', async () => {
    getMock.mockResolvedValue({ data: { data: membershipFixture() } });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('Sipariş #MEM-1781257318265-BENIPST9F'),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Teslimat Adresi')).toBeNull();
  });

  // The order number is not a signal (the API derives `kind` from the product, never the
  // number); an API without `kind` falls back to `origin`. Full matrix: digitalOrderDetail.test.
  it('without kind or isMembership it is hidden through origin (older API)', async () => {
    getMock.mockResolvedValue({
      data: { data: membershipFixture({ isMembership: undefined, origin: 'platform_service' }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('Sipariş #MEM-1781257318265-BENIPST9F'),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Değerlendirme')).toBeNull();
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });
});

// B7 · Fatura kartları ayrı query'lerle sonradan gelir; aksiyon (iptal/iade) butonlarının
// üstüne değil ALTINA render edilmeli, yoksa geç gelen fatura kartı dokunma hedefini kaydırır.
describe('B7 · Fatura kartları aksiyonların altında render edilir', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('B7.1 fatura kartı (elogo), iade talep butonundan SONRA render edilir', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ isBuyer: true, payment: { status: 'completed' }, activeRefundRequest: null }) },
    });
    (elogoInvoicesApi.byOrderAll as jest.Mock).mockResolvedValue({
      data: [{ id: 'inv-1', invoiceNumber: 'ELG-1', label: 'Platform hizmet bedeli' }],
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('refund-request-button')).toBeOnTheScreen());
    await waitFor(() => expect(screen.getByTestId('order-invoice-card')).toBeOnTheScreen());

    // Render sırasını testID listesinden çıkar (DOM/tree sırası tarama derinliği önemsiz).
    const testIds: string[] = [];
    const collect = (node: any) => {
      if (!node || typeof node !== 'object') return;
      const id = node.props?.testID;
      if (typeof id === 'string') testIds.push(id);
      const children = node.children;
      if (Array.isArray(children)) children.forEach(collect);
    };
    collect(screen.toJSON());

    const actionPos = testIds.indexOf('refund-request-button');
    const invoicePos = testIds.indexOf('order-invoice-card');
    expect(actionPos).toBeGreaterThan(-1);
    expect(invoicePos).toBeGreaterThan(-1);
    expect(actionPos).toBeLessThan(invoicePos);
  });
});

// BULGU #25 · Sipariş timeline'ı iade/iptal durumunu yansıtmalı; mutlu-yolda bitmemeli.
// Ayrıca biten iade rozeti "İade Sürecinde" DEĞİL "İade Edildi" göstermeli (rozet/timeline
// tutarlılığı) ve eklenen adımın tarihi '-' olmamalı (refundedAt activeRefundRequest'ten gelir).
describe('B25 · Timeline iade/iptal yansıtması', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('B25.1 tamamlanmış iade → timeline "Para İade Edildi" adımı + gerçek tarih (— değil)', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'refunded',
          cancellationType: 'iade',
          deliveredAt: new Date('2026-02-10').toISOString(),
          activeRefundRequest: {
            id: 'rr-1',
            status: 'refunded',
            createdAt: new Date('2026-02-20').toISOString(),
            refundedAt: new Date('2026-02-25').toISOString(),
          },
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    const step = await screen.findByTestId('order-refundcancel-timeline');
    expect(within(step).getByText('Para İade Edildi')).toBeOnTheScreen();
    // Tarih bug'ı: refundedAt yanlış alandan okununca '-' görünüyordu.
    expect(within(step).queryByText('-')).toBeNull();
  });

  it('B25.2 tamamlanmış iade rozeti "İade Edildi" der, "İade Sürecinde" DEMEZ', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'refunded',
          cancellationType: 'iade',
          activeRefundRequest: {
            id: 'rr-1',
            status: 'refunded',
            createdAt: new Date('2026-02-20').toISOString(),
            refundedAt: new Date('2026-02-25').toISOString(),
          },
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #ORD-1001000000')).toBeOnTheScreen(),
    );
    expect(screen.getByText('İade Edildi')).toBeOnTheScreen();
    expect(screen.queryByText('İade Sürecinde')).toBeNull();
  });

  it('B25.3 süren iade → rozet "İade Talep Edildi" (web durum etiketi) + timeline adımı görünür', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'delivered',
          activeRefundRequest: {
            id: 'rr-1',
            status: 'pending_review',
            createdAt: new Date('2026-02-20').toISOString(),
          },
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('order-refundcancel-timeline')).toBeOnTheScreen(),
    );
    // Rozet web `orderStatusConfig.refund_requested` etiketi; timeline adımı talep durumunu yansıtır (— değil).
    expect(screen.getByText('İade Talep Edildi')).toBeOnTheScreen();
    const step = screen.getByTestId('order-refundcancel-timeline');
    expect(within(step).queryByText('-')).toBeNull();
  });

  it('B25.4 iptal edilmiş sipariş → timeline "İptal Edildi" adımı gösterir', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'cancelled',
          cancellationType: 'iptal',
          cancelledAt: new Date('2026-02-05').toISOString(),
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    const step = await screen.findByTestId('order-refundcancel-timeline');
    expect(within(step).getByText('İptal Edildi')).toBeOnTheScreen();
    expect(within(step).queryByText('-')).toBeNull();
  });
});

/**
 * Parite A-1.10 · İptal nedeni. Sipariş detayı `cancelReason`/`cancelCategory`'yi
 * hiç okumuyordu; kullanıcı yalnız "İptal edildi" görüyordu. Yönetici (platform)
 * iptalinde sunucu metni ("Yönetici tarafından iptal edildi: <etiket>") aynen basılır.
 */
describe('A-1.10 · İptal kartı nedeni gösterir', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'order-1' };
  });

  it('platform iptali: sunucunun gerekçe metni kartta görünür', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'cancelled',
          cancellationType: 'iptal',
          cancelledAt: new Date('2026-02-05').toISOString(),
          cancelReason: 'Yönetici tarafından iptal edildi: Satıcı stok doğrulayamadı',
          cancelCategory: 'other',
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    const message = await screen.findByTestId('order-cancel-message');
    expect(message).toHaveTextContent('Yönetici tarafından iptal edildi: Satıcı stok doğrulayamadı');
  });

  it('kategori → kullanıcı dostu cümle (alıcı kendi iptali; yanıtta isBuyer YOK)', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'cancelled',
          isBuyer: undefined,
          cancelReason: null,
          cancelCategory: 'buyer_cancelled',
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    const message = await screen.findByTestId('order-cancel-message');
    expect(message).toHaveTextContent('Bu siparişi iptal ettiniz.');
  });

  it('satıcı aynı ekrandan bakarsa (siparişte isSeller) satıcı cümlesi — user.id değil, sunucu bayrağı', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'cancelled',
          isBuyer: false,
          isSeller: true,
          cancelReason: null,
          cancelCategory: 'buyer_cancelled',
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    const message = await screen.findByTestId('order-cancel-message');
    expect(message).toHaveTextContent('Alıcı bu siparişi iptal etti.');
  });

  it('A-3 inceleme #4 · user.id = seller.id olsa da isSeller yoksa satıcı sayılmaz', async () => {
    useAuthStore.setState({ user: { id: 'seller-1' } as never });
    try {
      getMock.mockResolvedValue({
        data: {
          data: orderFixture({ status: 'cancelled', isBuyer: true, cancelReason: null, cancelCategory: 'buyer_cancelled' }),
        },
      });
      renderWithProviders(<OrderDetailScreen />);
      const message = await screen.findByTestId('order-cancel-message');
      expect(message).toHaveTextContent('Bu siparişi iptal ettiniz.');
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('inceleme 5 · ödenmiş kargo öncesi iptalde (refunded + iptal) neden satırı yok (web ile aynı)', async () => {
    getMock.mockResolvedValue({
      data: {
        data: orderFixture({
          status: 'refunded',
          cancellationType: 'iptal',
          cancelReason: 'changed_mind',
          cancelCategory: null,
        }),
      },
    });
    renderWithProviders(<OrderDetailScreen />);
    await screen.findByTestId('order-cancelled-info');
    expect(screen.queryByTestId('order-cancel-message')).toBeNull();
  });

  it('gerekçe ve kategori yoksa satır hiç basılmaz', async () => {
    getMock.mockResolvedValue({
      data: { data: orderFixture({ status: 'cancelled', cancelReason: null, cancelCategory: null }) },
    });
    renderWithProviders(<OrderDetailScreen />);
    await screen.findByTestId('order-cancelled-info');
    expect(screen.queryByTestId('order-cancel-message')).toBeNull();
  });
});
