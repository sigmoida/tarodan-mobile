/**
 * Satış kartı SATICININ payını gösterir, alıcının ödediği toplamı değil.
 *
 * Kart `sale.totalAmount` basıyordu — kargo, alıcı hizmet bedeli ve KDV dahil,
 * alıcının ödediği rakam. Satıcı için anlamlı olan ürün bedeli; satış DETAYI
 * zaten `pricing.subtotal` okuyor. Ölçüldü (staging, `GET /orders?role=seller`):
 * aynı siparişte `{subtotal: 499, totalAmount: 612.89}` — `items[0].price` de
 * 612.89, yani yedek değil aynı yanlış tutar.
 *
 * NOT: bu düzeltme web'e yakınsamıyor, ondan AYRIŞIYOR — web'in satış özet
 * listesi de alıcı toplamını basıyor. Bu bir doğruluk düzeltmesi.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { SaleCard } from '../_components/SaleCard';

const sale = (over: Record<string, unknown> = {}) =>
  ({
    id: 's1',
    orderNumber: 'ORD-1',
    status: 'paid',
    totalAmount: 557.6,
    createdAt: '2026-08-01T00:00:00.000Z',
    product: { id: 'p1', title: 'Test' },
    buyer: { id: 'b1', displayName: 'Test Alıcı' },
    ...over,
  }) as any;

const noopActions = {
  updateStatusMutation: { isPending: false, variables: undefined },
  handleMarkAsProcessing: jest.fn(),
  setShipDialog: jest.fn(),
} as any;

describe('SaleCard tutarı', () => {
  it('ürün bedelini basar, alıcının toplamını DEĞİL', () => {
    render(<SaleCard sale={sale({ pricing: { subtotal: 449.1 } })} actions={noopActions} />);
    expect(screen.getByText('449,10 TL')).toBeTruthy();
    expect(screen.queryByText('557,60 TL')).toBeNull();
  });

  it('`pricing` hiç gelmediğinde çökmez ve uydurma sayı basmaz', () => {
    // Eski gövde şekli hâlâ dolaşımda olabilir. Para değeri istemcide
    // HESAPLANMAZ — alan yoksa yer tutucu basılır.
    const { toJSON } = render(<SaleCard sale={sale()} actions={noopActions} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.queryByText('557,60 TL')).toBeNull();
  });
});
