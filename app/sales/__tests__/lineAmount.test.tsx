/**
 * Satış detayı satır tutarı — istemci çarpımının son kalıntısı.
 *
 * `formatPrice(item.price * item.quantity)` sınıfı Plan 4'te kapatılmıştı:
 * `price` sepete/siparişe girildiği andaki donmuş bir kopya; adetle çarpınca
 * ekranda sunucunun tahsil ettiğinden farklı bir satır çıkabiliyor. Kural:
 * sunucudan gelen satır tutarı basılır, yoksa çarpım UYDURULMAZ.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { SaleDetailBody } from '../[id]/_components/SaleDetailBody';

function renderBody(item: Record<string, unknown>) {
  render(
    <SaleDetailBody
      f={
        {
          order: {
            id: 'o1',
            orderNumber: 'ORD-1',
            status: 'paid',
            createdAt: new Date('2026-08-01').toISOString(),
            items: [{ id: 'i1', product: { id: 'p1', title: 'Model' }, ...item }],
          },
          sc: { bg: theme.colors.surface.DEFAULT, fg: theme.colors.text.heading },
          displayStatus: 'paid',
        } as any
      }
    />,
  );
}

describe('sale line amount', () => {
  it('prints the line total the server sent', () => {
    renderBody({ price: 100, quantity: 3, subtotal: 285 });

    expect(screen.getByText(/285/)).toBeTruthy();
  });

  it('never multiplies price by quantity when the server sent no line total', () => {
    renderBody({ price: 100, quantity: 3 });

    // 300 = 100 × 3 — istemci aritmetiği. Ekranda çıkmamalı.
    expect(screen.queryByText(/300/)).toBeNull();
  });

  it('still shows the quantity so the line stays readable', () => {
    renderBody({ price: 100, quantity: 3 });

    expect(screen.getByText(/Adet: 3/)).toBeTruthy();
  });
});
