/**
 * `counter_offered` eski takma adı paylaşılan durum kaynağında `countered`'a
 * eşlenir: liste kartı ham "counter_offered" basmaz, detay banner'ı ile aynı sonuç.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { OfferCard } from '../_components/OfferCard';
import { offerStatusMeta } from '@/lib/shared/offerStatus';
import { offerStatusConfig } from '@/lib/shared/status-configs';
import { statusColor } from '../[id]/_lib/status';

const mk = (status: string): any => ({
  id: 'of1', status, amount: 500,
  createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
  product: { id: 'p1', title: 'Model', price: 600, images: [] }, buyer: { id: 'b1' }, seller: { id: 's1' },
});
const card = (status: string) =>
  render(
    <OfferCard offer={mk(status)} tab="sent" isPending={false} t={i18n.t}
      timing={{} as any} onAccept={jest.fn()} onReject={jest.fn()} onCancel={jest.fn()} onOpenCounter={jest.fn()} onOpenBuyerCounter={jest.fn()} />,
  );

describe('counter_offered takma adı', () => {
  it('kaynak: countered ile aynı tanım', () => {
    expect(offerStatusMeta.counter_offered).toEqual(offerStatusConfig.countered);
  });

  it('liste kartı "Karşı Teklif" basar, ham kod basmaz', () => {
    card('counter_offered');
    expect(screen.getByText('Karşı Teklif')).toBeTruthy();
    expect(screen.queryByText('counter_offered')).toBeNull();
  });

  it('countered ile aynı rozet; detay banner rengi de aynı', () => {
    card('countered');
    expect(screen.getByText('Karşı Teklif')).toBeTruthy();
    expect(statusColor('counter_offered')).toEqual(statusColor('countered'));
  });
});
