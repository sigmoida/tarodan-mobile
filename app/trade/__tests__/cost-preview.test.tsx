/**
 * cost-preview · GET /trades/:id/payment-quote (delta 17 §1c).
 *
 * v1 takasta uç 200 + BOŞ gövde döner — kart çizilmez, hata gösterilmez.
 * `feeLines` denetim detayıdır; ekranda tek `serviceFee` satırı basılır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradeCostPreviewCard } from '../[id]/_components/TradeCostPreviewCard';

const SIDE = {
  serviceFee: 120,
  shipping: 190,
  cashDifference: 500,
  total: 810,
  feeLines: [{ productId: 'p1', role: 'seller', amount: 60 }],
};

it('kendi ve karşı tarafın toplamını basar', () => {
  render(<TradeCostPreviewCard mine={SIDE} theirs={{ ...SIDE, cashDifference: 0, total: 310 }} />);
  expect(screen.getByText('810,00 TL')).toBeTruthy();
  expect(screen.getByText('310,00 TL')).toBeTruthy();
});

it('feeLines detayını EKRANA basmaz', () => {
  render(<TradeCostPreviewCard mine={SIDE} theirs={SIDE} />);
  expect(screen.queryByText('60,00 TL')).toBeNull();
});

it('taraf yoksa (v1 → boş gövde) hiç çizmez', () => {
  const { toJSON } = render(<TradeCostPreviewCard mine={null} theirs={null} />);
  expect(toJSON()).toBeNull();
});
