/**
 * Kampanya kazanç satırları — TOPLANAN değil, AÇIKLAYAN satırlar.
 *
 * Sunucunun `pricing.summary`'si yedi alan döndürüyor; mobil uzun süre yalnız
 * dördünü okudu. Sonuç: "2 al 1 öde" ya da bir bedel kampanyası uygulandığında
 * toplam düşüyor ama kullanıcı NEDEN düştüğünü hiçbir yerde göremiyordu (web
 * bunu 2026-08-13'te düzeltmişti).
 *
 * Kritik değişmez: üç TOPLANAN satırın (`productAmount` + `shippingAmount` +
 * `serviceFeeAmount`) toplamı `total`a eşit kalır. Kazanç satırları o toplamı
 * değiştirmez — bu yüzden `feeDiscountTotal` toplamın ALTINDA duruyor.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrderSummary } from '../_components/OrderSummary';

const BASE = {
  itemCount: 2,
  productAmount: 400,
  shippingCost: 50,
  serviceFeeAmount: 80,
  total: 530,
};

describe('OrderSummary — kampanya kazanç satırları', () => {
  it('adet kampanyası kazancını eksi işaretiyle gösterir', () => {
    render(<OrderSummary {...BASE} quantityDiscount={75} />);
    expect(screen.getByText('−75,00 TL')).toBeTruthy();
  });

  it('kazanç satırı TOPLAMI değiştirmez (toplanan değil, açıklayan)', () => {
    render(<OrderSummary {...BASE} quantityDiscount={75} feeDiscountTotal={20} />);
    // Sunucudan gelen toplam aynen basılır; istemci hiçbir şey düşmez/eklemez.
    expect(screen.getByText('530,00 TL')).toBeTruthy();
  });

  it('indirim 0 iken satır çizilmez (kampanyasız sepetlerin hepsi 0 döndürüyor)', () => {
    render(<OrderSummary {...BASE} quantityDiscount={0} feeDiscountTotal={0} />);
    expect(screen.queryByText('Adet kampanyası indirimi')).toBeNull();
    expect(screen.queryByText('Kampanya kazancınız')).toBeNull();
  });

  it('alanlar hiç gelmediğinde de satır çizilmez (eski gövde şekli)', () => {
    render(<OrderSummary {...BASE} />);
    expect(screen.queryByText('Adet kampanyası indirimi')).toBeNull();
    expect(screen.queryByText('Kampanya kazancınız')).toBeNull();
  });

  it('bedel kampanyalarını adıyla ve varsa koduyla listeler', () => {
    render(
      <OrderSummary
        {...BASE}
        feeDiscounts={[
          { target: 'commission', name: 'Yaz Kampanyası', code: 'YAZ25', amount: 12.5 },
          { target: 'shipping', name: 'Kargo Bedava', code: null, amount: 50 },
        ]}
        feeDiscountTotal={62.5}
      />,
    );
    expect(screen.getByText('Yaz Kampanyası (YAZ25)')).toBeTruthy();
    // Kod yoksa parantez de basılmaz — boş "( )" görünmesin.
    expect(screen.getByText('Kargo Bedava')).toBeTruthy();
  });

  it('`feeDiscounts` dizi değilse çökmez — savunmacı okuma', () => {
    // Sunucu alanı hiç göndermeyebilir; kontrolör diziye normalize ediyor ama
    // bileşen de kendi başına ayakta kalmalı.
    render(<OrderSummary {...BASE} feeDiscounts={undefined} />);
    expect(screen.getByText('530,00 TL')).toBeTruthy();
  });
});
