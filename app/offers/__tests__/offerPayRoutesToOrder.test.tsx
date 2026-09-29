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
      onAccept={jest.fn()} onReject={jest.fn()} onCancel={jest.fn()} onOpenCounter={jest.fn()} onOpenBuyerCounter={jest.fn()} />,
  );
  fireEvent.press(screen.getByText(i18n.t('offer.payAmount', { amount: '' }).trim().split(' ')[0]!, { exact: false }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/orders/[id]', params: { id: 'ord-1' } }));
});
