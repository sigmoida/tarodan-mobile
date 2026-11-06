/**
 * Sipariş detayı ödeme özeti — hizmet KDV'si satırı.
 * Canlı ölçüm (staging, 2026-08-02): 619.92 + kargo 50 + platform 62 = 731.92,
 * ama toplam 754.32 → aradaki 22.40 = pricing.buyerServiceTaxAmount. Eski KDV
 * satırı (taxAmount) sunucu artık hep 0 döndürdüğü için ölü; asıl eksik satır
 * hizmet KDV'si. İstemcide hesap yok — sunucu alanı aynen basılır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrderPriceSummary } from '../_components/OrderAddressPrice';

function orderWithPricing(pricing: Record<string, unknown>) {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'delivered',
    totalAmount: 754.32,
    shippingCost: 50,
    product: { id: 'p1', title: 'X', price: 619.92, condition: 'used' },
    seller: { id: 's1', displayName: 'M' },
    shippingAddress: { fullName: 'A', phone: '0', address: 'a', city: 'İstanbul' },
    pricing,
  } as any;
}

describe('OrderPriceSummary service VAT', () => {
  it('prints the buyer service VAT line from the server field', () => {
    const order = orderWithPricing({
      subtotal: 619.92,
      shippingAmount: 50,
      buyerFeeAmount: 62,
      buyerServiceTaxAmount: 22.4,
      totalAmount: 754.32,
      sellerFeeAmount: 0,
      commissionAmount: 0,
      sellerNetAmount: 0,
    });

    render(<OrderPriceSummary order={order} isDigitalOrder={false} />);

    expect(screen.getByText('22,40 TL')).toBeTruthy();
  });

  it('does not print a service VAT line when the field is absent', () => {
    const order = orderWithPricing({
      subtotal: 619.92,
      shippingAmount: 50,
      buyerFeeAmount: 62,
      totalAmount: 731.92,
      sellerFeeAmount: 0,
      commissionAmount: 0,
      sellerNetAmount: 0,
    });

    render(<OrderPriceSummary order={order} isDigitalOrder={false} />);

    expect(screen.queryByText(/Hizmet KDV/i)).toBeNull();
  });

  it('no longer prints the dead standalone KDV (taxAmount) line', () => {
    const order = orderWithPricing({
      subtotal: 619.92,
      shippingAmount: 50,
      buyerFeeAmount: 62,
      taxAmount: 0,
      buyerServiceTaxAmount: 22.4,
      totalAmount: 754.32,
      sellerFeeAmount: 0,
      commissionAmount: 0,
      sellerNetAmount: 0,
    });

    render(<OrderPriceSummary order={order} isDigitalOrder={false} />);

    // "KDV" yalnız hizmet KDV'si etiketinde geçmeli; tek başına "KDV" satırı olmamalı.
    expect(screen.queryByText('KDV')).toBeNull();
  });
});

describe('OrderPriceSummary installment lines (ADR 0019)', () => {
  const pricing = { subtotal: 619.92, shippingAmount: 50, buyerFeeAmount: 62, totalAmount: 754.32 };
  const paid = { status: 'completed', installmentCount: 6, installmentFeeAmount: 0, chargedAmount: 754.32 };

  it('buyer: count, "no installment fee" and the charged total of the payment', () => {
    render(<OrderPriceSummary order={{ ...orderWithPricing(pricing), isBuyer: true, payment: paid }} isDigitalOrder={false} />);
    expect(screen.getByText('6 taksit')).toBeTruthy();
    expect(screen.getByText('Vade farksız')).toBeTruthy();
    expect(screen.getByText('Karttan çekilen tutar')).toBeTruthy();
  });

  it('seller or single payment: no installment lines', () => {
    render(
      <OrderPriceSummary order={{ ...orderWithPricing(pricing), isSeller: true, payment: paid }} isDigitalOrder={false} />,
    );
    expect(screen.queryByText('6 taksit')).toBeNull();
    render(
      <OrderPriceSummary
        order={{ ...orderWithPricing(pricing), payment: { status: 'completed', installmentCount: 1, chargedAmount: 754.32 } }}
        isDigitalOrder={false}
      />,
    );
    expect(screen.queryByText('Karttan çekilen tutar')).toBeNull();
  });
});
