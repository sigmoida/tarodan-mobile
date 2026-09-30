/**
 * iOS'ta ücretli kademe satılmıyor (Apple 2.1(b)/3.1.3): ücretsiz kullanıcıya
 * değerlendirme penceresinde "Premium üyeler 2000 karakter yazabilir" denmez.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '../../test-utils';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn() } }));
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { limits: { maxReviewChars: 500 } };
    return sel ? sel(state) : state;
  },
}));

import RatingModal from '../RatingModal';

it('iOS: Premium karakter notu gösterilmez', () => {
  renderWithProviders(
    <RatingModal visible onDismiss={jest.fn()} onSuccess={jest.fn()} type="product" orderId="o1" productId="p1" productTitle="X" />,
  );
  expect(screen.queryByText(i18n.t('ratingModal.premiumCharLimitNote'))).toBeNull();
});
