/**
 * Kayıtlı kartlar query hook'u — CardPaymentForm'daki elle yazılmış
 * useState + useEffect + listCards akışının yerine (CLAUDE.md §6).
 */
import React from 'react';
import { Text } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders, makeTestQueryClient } from '@/test-utils';
import { qk } from '@/lib/query';

jest.mock('@/lib/api', () => ({ membershipApi: { listCards: jest.fn() } }));
import { membershipApi } from '@/lib/api';
import { useSavedCards } from '../useSavedCards';
import type { PaymentPurpose } from '../capabilities';

const listCardsMock = membershipApi.listCards as jest.Mock;

function Probe({ purpose, enabled }: { purpose?: PaymentPurpose; enabled?: boolean }) {
  const q = useSavedCards({ purpose, enabled });
  return <Text testID="ids">{(q.data ?? []).map((c) => c.id).join(',') || (q.isLoading ? 'loading' : 'empty')}</Text>;
}

beforeEach(() => jest.clearAllMocks());

it('amaçla istenir, `qk.payments.savedCards(amaç)` anahtarında tutulur; başka mağazanın kartı elenir', async () => {
  listCardsMock.mockResolvedValue({
    data: [
      { id: 'c-shop', purpose: 'checkout' },
      { id: 'c-mem', purpose: 'membership' },
      { id: 'c-old' },
    ],
  });
  const queryClient = makeTestQueryClient();
  renderWithProviders(<Probe purpose="checkout" />, { queryClient });
  await waitFor(() => expect(screen.getByTestId('ids').props.children).toBe('c-shop,c-old'));
  expect(listCardsMock).toHaveBeenCalledWith('checkout');
  expect(queryClient.getQueryData(qk.payments.savedCards('checkout'))).toHaveLength(2);
});

it('amaçsız (Kayıtlı Kartlarım): parametresiz istek, iki mağaza birlikte', async () => {
  listCardsMock.mockResolvedValue({ data: { data: [{ id: 'a', purpose: 'checkout' }, { id: 'b', purpose: 'membership' }] } });
  renderWithProviders(<Probe />);
  await waitFor(() => expect(screen.getByTestId('ids').props.children).toBe('a,b'));
  expect(listCardsMock).toHaveBeenCalledWith();
});

it('kapalıyken (kart saklama yok / misafir) istek atılmaz', () => {
  renderWithProviders(<Probe purpose="checkout" enabled={false} />);
  expect(listCardsMock).not.toHaveBeenCalled();
  expect(screen.getByTestId('ids').props.children).toBe('empty');
});

it('her amacın anahtarı silme sonrası tazelenen prefix\'in altında', () => {
  for (const key of [qk.payments.savedCards('checkout'), qk.payments.savedCards('membership'), qk.payments.savedCards()]) {
    expect(key.slice(0, qk.payments.savedCardsAll.length)).toEqual([...qk.payments.savedCardsAll]);
  }
  expect(qk.payments.savedCards('checkout')).not.toEqual(qk.payments.savedCards('membership'));
});
