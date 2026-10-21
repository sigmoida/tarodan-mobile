/**
 * B4 inceleme 5 · Karşı teklif (nakitli ya da değil) yeni bir takas teklifi:
 * gönderilmeden önce yasal kimlik kapısından geçer. Gerçek
 * `ensureLegalIdentity` + istek store'u; "Vazgeç"te istek GİTMEZ.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY, settleGateAndWait } from '@/test-utils/legalIdentity';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'trade-1' }),
}));

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  tradesApi: { getOne: jest.fn(), counter: jest.fn(() => Promise.resolve({ data: {} })) },
  productsApi: { getAll: jest.fn(), getMyListings: jest.fn() },
}));

import { legalIdentityApi, productsApi, tradesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import TradeCounterScreen from '../[id]';

const counterMock = tradesApi.counter as jest.Mock;

const myProduct = { id: 'prod-mine', title: 'Benim Ürünüm', price: 200, isTradeEnabled: true, status: 'active', images: [] };
const theirProduct = { id: 'prod-theirs', title: 'Karşı Ürün', price: 300, isTradeEnabled: true, status: 'active', images: [] };

const gateOpened = () =>
  waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

/** Formu değiştir (ürün ya da yalnız nakit) ve "Karşı Teklif Gönder"e bas. */
async function changeAndSend(kind: 'product' | 'cash') {
  renderWithProviders(<TradeCounterScreen />);
  await waitFor(() => expect(screen.getByText('Benim Ürünüm')).toBeOnTheScreen());
  // API iki tarafta da en az 1 ürün ister (CounterTradeDto ArrayMinSize(1)): iki taraftan da seç.
  fireEvent.press(screen.getByText('Karşı Ürün'));
  if (kind === 'product') {
    fireEvent.press(screen.getByText('Benim Ürünüm'));
  } else {
    fireEvent.press(screen.getByText('Benim Ürünüm'));
    const cash = screen
      .UNSAFE_getAllByType(TextInput)
      .find((n: any) => n.props.keyboardType === 'numeric')!;
    fireEvent.changeText(cash, '50');
  }
  await act(async () => {
    fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
  (tradesApi.getOne as jest.Mock).mockResolvedValue({
    data: {
      data: {
        id: 'trade-1',
        status: 'pending',
        initiatorId: 'user-initiator',
        receiverId: 'user-other',
        cashAmount: 0,
        cashPayerId: null,
        initiatorItems: [],
        receiverItems: [],
      },
    },
  });
  // My side is `GET /products/my`; their side is the public list.
  (productsApi.getMyListings as jest.Mock).mockResolvedValue({ data: { data: [myProduct] } });
  (productsApi.getAll as jest.Mock).mockResolvedValue({ data: { data: [theirProduct] } });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'user-initiator' } as any });
});

afterEach(() => {
  act(() => settleLegalIdentityRequest(false));
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('Karşı teklif · yasal kimlik kapısı', () => {
  it('kimlik eksik → kapı açılır, teklif gitmez, düğme devre dışı; kaydedilince teklif gider', async () => {
    await changeAndSend('product');

    await gateOpened();
    expect(counterMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('trade-counter-submit')).toBeDisabled();

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(counterMock).toHaveBeenCalledTimes(1));
    expect(counterMock.mock.calls[0]![1].initiatorItems).toEqual([{ productId: 'prod-mine', quantity: 1 }]);
  });

  it.each(['product', 'cash'] as const)('Vazgeç → karşı teklif isteği gitmez (%s)', async (kind) => {
    await changeAndSend(kind);

    await gateOpened();
    await settleGateAndWait(false);
    expect(counterMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('trade-counter-submit')).not.toBeDisabled();
  });
});
