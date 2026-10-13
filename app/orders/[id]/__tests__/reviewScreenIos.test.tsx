/**
 * iOS'ta ücretli kademe satılmıyor (Apple 2.1(b)/3.1.3): ücretsiz kullanıcıya
 * değerlendirme ekranında "Premium üyeler 2000 karakter yazabilir" denmez.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'o1', type: 'product' }),
}));
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() =>
      Promise.resolve({ data: { data: { id: 'o1', product: { id: 'p1', title: 'X' }, seller: { id: 's1' } } } }),
    ),
  },
  ratingsApi: { createProductRating: jest.fn(), createUserRating: jest.fn() },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { limits: { maxReviewChars: 500 } };
    return sel ? sel(state) : state;
  },
}));

import OrderReviewScreen from '../review';

it('iOS: Premium karakter notu gösterilmez', async () => {
  renderWithProviders(<OrderReviewScreen />);
  expect(await screen.findByText('0/500')).toBeOnTheScreen();
  expect(screen.queryByText(i18n.t('ratingModal.premiumCharLimitNote'))).toBeNull();
});
