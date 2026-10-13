/**
 * Kabul edilen teklifin "₺X Öde" düğmesi /payment/[id]'ye SİPARİŞ id'siyle
 * gidiyordu; o ekran `GET /payments/:id/status` ile ÖDEME id'si arıyor
 * (sunucu `payment.findUnique({ id })`) — sonuç "Ödeme bulunamadı".
 * Düğme sipariş detayına gider; oradaki "Ödeme Yap" önce ödemeyi başlatır
 * (`paymentsApi.initiate(orderId)`) ve doğru ödeme id'siyle devam eder.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { OfferCard } from '../_components/OfferCard';

it('ödeme bekleyen kabul edilmiş teklif → sipariş detayına gider', () => {
  const offer: any = {
    id: 'of1', status: 'accepted', amount: 500, orderId: 'ord-1', orderStatus: 'pending_payment',
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
    product: { id: 'p1', title: 'Model', price: 600, images: [] }, buyer: { id: 'b1' }, seller: { id: 's1' },
  };
  render(
    <OfferCard offer={offer} tab="sent" isPending={false} t={i18n.t}
      timing={{} as any} onAccept={jest.fn()} onReject={jest.fn()} onCancel={jest.fn()} onOpenCounter={jest.fn()} onOpenBuyerCounter={jest.fn()} />,
  );
  fireEvent.press(screen.getByText(i18n.t('offer.payAmount', { amount: '' }).trim().split(' ')[0]!, { exact: false }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/orders/[id]', params: { id: 'ord-1' } }));
});

/**
 * Web `OfferCard`: Öde yalnız gönderilen sekmesinde (alıcı) ve ödenmemişken; satıcı
 * (gelen sekmesi) ve ödenmiş sipariş için "Siparişi gör".
 */
describe('Öde düğmesi yalnız alıcı tarafında', () => {
  const mk = (orderStatus: string): any => ({
    id: 'of1', status: 'accepted', amount: 500, orderId: 'ord-1', orderStatus,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
    product: { id: 'p1', title: 'Model', price: 600, images: [] }, buyer: { id: 'b1' }, seller: { id: 's1' },
  });
  const card = (offer: any, tab: 'sent' | 'received') =>
    render(
      <OfferCard offer={offer} tab={tab} isPending={false} t={i18n.t}
        timing={{} as any} onAccept={jest.fn()} onReject={jest.fn()} onCancel={jest.fn()} onOpenCounter={jest.fn()} onOpenBuyerCounter={jest.fn()} />,
    );
  // "Ödeme Yap · ₺500" (not metinlerindeki "ödeme" ile karışmasın diye başa çapalı).
  const payLabel = () => /^Ödeme Yap/;
  const viewOrder = () => i18n.t('order.viewOrder');

  beforeEach(() => mockPush.mockClear());

  it('satıcı (gelen sekme), ödeme bekleyen teklifte Öde görmez; Siparişi gör', () => {
    card(mk('pending_payment'), 'received');
    expect(screen.queryByText(payLabel())).toBeNull();
    fireEvent.press(screen.getByText(viewOrder()));
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/orders/[id]', params: { id: 'ord-1' } }));
  });

  it('alıcı (gönderilen sekme), ödenmiş teklifte Öde görmez; Siparişi gör', () => {
    card(mk('paid'), 'sent');
    expect(screen.queryByText(payLabel())).toBeNull();
    expect(screen.getByText(viewOrder())).toBeOnTheScreen();
  });

  it('alıcı (gönderilen sekme), ödeme bekleyen teklifte Öde görür', () => {
    card(mk('pending_payment'), 'sent');
    expect(screen.getByText(payLabel())).toBeOnTheScreen();
    expect(screen.queryByText(viewOrder())).toBeNull();
  });
});
