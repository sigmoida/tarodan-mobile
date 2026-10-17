import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { FavoritesSkeleton } from '../_components/FavoriteCardSkeleton';

describe('FavoritesSkeleton', () => {
  it('FavoritesSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<FavoritesSkeleton />);
    expect(screen.getByTestId('favorites-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
