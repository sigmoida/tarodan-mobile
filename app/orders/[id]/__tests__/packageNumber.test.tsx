/**
 * Sipariş detayında Teslimat No (delta §2).
 *
 * `packageNumber` sipariş gövdesinin kökünde geliyor (eski siparişlerde null)
 * ve repoda hiç okunmuyordu. Kullanıcı kargo şubesinde/destekte bu numarayı
 * soruluyor; ekranda yalnız sipariş numarası vardı.
 *
 * ⚠️ Alanın canlı varlığı kimlikli uç gerektirdiği için DOĞRULANAMADI (denetim
 * §4 D5) — bu yüzden satır kendini kapılıyor: alan gelmezse hiç çizilmiyor.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { OrderStatusCard } from '../_components/OrderStatusCard';

const view = {
  isPaid: true,
  isMembershipOrder: false,
} as any;

function renderCard(extra: Record<string, unknown> = {}) {
  render(
    <OrderStatusCard
      order={
        {
          id: 'o1',
          orderNumber: 'ORD-1234567890',
          status: 'shipped',
          totalAmount: 100,
          shippingCost: 0,
          createdAt: new Date('2026-08-01').toISOString(),
          product: { id: 'p', title: 'X', price: 100, condition: 'used' },
          seller: { id: 's', displayName: 'S' },
          shippingAddress: { fullName: 'A', phone: '0', address: 'a', city: 'İstanbul' },
          ...extra,
        } as any
      }
      view={view}
    />,
  );
}

describe('OrderStatusCard delivery number', () => {
  it('shows the delivery number when the server sends one', () => {
    renderCard({ packageNumber: 'PKG-0987654321' });

    expect(screen.getByText(/PKG-0987654321/)).toBeTruthy();
  });

  it('omits it on an order that has none', () => {
    renderCard();

    expect(screen.queryByText(/Teslimat No/)).toBeNull();
  });
});
