/**
 * Takas itirazı nedenleri (Parite C-1.2).
 *
 * API `RaiseTradeDisputeDto` yalnız not_as_described | damaged | wrong_item |
 * not_received kabul eder; mobil eskiden shipment_lost (varsayılan) /
 * shipment_damaged / other gönderip 400 alıyordu. Form artık ayrı ekran
 * (`trade/[id]/dispute`).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';
import {
  DEFAULT_DISPUTE_REASON,
  DISPUTE_REASONS,
  DISPUTE_REASON_LABEL_KEY,
} from '../[id]/_lib/disputeReasons';
import { tradesApi } from '@/lib/api';
import { useDisputeDraftStore } from '@/stores/disputeDraftStore';
import TradeDisputeScreen from '../[id]/dispute';
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'tr' }),
}));
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 't1' }),
}));
jest.mock('@/lib/api', () => ({
  tradesApi: { raiseDispute: jest.fn().mockResolvedValue({ data: {} }) },
}));

const API_ENUM = ['not_as_described', 'damaged', 'wrong_item', 'not_received'];
const raiseMock = tradesApi.raiseDispute as jest.Mock;
const VALID = 'Kargo takipte hareket yok, ürün gelmedi.';

beforeEach(() => {
  raiseMock.mockClear();
  resetRouterMocks();
  useDisputeDraftStore.getState().clearAll();
});

const submit = () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('trade-dispute-submit-button'));
  });

describe('takas itirazı nedenleri', () => {
  it("değerler API enum'uyla birebir aynı ve varsayılan geçerli", () => {
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

  it('ekran yalnız geçerli nedenleri listeler', () => {
    renderWithProviders(<TradeDisputeScreen />);
    for (const reason of DISPUTE_REASONS) {
      expect(screen.getByText(DISPUTE_REASON_LABEL_KEY[reason])).toBeTruthy();
    }
    expect(screen.queryByText('trade.dispute.reasonOther')).toBeNull();
  });

  it('itiraz isteği varsayılan olarak geçerli bir neden gönderir', async () => {
    renderWithProviders(<TradeDisputeScreen />);
    fireEvent.changeText(screen.getByTestId('trade-dispute-description-input'), VALID);
    await submit();

    await waitFor(() => expect(raiseMock).toHaveBeenCalled());
    const [, body] = raiseMock.mock.calls[0];
    expect(API_ENUM).toContain(body.reason);
    expect(body.reason).toBe('not_as_described');
  });

  it('seçilen neden gönderilir', async () => {
    renderWithProviders(<TradeDisputeScreen />);
    fireEvent.press(screen.getByText(DISPUTE_REASON_LABEL_KEY.not_received));
    fireEvent.changeText(screen.getByTestId('trade-dispute-description-input'), VALID);
    await submit();
    await waitFor(() => expect(raiseMock).toHaveBeenCalledWith('t1', { reason: 'not_received', description: VALID }));
  });

  it('ekran yeniden açılınca neden varsayılana döner (açıklama taslaktan gelir)', async () => {
    const first = renderWithProviders(<TradeDisputeScreen />);
    fireEvent.press(screen.getByText(DISPUTE_REASON_LABEL_KEY.damaged));
    fireEvent.changeText(screen.getByTestId('trade-dispute-description-input'), 'taslak');
    first.unmount();

    renderWithProviders(<TradeDisputeScreen />);
    expect(screen.getByRole('radio', { checked: true })).toHaveTextContent(
      DISPUTE_REASON_LABEL_KEY[DEFAULT_DISPUTE_REASON],
    );
    expect(screen.getByTestId('trade-dispute-description-input').props.value).toBe('taslak');
  });
});
