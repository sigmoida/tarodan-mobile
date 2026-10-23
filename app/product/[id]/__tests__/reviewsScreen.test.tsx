/**
 * Product reviews screen: a failed first page shows ErrorState with a retry instead of the
 * "no reviews yet" empty state (src/ui/CLAUDE.md › Empty and error states).
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('@/test-utils/router-mock')>('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'p1' }),
}));

jest.mock('@/lib/api', () => ({
  ratingsApi: {
    getProductStats: jest.fn().mockResolvedValue({ data: null }),
    getProductRatings: jest.fn(),
  },
}));

import { ratingsApi } from '@/lib/api';
import ProductReviewsScreen from '../reviews';

const getProductRatings = ratingsApi.getProductRatings as jest.Mock;

beforeEach(() => {
  getProductRatings.mockReset().mockResolvedValue({ data: { ratings: [], total: 0 } });
});

describe('product reviews screen', () => {
  it('shows the empty state when the product has no reviews', async () => {
    renderWithProviders(<ProductReviewsScreen />);
    expect(await screen.findByText('Henüz değerlendirme yok')).toBeOnTheScreen();
  });

  it('a failed load shows the error state with a retry, not "no reviews" or a zero count', async () => {
    (ratingsApi.getProductStats as jest.Mock).mockResolvedValueOnce({ data: { averageScore: 4.5 } });
    getProductRatings.mockRejectedValueOnce(new Error('network'));
    renderWithProviders(<ProductReviewsScreen />);
    expect(await screen.findByText('Bir şeyler ters gitti')).toBeOnTheScreen();
    expect(screen.queryByText('Henüz değerlendirme yok')).toBeNull();
    // The rating summary would read "0 reviews" above the error.
    expect(screen.queryByText('4.5')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Henüz değerlendirme yok')).toBeOnTheScreen();
  });
});
