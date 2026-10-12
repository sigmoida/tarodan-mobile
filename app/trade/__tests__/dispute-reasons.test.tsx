/**
 * Takas itirazı nedenleri (Parite C-1.2).
 *
 * API `RaiseTradeDisputeDto` yalnız not_as_described | damaged | wrong_item |
 * not_received kabul eder; mobil eskiden shipment_lost (varsayılan) /
 * shipment_damaged / other gönderip 400 alıyordu.
 */
import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DEFAULT_DISPUTE_REASON,
  DISPUTE_REASONS,
  DISPUTE_REASON_LABEL_KEY,
} from '../[id]/_lib/disputeReasons';
import { DisputeTradeModal } from '../[id]/_modals/DisputeTradeModal';
import { useTradeActions } from '../[id]/_hooks/useTradeActions';
import { tradesApi } from '@/lib/api';
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'tr' }),
}));

jest.mock('@/lib/api', () => ({
  tradesApi: {
    raiseDispute: jest.fn().mockResolvedValue({ data: {} }),
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    confirmReceipt: jest.fn(),
  },
  paymentsApi: {},
}));

jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const API_ENUM = ['not_as_described', 'damaged', 'wrong_item', 'not_received'];

describe('takas itirazı nedenleri', () => {
  it('değerler API enum\'uyla birebir aynı ve varsayılan geçerli', () => {
    expect([...DISPUTE_REASONS]).toEqual(API_ENUM);
    expect(API_ENUM).toContain(DEFAULT_DISPUTE_REASON);
  });

  it('her neden için tr + en etiketi katalogda var', () => {
    const lookup = (cat: any, key: string) => key.split('.').reduce((o, k) => o?.[k], cat);
    for (const reason of DISPUTE_REASONS) {
      const key = DISPUTE_REASON_LABEL_KEY[reason];
      expect(typeof lookup(tr, key)).toBe('string');
      expect(typeof lookup(en, key)).toBe('string');
    }
  });

  it('modal yalnız geçerli nedenleri listeler', () => {
    render(
      <DisputeTradeModal
        visible
        onClose={() => {}}
        reason={DEFAULT_DISPUTE_REASON}
        setReason={() => {}}
        description=""
        setDescription={() => {}}
        onSubmit={() => {}}
        isPending={false}
        t={((k: string) => k) as any}
      />,
    );
    for (const reason of DISPUTE_REASONS) {
      expect(screen.getByText(DISPUTE_REASON_LABEL_KEY[reason])).toBeTruthy();
    }
    expect(screen.queryByText('trade.dispute.reasonOther')).toBeNull();
  });

  it('itiraz isteği varsayılan olarak geçerli bir neden gönderir', async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTradeActions('t1'), { wrapper });

    act(() => {
      result.current.dispute.setDescription('Kargo kutusu ezik geldi, ürün çalışmıyor.');
    });
    act(() => {
      result.current.dispute.submit();
    });

    await waitFor(() => expect(tradesApi.raiseDispute).toHaveBeenCalled());
    const [, body] = (tradesApi.raiseDispute as jest.Mock).mock.calls[0];
    expect(API_ENUM).toContain(body.reason);
    expect(body.reason).toBe('not_as_described');
  });
});
