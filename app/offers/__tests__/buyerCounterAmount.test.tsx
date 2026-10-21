/**
 * The buyer's lower counter offer (`BuyerCounterModal`): the amount text is read by the shared
 * TL amount parser like web, so "1.000" (one thousand to a Turkish buyer) is refused in the
 * modal and never sent as 1 TL, and the parsed amount goes to the API exactly, cents included.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  offersApi: { buyerCounter: jest.fn() },
  // No admin price limits: the floor is not what this file pins.
  publicSettingsApi: { getPublicSettings: jest.fn(() => Promise.resolve({ data: {} })) },
}));
import { offersApi } from '@/lib/api';

import { BuyerCounterModal } from '../_modals/BuyerCounterModal';
import type { Offer } from '../_lib/types';

const buyerCounter = offersApi.buyerCounter as jest.Mock;

// The seller countered at 2000 TL; the buyer answers lower.
const offer = {
  id: 'offer-1',
  productId: 'p1',
  amount: 2000,
  status: 'countered',
  createdAt: new Date().toISOString(),
  buyer: { id: 'buyer-1', displayName: 'Ayşe' },
  seller: { id: 'seller-1', displayName: 'Mehmet' },
  product: { id: 'p1', title: 'Deri Ceket', price: 2500 },
} as unknown as Offer;

const submitWith = (text: string) => {
  const onClose = jest.fn();
  renderWithProviders(<BuyerCounterModal offer={offer} onClose={onClose} />);
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('offer.newAmountPlaceholderTl')), text);
  fireEvent.press(screen.getByText(i18n.t('common.submit')));
  return onClose;
};

beforeEach(() => {
  buyerCounter.mockReset();
  buyerCounter.mockResolvedValue({});
});

describe('buyer counter: amount text (shared TL amount parser, web parity)', () => {
  it('"1.000" is Turkish grouping: refused in the modal, no request, never 1 TL', async () => {
    const onClose = submitWith('1.000');

    await waitFor(() => expect(screen.getByText(i18n.t('validation.amountFormatRefused'))).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    expect(buyerCounter).not.toHaveBeenCalled();
  });

  it.each([
    ['1000', 1000],
    ['1250,50', 1250.5],
    ['1999,99', 1999.99],
  ])('%p is sent exactly as %p', async (text, amount) => {
    const onClose = submitWith(text);

    await waitFor(() => expect(buyerCounter).toHaveBeenCalledWith('offer-1', amount));
    expect(onClose).toHaveBeenCalled();
  });

  it('the seller amount itself is not lower: refused by the bound, no request', async () => {
    submitWith('2000,00');

    await waitFor(() =>
      expect(screen.getByText(i18n.t('offer.buyerCounterMustBeLower', { amount: '2.000,00 TL' }))).toBeTruthy(),
    );
    expect(buyerCounter).not.toHaveBeenCalled();
  });
});
