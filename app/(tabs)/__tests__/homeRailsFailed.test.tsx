/**
 * A product rail that never loaded (first load failed) is hidden; the popular rail's "be the
 * first" empty state is shown only for a genuinely empty result.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useFavoriteToggle', () => ({ useProductCardFavorites: () => () => ({}) }));
jest.mock('@/components/product', () => ({ ProductCard: () => null }));

import { FeaturedRail, PopularRail } from '../_components/HomeRails';

const noop = () => undefined;

describe('home product rails: failed vs empty', () => {
  it('popular: empty result shows the empty state', () => {
    render(<PopularRail items={[]} isLoading={false} onProductPress={noop} />);
    expect(screen.getByTestId('home-popular')).toBeTruthy();
  });

  it('popular: failed first load renders nothing (no false empty state)', () => {
    render(<PopularRail items={[]} isLoading={false} failed onProductPress={noop} />);
    expect(screen.queryByTestId('home-popular')).toBeNull();
  });

  it('popular: failed flag does not hide a rail that has items', () => {
    render(<PopularRail items={[{ id: 'p1' } as never]} isLoading={false} failed onProductPress={noop} />);
    expect(screen.getByTestId('home-popular')).toBeTruthy();
  });

  it('featured: empty rail without an empty state is hidden (unchanged)', () => {
    render(<FeaturedRail items={[]} isLoading={false} onProductPress={noop} />);
    expect(screen.queryByTestId('home-featured')).toBeNull();
  });
});
