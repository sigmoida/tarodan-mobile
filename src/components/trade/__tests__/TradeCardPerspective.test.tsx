/**
 * Takas durum etiketi bakan tarafa göre seçilir (web perspektifsiz; mobil
 * "kim gönderdi" açık yazar). Alıcı kendi gönderisini "Karşı Taraf Gönderdi"
 * görmemeli.
 */
import React from 'react';
import { render, screen, renderHook } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import { TradeCard } from '../TradeCard';
import { tradeStatusMetaFor, tradeViewerRole, useTradeStatusConfig } from '@/lib/shared/tradeStatus';

const trade = (status: string) => ({
  id: 't1',
  status,
  createdAt: '2026-01-01T00:00:00.000Z',
  initiatorId: 'u-init',
  receiverId: 'u-recv',
  initiatorName: 'Ayşe',
  receiverName: 'Mehmet',
  initiatorItems: [],
  receiverItems: [],
});

describe('tradeViewerRole', () => {
  it('taraf id sine göre rolü bulur, taraf değilse undefined', () => {
    expect(tradeViewerRole(trade('pending'), 'u-init')).toBe('initiator');
    expect(tradeViewerRole(trade('pending'), 'u-recv')).toBe('receiver');
    expect(tradeViewerRole(trade('pending'), 'baska')).toBeUndefined();
    expect(tradeViewerRole(trade('pending'), undefined)).toBeUndefined();
  });
});

describe('tradeStatusMetaFor', () => {
  it('initiator bakışı: initiator_shipped = siz, receiver_shipped = karşı taraf', () => {
    const m = tradeStatusMetaFor('initiator');
    expect(m.initiator_shipped!.labelKey).toBe('trade.statusYouShipped');
    expect(m.receiver_shipped!.labelKey).toBe('status.trade.receiver_shipped');
    expect(m.initiator_received!.labelKey).toBe('trade.statusYouReceived');
    expect(m.receiver_received!.labelKey).toBe('status.trade.receiver_received');
  });

  it('receiver bakışı: aynı durum ters okunur', () => {
    const m = tradeStatusMetaFor('receiver');
    expect(m.initiator_shipped!.labelKey).toBe('status.trade.receiver_shipped');
    expect(m.receiver_shipped!.labelKey).toBe('trade.statusYouShipped');
    expect(m.initiator_received!.labelKey).toBe('status.trade.receiver_received');
    expect(m.receiver_received!.labelKey).toBe('trade.statusYouReceived');
  });

  it('taraf bilinmiyorsa nötr taraf adlı etiket; diğer durumlar web ile aynı', () => {
    const m = tradeStatusMetaFor(undefined);
    expect(m.initiator_shipped!.labelKey).toBe('trade.statusInitiatorShipped');
    expect(m.receiver_shipped!.labelKey).toBe('trade.statusReceiverShipped');
    expect(m.completed).toEqual(tradeStatusMetaFor('initiator').completed);
  });
});

describe('TradeCard / useTradeStatusConfig rozeti', () => {
  it('receiver_shipped: alıcı kendi gönderisini "Siz Gönderdiniz" görür', () => {
    render(<TradeCard trade={trade('receiver_shipped')} currentUserId="u-recv" />);
    expect(screen.getByText('Siz Gönderdiniz')).toBeTruthy();
    expect(screen.queryByText('Karşı Taraf Gönderdi')).toBeNull();
  });

  it('receiver_shipped: başlatan "Karşı Taraf Gönderdi" görür', () => {
    render(<TradeCard trade={trade('receiver_shipped')} currentUserId="u-init" />);
    expect(screen.getByText('Karşı Taraf Gönderdi')).toBeTruthy();
    expect(screen.queryByText('Siz Gönderdiniz')).toBeNull();
  });

  it('initiator_shipped: başlatan "Siz Gönderdiniz", alıcı "Karşı Taraf Gönderdi" görür', () => {
    const { result: asInit } = renderHook(() => useTradeStatusConfig('initiator'));
    const { result: asRecv } = renderHook(() => useTradeStatusConfig('receiver'));
    expect(asInit.current.initiator_shipped!.label).toBe('Siz Gönderdiniz');
    expect(asRecv.current.initiator_shipped!.label).toBe('Karşı Taraf Gönderdi');
  });
});
