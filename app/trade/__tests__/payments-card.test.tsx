/**
 * payments-card · v2 iki taraflı ödeme kartı (delta 17 §1a).
 *
 * Toplam SUNUCUDAN gelir: `tradeFeeAmount + shippingAmount + amount = totalAmount`.
 * `amount + commission` türetmesi v2'de YANLIŞ sonuç verir ve bu kartta hiç geçmez.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradePaymentsCard } from '../[id]/_components/TradePaymentsCard';

const V2_VIEW = {
  isV2: true,
  myPaymentRow: { id: 'c1', payerId: 'u1', amount: 0, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 310, status: 'completed' },
  theirPaymentRow: { id: 'c2', payerId: 'u2', amount: 500, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 810, status: 'pending' },
  paidCount: 1,
  totalCount: 2,
} as any;

describe('TradePaymentsCard', () => {
  it('kendi satırımın toplamını sunucudan gelen totalAmount olarak basar', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getByText('310,00 TL')).toBeTruthy();
    expect(screen.getByText('810,00 TL')).toBeTruthy();
  });

  it('hizmet bedeli ve kargo satırlarını ayrı gösterir', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getAllByText('120,00 TL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('190,00 TL').length).toBeGreaterThan(0);
  });

  it('v1 takasta hiç çizmez', () => {
    const { toJSON } = render(
      <TradePaymentsCard view={{ ...V2_VIEW, isV2: false } as any} otherPartyName="Karşı" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('hizmet bedeli 0 olsa da satırı çizer (0 TL meşru konfigürasyon)', () => {
    const zeroFee = {
      ...V2_VIEW,
      myPaymentRow: { ...V2_VIEW.myPaymentRow, tradeFeeAmount: 0, totalAmount: 190 },
    };
    render(<TradePaymentsCard view={zeroFee as any} otherPartyName="Karşı" />);
    expect(screen.getAllByText('0,00 TL').length).toBeGreaterThan(0);
  });
});
